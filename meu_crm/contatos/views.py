# contatos/views.py

from rest_framework import status, generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Contato, Interacao, Estagio, Negocio, Conversa, RespostasRapidas, Estagio
from .serializers import NegocioSerializer, ConversaListSerializer, ConversaDetailSerializer, InteracaoSerializer, RespostasRapidasSerializer # Adicione os novos serializers
from django.db.models import Count


class EvolutionWebhookView(APIView):
    """
    Esta view recebe webhooks da Evolution API, processa as mensagens
    e cria/atualiza contatos e interações no CRM.
    """
    def post(self, request, *args, **kwargs):
        # Extrai os dados principais do payload do webhook
        webhook_data = request.data
        data = webhook_data.get('data', {})
        key = data.get('key', {})
        message_data = data.get('message', {})

        # Ignora mensagens enviadas por nós mesmos (fromMe: true)
        if key.get('fromMe') is True:
            return Response({"message": "Mensagem própria ignorada"}, status=status.HTTP_200_OK)

        # Pega as informações importantes do JSON
        numero_cliente_sujo = key.get('remoteJid')
        nome_cliente = data.get('pushName')
        mensagem_recebida = message_data.get('conversation')

        # Validação: garante que os dados mínimos para operar existem
        if not numero_cliente_sujo or not mensagem_recebida:
            return Response(
                {"error": "Payload inválido: remoteJid ou conversation faltando"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limpa o número de telefone para um formato padrão (só números)
        numero_limpo = numero_cliente_sujo.split('@')[0]

        # Lógica principal: Busca ou cria o contato
        # Usamos 'defaults' para passar os dados que só devem ser usados se um NOVO contato for criado.
        contato, foi_criado = Contato.objects.get_or_create(
            telefone=numero_limpo,
            defaults={
                'nome': nome_cliente,
                'email': f'{numero_limpo}@temp.crm' # Criamos um email temporário
            }
        )

        # Bônus: Se o contato já existia mas estava sem nome, atualizamos o nome.
        if not foi_criado and not contato.nome and nome_cliente:
            contato.nome = nome_cliente
            contato.save()

        # Salva a mensagem recebida como uma nova interação
        Interacao.objects.create(
            contato=contato,
            mensagem=mensagem_recebida,
            remetente='cliente'
        )

        print(f"Webhook processado com sucesso para: {nome_cliente} ({numero_limpo})")

        # Retorna uma resposta de sucesso
        return Response({"status": "Mensagem processada com sucesso"}, status=status.HTTP_201_CREATED)
    

# View para LISTAR todos os negócios e CRIAR um novo
class NegocioListCreateView(generics.ListCreateAPIView):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer

# View para LISTAR todas as conversas (usada nas filas)
class ConversaListView(generics.ListAPIView):
    queryset = Conversa.objects.all().order_by('-atualizado_em') # Mais recentes primeiro
    serializer_class = ConversaListSerializer
    # No futuro, vamos adicionar filtros aqui (ex: ?status=entrada)

# View para ver os DETALHES de uma conversa (com todas as mensagens)
class ConversaDetailView(generics.RetrieveAPIView):
    queryset = Conversa.objects.all()
    serializer_class = ConversaDetailSerializer

# View para um operador CRIAR uma nova mensagem em uma conversa
class InteracaoCreateView(generics.CreateAPIView):
    serializer_class = InteracaoSerializer

    def perform_create(self, serializer):
        # Pega a conversa da URL (ex: /api/conversas/123/mensagens/)
        conversa = Conversa.objects.get(pk=self.kwargs['conversa_pk'])
        # Salva a mensagem, associando à conversa e marcando o remetente como 'operador'
        serializer.save(conversa=conversa, remetente='operador')

class RespostasRapidasListView(generics.ListCreateAPIView):
    serializer_class = RespostasRapidasSerializer
    # Adicionando o sistema de busca
    filter_backends = [filters.SearchFilter]
    search_fields = ['atalho', 'texto'] # Campos onde a busca vai procurar

    def get_queryset(self):
        # Filtra para retornar apenas as respostas rápidas do usuário logado (operador)
        # Esta é uma implementação simples, no futuro faremos a autenticação do operador
        # Por enquanto, vamos retornar todas para teste
        return RespostasRapidas.objects.all()
    
class FunilStatsView(APIView):
    """
    Retorna estatísticas sobre o funil de vendas,
    contando quantos negócios existem em cada estágio.
    """
    def get(self, request, *args, **kwargs):
        # Usamos o ORM do Django para fazer a mágica:
        # 1. Pega todos os Estagios
        # 2. "Anota" (annotate) em cada um a contagem de negócios associados
        # 3. Organiza os valores que queremos retornar
        dados_funil = Estagio.objects.annotate(
            total_negocios=Count('negocios')
        ).values(
            'nome', 
            'total_negocios'
        ).order_by('ordem')

        return Response(dados_funil)
    

class TempoRespostaStatsView(APIView):
    """
    Calcula o tempo médio da primeira resposta do operador em todas as conversas.
    """
    def get(self, request, *args, **kwargs):
        tempos_de_resposta = []
        
        conversas = Conversa.objects.filter(status__in=['atendimento', 'resolvida'])

        for conversa in conversas:
            # Pega a primeira mensagem da conversa que NÃO foi enviada por um operador
            primeira_mensagem_cliente = conversa.interacoes.filter(remetente='cliente').order_by('criado_em').first() # type: ignore
            
            # Pega a primeira resposta de um operador NAQUELA conversa
            primeira_resposta_operador = conversa.interacoes.filter(remetente='operador').order_by('criado_em').first() # type: ignore

            # Se ambas existirem, calcula a diferença de tempo
            if primeira_mensagem_cliente and primeira_resposta_operador:
                if primeira_resposta_operador.criado_em > primeira_mensagem_cliente.criado_em:
                    diferenca = primeira_resposta_operador.criado_em - primeira_mensagem_cliente.criado_em
                    tempos_de_resposta.append(diferenca.total_seconds())

        if tempos_de_resposta:
            tempo_medio = sum(tempos_de_resposta) / len(tempos_de_resposta)
        else:
            tempo_medio = 0

        dados = {
            "tempo_medio_primeira_resposta_segundos": round(tempo_medio, 2),
            "conversas_analisadas": len(tempos_de_resposta)
        }

        return Response(dados)

class NegocioDetailView(generics.RetrieveUpdateAPIView):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer

    # --- MÉTODO DE ATUALIZAÇÃO CUSTOMIZADO ---
    def update(self, request, *args, **kwargs):
        # Pega o objeto Negocio que está sendo atualizado (ex: Negocio de ID 2)
        instance = self.get_object()
        
        # Pega os dados enviados na requisição PATCH (ex: {"estagio_id": 2})
        data = request.data.copy()

        # Atualiza o campo 'estagio' na instância do Negocio
        # com base no 'estagio_id' que recebemos.
        instance.estagio_id = data.get('estagio_id', instance.estagio_id)
        
        # Salva a instância atualizada no banco de dados
        instance.save()

        # Cria um serializer com a instância já atualizada para retornar a resposta
        serializer = self.get_serializer(instance)
        
        # Retorna a resposta de sucesso com os dados atualizados
        return Response(serializer.data)
