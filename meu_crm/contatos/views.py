# contatos/views.py

from rest_framework import status, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Contato, Interacao, Estagio, Negocio, Conversa
from .serializers import NegocioSerializer, ConversaListSerializer, ConversaDetailSerializer, InteracaoSerializer # Adicione os novos serializers

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

# View para VER, ATUALIZAR ou DELETAR um negócio específico
class NegocioDetailView(generics.RetrieveUpdateAPIView):
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