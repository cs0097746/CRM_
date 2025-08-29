from rest_framework import status, generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Contato, Interacao, Estagio, Negocio, Conversa, RespostasRapidas
from .serializers import EstagioSerializer, NegocioSerializer, ConversaListSerializer, ConversaDetailSerializer, \
    InteracaoSerializer, RespostasRapidasSerializer
from django.db.models import Count


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

        contato, _ = Contato.objects.get_or_create(
            telefone=numero_limpo,
            defaults={'nome': nome_cliente}
        )

        conversa = Conversa.objects.filter(
            contato=contato,
            status__in=['entrada', 'atendimento']
        ).order_by('-criado_em').first()

        if not conversa:
            conversa = Conversa.objects.create(
                contato=contato,
                status='entrada'
            )

        Interacao.objects.create(
            conversa=conversa,
            mensagem=mensagem_recebida,
            remetente='cliente'
        )

        conversa.save()

        print(f"Webhook processado com sucesso para: {nome_cliente} ({numero_limpo})")
        return Response({"status": "Mensagem processada com sucesso"}, status=status.HTTP_201_CREATED)


class EstagioListView(generics.ListAPIView):
    queryset = Estagio.objects.all().order_by('ordem')
    serializer_class = EstagioSerializer

class NegocioListCreateView(generics.ListCreateAPIView):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer

class ConversaListView(generics.ListAPIView):
    queryset = Conversa.objects.all().order_by('-atualizado_em')
    serializer_class = ConversaListSerializer
    permission_classes = [IsAuthenticated]

class ConversaDetailView(generics.RetrieveUpdateAPIView):
    queryset = Conversa.objects.all()
    serializer_class = ConversaDetailSerializer
    permission_classes = [IsAuthenticated]

class InteracaoCreateView(generics.CreateAPIView):
    serializer_class = InteracaoSerializer

    def perform_create(self, serializer):
        conversa = Conversa.objects.get(pk=self.kwargs['conversa_pk'])
        serializer.save(conversa=conversa, remetente='operador')

class RespostasRapidasListView(generics.ListCreateAPIView):
    serializer_class = RespostasRapidasSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['atalho', 'texto']

    def get_queryset(self):
        return RespostasRapidas.objects.all()

class FunilStatsView(APIView):
    def get(self, request, *args, **kwargs):
        dados_funil = Estagio.objects.annotate(
            total_negocios=Count('negocios')
        ).values(
            'nome',
            'total_negocios'
        ).order_by('ordem')
        return Response(dados_funil)


class TempoRespostaStatsView(APIView):
    def get(self, request, *args, **kwargs):
        tempos_de_resposta = []
        conversas = Conversa.objects.filter(status__in=['atendimento', 'resolvida'])

        for conversa in conversas:
            # Com o related_name='interacoes' no models.py, esta linha agora é válida
            primeira_mensagem_cliente = conversa.interacoes.filter(remetente='cliente').order_by('criado_em').first()
            
            # E esta também
            primeira_resposta_operador = conversa.interacoes.filter(remetente='operador').order_by('criado_em').first()

            if primeira_mensagem_cliente and primeira_resposta_operador:
                if primeira_resposta_operador.criado_em > primeira_mensagem_cliente.criado_em:
                    diferenca = primeira_resposta_operador.criado_em - primeira_mensagem_cliente.criado_em
                    tempos_de_resposta.append(diferenca.total_seconds())

        tempo_medio = sum(tempos_de_resposta) / len(tempos_de_resposta) if tempos_de_resposta else 0

        dados = {
            "tempo_medio_primeira_resposta_segundos": round(tempo_medio, 2),
            "conversas_analisadas": len(tempos_de_resposta)
        }
        return Response(dados)


class NegocioDetailView(generics.RetrieveUpdateAPIView):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()
        instance.estagio_id = data.get('estagio_id', instance.estagio_id)
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class DashboardStatsView(APIView):
    def get(self, request, format=None):
        data = {
            'mensagens_recebidas': 1452,
            'conversas_atuais': 20,
            'chats_sem_respostas': 12,
            'tempo_resposta_medio_min': 2,
            'tempo_espera_max_horas': 5,
            'leads_ganhos': {'total': 550, 'valor': 521307.00},
            'leads_ativos': {'total': 16198},
            'tarefas_pendentes': 0,
            'leads_perdidos': {'total': 897, 'valor': 115631.00},
            'fontes_lead': [
                {'nome': 'Comercial Gráfica', 'valor': 40},
                {'nome': 'Comercial Digital', 'valor': 35},
                {'nome': 'Analista de Suporte', 'valor': 25},
            ]
        }
        return Response(data)

