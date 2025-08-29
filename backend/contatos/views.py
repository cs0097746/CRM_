# contatos/views.py

from rest_framework import status, generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Contato, Interacao, Estagio, Negocio, Conversa, RespostasRapidas, Estagio
from .serializers import EstagioSerializer, NegocioSerializer, ConversaListSerializer, ConversaDetailSerializer, \
    InteracaoSerializer, RespostasRapidasSerializer # Adicione os novos serializers
from django.db.models import Count

from django.db.models import Count, Sum, Avg, F, Subquery, OuterRef
from django.utils import timezone
from datetime import timedelta

class EvolutionWebhookView(APIView):
    """
    Esta view recebe webhooks da Evolution API, processa as mensagens
    e cria/atualiza contatos, conversas e interações no CRM.
    """

    def post(self, request, *args, **kwargs):
        webhook_data = request.data
        data = webhook_data.get('data', {})
        key = data.get('key', {})
        message_data = data.get('message', {})

        if key.get('fromMe') is True:
            return Response({"message": "Mensagem própria ignorada"}, status=status.HTTP_200_OK)

        numero_cliente_sujo = key.get('remoteJid')
        nome_cliente = data.get('pushName')
        mensagem_recebida = message_data.get('conversation')

        if not numero_cliente_sujo or not mensagem_recebida:
            return Response(
                {"error": "Payload inválido: remoteJid ou conversation faltando"},
                status=status.HTTP_400_BAD_REQUEST
            )

        numero_limpo = numero_cliente_sujo.split('@')[0]

        # 1. Busca ou cria o Contato
        contato, _ = Contato.objects.get_or_create(
            telefone=numero_limpo,
            defaults={'nome': nome_cliente}
        )

        # --- LÓGICA MELHORADA ABAIXO ---

        # 2. Tenta encontrar uma conversa aberta para este contato
        conversa = Conversa.objects.filter(
            contato=contato,
            status__in=['entrada', 'atendimento']
        ).order_by('-criado_em').first()  # Pega a mais recente, se houver mais de uma

        # 3. Se não encontrar uma conversa aberta, cria uma nova
        if not conversa:
            conversa = Conversa.objects.create(
                contato=contato,
                status='entrada'
            )

        # 4. Cria a Interacao (mensagem) DENTRO da Conversa encontrada ou criada
        Interacao.objects.create(
            conversa=conversa,
            mensagem=mensagem_recebida,
            remetente='cliente'
        )

        # Bônus: Atualiza o timestamp da conversa para que ela apareça no topo da lista
        conversa.save()

        print(f"Webhook processado com sucesso para: {nome_cliente} ({numero_limpo})")
        return Response({"status": "Mensagem processada com sucesso"}, status=status.HTTP_201_CREATED)


class EstagioListView(generics.ListAPIView):
    queryset = Estagio.objects.all().order_by('ordem')
    serializer_class = EstagioSerializer
    # permission_classes = [IsAuthenticated]


# View para LISTAR todos os negócios e CRIAR um novo
class NegocioListCreateView(generics.ListCreateAPIView):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer


# View para LISTAR todas as conversas (usada nas filas)
class ConversaListView(generics.ListAPIView):
    queryset = Conversa.objects.all().order_by('-atualizado_em')  # Mais recentes primeiro
    serializer_class = ConversaListSerializer
    permission_classes = [IsAuthenticated]
    # No futuro, vamos adicionar filtros aqui (ex: ?status=entrada)


# Esta alteração permite que a view aceite pedidos PATCH
class ConversaDetailView(generics.RetrieveUpdateAPIView):
    queryset = Conversa.objects.all()
    serializer_class = ConversaDetailSerializer
    permission_classes = [IsAuthenticated]


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
    search_fields = ['atalho', 'texto']  # Campos onde a busca vai procurar

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
            primeira_mensagem_cliente = conversa.interacoes.filter(remetente='cliente').order_by(
                'criado_em').first()  # type: ignore

            # Pega a primeira resposta de um operador NAQUELA conversa
            primeira_resposta_operador = conversa.interacoes.filter(remetente='operador').order_by(
                'criado_em').first()  # type: ignore

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

class DashboardStatsView(APIView):
    """
    Fornece dados estatísticos REAIS para o dashboard principal,
    calculados a partir do banco de dados.
    """
    # permission_classes = [IsAuthenticated] # Descomente quando a autenticação estiver pronta

    def get(self, request, format=None):
        # --- MÉTRICAS DE ATENDIMENTO ---

        # 1. Total de mensagens recebidas de clientes
        mensagens_recebidas_count = Interacao.objects.filter(remetente='cliente').count()

        # 2. Conversas em aberto (status 'entrada' ou 'em atendimento')
        conversas_atuais_count = Conversa.objects.filter(status__in=['entrada', 'atendimento']).count()

        # 3. Chats que precisam de resposta (última mensagem é do cliente)
        # Encontra a última mensagem de cada conversa
        ultima_interacao = Interacao.objects.filter(conversa=OuterRef('pk')).order_by('-criado_em')
        # Anota o remetente da última mensagem em cada conversa
        conversas_com_ultimo_remetente = Conversa.objects.annotate(
            ultimo_remetente=Subquery(ultima_interacao.values('remetente')[:1])
        )
        # Filtra as conversas em aberto cujo último remetente foi o cliente
        chats_sem_respostas_count = conversas_com_ultimo_remetente.filter(
            status__in=['entrada', 'atendimento'],
            ultimo_remetente='cliente'
        ).count()
        
        # 4. Maior tempo de espera (conversa no status 'entrada' há mais tempo)
        conversa_mais_antiga = Conversa.objects.filter(status='entrada').order_by('criado_em').first()
        tempo_espera_max_horas = 0
        if conversa_mais_antiga:
            diferenca = timezone.now() - conversa_mais_antiga.criado_em
            tempo_espera_max_horas = round(diferenca.total_seconds() / 3600, 1)

        # --- MÉTRICAS DE VENDAS (NEGÓCIOS) ---
        # IMPORTANTE: Estes cálculos assumem que você tem estágios chamados 'Ganhos' e 'Perdidos'.
        # Ajuste os nomes se forem diferentes no seu banco de dados.
        
        # 5. Leads Ganhos
        ganhos_agregado = Negocio.objects.filter(estagio__nome__iexact='Ganhos').aggregate(
            total=Count('id'),
            valor=Sum('valor')
        )
        leads_ganhos_stats = {
            'total': ganhos_agregado['total'] or 0,
            'valor': ganhos_agregado['valor'] or 0
        }

        # 6. Leads Perdidos
        perdidos_agregado = Negocio.objects.filter(estagio__nome__iexact='Perdidos').aggregate(
            total=Count('id'),
            valor=Sum('valor')
        )
        leads_perdidos_stats = {
            'total': perdidos_agregado['total'] or 0,
            'valor': perdidos_agregado['valor'] or 0
        }

        # 7. Leads Ativos (todos que não estão em 'Ganhos' ou 'Perdidos')
        leads_ativos_count = Negocio.objects.exclude(estagio__nome__iexact='Ganhos').exclude(estagio__nome__iexact='Perdidos').count()


        # --- MONTAGEM FINAL DOS DADOS ---
        data = {
            'mensagens_recebidas': mensagens_recebidas_count,
            'conversas_atuais': conversas_atuais_count,
            'chats_sem_respostas': chats_sem_respostas_count,
            'tempo_resposta_medio_min': 0, # TODO: Implementar lógica de tempo de resposta
            'tempo_espera_max_horas': tempo_espera_max_horas,
            'leads_ganhos': leads_ganhos_stats,
            'leads_ativos': {
                'total': leads_ativos_count
            },
            'tarefas_pendentes': 0, # TODO: Implementar lógica de tarefas
            'leads_perdidos': leads_perdidos_stats,
            'fontes_lead': [ # TODO: Implementar lógica de fontes de lead
                {'nome': 'Comercial Gráfica', 'valor': 40},
                {'nome': 'Comercial Digital', 'valor': 35},
                {'nome': 'Analista de Suporte', 'valor': 25},
            ]
        }
        return Response(data)

