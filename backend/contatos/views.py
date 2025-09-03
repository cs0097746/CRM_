from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db import models
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes

from .models import (
    Contato, Conversa, Interacao, Operador, Estagio, Negocio,
    RespostasRapidas, NotaAtendimento, TarefaAtendimento, AnexoNota
)
from .serializers import (
    ContatoSerializer, OperadorSerializer,
    ConversaListSerializer, ConversaDetailSerializer, InteracaoSerializer,
    EstagioSerializer, NegocioSerializer, RespostasRapidasSerializer,
    NotaAtendimentoSerializer, TarefaAtendimentoSerializer, 
    TarefaCreateSerializer, AnexoNotaSerializer
)

# ===== FUNÇÃO AUXILIAR =====
def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None

# ===== VIEWS ORIGINAIS (HTML) =====

def lista_contatos(request):
    """Lista contatos com paginação e busca"""
    contatos = Contato.objects.all().order_by('nome')
    
    search = request.GET.get('search')
    if search:
        contatos = contatos.filter(
            Q(nome__icontains=search) |
            Q(email__icontains=search) |
            Q(telefone__icontains=search)
        )
    
    paginator = Paginator(contatos, 10)
    page = request.GET.get('page')
    contatos_page = paginator.get_page(page)
    
    return render(request, 'contatos/lista.html', {
        'contatos': contatos_page,
        'search': search
    })

def detalhe_contato(request, contato_id):
    """Detalhe do contato com conversas relacionadas"""
    contato = get_object_or_404(Contato, id=contato_id)
    conversas = Conversa.objects.filter(contato=contato).order_by('-criado_em')
    
    return render(request, 'contatos/detalhe.html', {
        'contato': contato,
        'conversas': conversas
    })

def lista_conversas(request):
    """Lista conversas com filtros"""
    conversas = Conversa.objects.select_related('contato', 'operador').order_by('-criado_em')
    
    status_filter = request.GET.get('status')
    if status_filter:
        conversas = conversas.filter(status=status_filter)
    
    paginator = Paginator(conversas, 15)
    page = request.GET.get('page')
    conversas_page = paginator.get_page(page)
    
    return render(request, 'contatos/conversas.html', {
        'conversas': conversas_page,
        'status_filter': status_filter
    })

def detalhe_conversa(request, conversa_id):
    """Detalhe da conversa com interações"""
    conversa = get_object_or_404(Conversa, id=conversa_id)
    interacoes = Interacao.objects.filter(conversa=conversa).order_by('criado_em')
    
    return render(request, 'contatos/conversa_detalhe.html', {
        'conversa': conversa,
        'interacoes': interacoes
    })

def dashboard(request):
    """Dashboard principal com estatísticas"""
    hoje = timezone.now().date()
    
    total_contatos = Contato.objects.count()
    conversas_ativas = Conversa.objects.filter(status__in=['entrada', 'atendimento']).count()
    conversas_hoje = Conversa.objects.filter(criado_em__date=hoje).count()
    
    conversas_stats = Conversa.objects.values('status').annotate(total=Count('id'))
    ultimas_conversas = Conversa.objects.select_related('contato', 'operador').order_by('-criado_em')[:5]
    tarefas_pendentes = TarefaAtendimento.objects.filter(status__in=['pendente', 'em_andamento']).count()
    
    context = {
        'total_contatos': total_contatos,
        'conversas_ativas': conversas_ativas,
        'conversas_hoje': conversas_hoje,
        'conversas_stats': conversas_stats,
        'ultimas_conversas': ultimas_conversas,
        'tarefas_pendentes': tarefas_pendentes,
    }
    
    return render(request, 'contatos/dashboard.html', context)

# ===== VIEWS DE API =====

class ContatoListCreateView(generics.ListCreateAPIView):
    """API: Listar e criar contatos"""
    queryset = Contato.objects.all()
    serializer_class = ContatoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'email', 'telefone']
    ordering_fields = ['nome', 'criado_em']
    ordering = ['nome']

class ContatoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalhar, atualizar e deletar contato"""
    queryset = Contato.objects.all()
    serializer_class = ContatoSerializer
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_operadores_list(request):
    """API: Lista operadores"""
    operadores = Operador.objects.select_related('user')
    serializer = OperadorSerializer(operadores, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """API: Estatísticas do dashboard"""
    hoje = timezone.now().date()
    
    stats = {
        'contatos': {
            'total': Contato.objects.count(),
            'novos_hoje': Contato.objects.filter(criado_em__date=hoje).count(),
        },
        'conversas': {
            'total': Conversa.objects.count(),
            'ativas': Conversa.objects.filter(status__in=['entrada', 'atendimento']).count(),
            'hoje': Conversa.objects.filter(criado_em__date=hoje).count(),
            'por_status': dict(Conversa.objects.values_list('status').annotate(Count('id'))),
        },
        'interacoes': {
            'hoje': Interacao.objects.filter(criado_em__date=hoje).count(),
        },
        'tarefas': {
            'pendentes': TarefaAtendimento.objects.filter(status='pendente').count(),
            'vencidas': TarefaAtendimento.objects.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            ).count(),
        }
    }
    
    return Response(stats)

# ===== CONVERSAS E INTERAÇÕES =====

class ConversaListView(generics.ListAPIView):
    """API: Lista conversas"""
    queryset = Conversa.objects.all().select_related('contato', 'operador').prefetch_related('interacoes')
    serializer_class = ConversaListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['contato__nome', 'contato__telefone']
    ordering = ['-atualizado_em']

class ConversaDetailView(generics.RetrieveUpdateAPIView):
    """API: Detalha e atualiza conversa"""
    queryset = Conversa.objects.all()
    serializer_class = ConversaDetailSerializer
    permission_classes = [IsAuthenticated]

class InteracaoCreateView(generics.CreateAPIView):
    """API: Cria interação/mensagem"""
    queryset = Interacao.objects.all()
    serializer_class = InteracaoSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        conversa_id = self.kwargs.get('conversa_pk')
        conversa = get_object_or_404(Conversa, id=conversa_id)
        
        operador = get_user_operador(self.request.user)
        serializer.save(
            conversa=conversa,
            remetente='operador',
            operador=operador
        )

# ===== CRM/KANBAN =====

class EstagioListView(generics.ListAPIView):
    """API: Lista estágios"""
    queryset = Estagio.objects.all()
    serializer_class = EstagioSerializer
    permission_classes = [IsAuthenticated]

class NegocioListCreateView(generics.ListCreateAPIView):
    """API: Lista e cria negócios"""
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer
    permission_classes = [IsAuthenticated]

class NegocioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalha, atualiza e deleta negócio"""
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer
    permission_classes = [IsAuthenticated]

# ===== RESPOSTAS RÁPIDAS =====

class RespostasRapidasListView(generics.ListCreateAPIView):
    """API: Lista e cria respostas rápidas"""
    serializer_class = RespostasRapidasSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if operador:
            return RespostasRapidas.objects.filter(operador=operador)
        return RespostasRapidas.objects.none()
    
    def perform_create(self, serializer):
        operador = get_user_operador(self.request.user)
        if operador:
            serializer.save(operador=operador)

# ===== NOTAS E TAREFAS =====

class NotaAtendimentoListCreateView(generics.ListCreateAPIView):
    """Listar e criar notas de atendimento"""
    serializer_class = NotaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'conteudo']
    ordering_fields = ['criado_em', 'tipo']
    ordering = ['-criado_em']
    
    def get_queryset(self):
        conversa_id = self.kwargs.get('conversa_pk')
        if conversa_id:
            queryset = NotaAtendimento.objects.filter(conversa_id=conversa_id)
        else:
            queryset = NotaAtendimento.objects.all()
        
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        operador = get_user_operador(self.request.user)
        if operador:
            queryset = queryset.filter(
                Q(privada=False) | 
                Q(privada=True, operador=operador)
            )
        
        return queryset.select_related('operador__user', 'conversa__contato')
    
    def perform_create(self, serializer):
        conversa_id = self.kwargs.get('conversa_pk')
        conversa = None
        if conversa_id:
            conversa = get_object_or_404(Conversa, id=conversa_id)
        
        operador = get_user_operador(self.request.user)
        serializer.save(
            operador=operador,
            conversa=conversa
        )

class NotaAtendimentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalhar, atualizar e deletar nota"""
    serializer_class = NotaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if operador:
            return NotaAtendimento.objects.filter(operador=operador)
        return NotaAtendimento.objects.none()

class TarefaAtendimentoListCreateView(generics.ListCreateAPIView):
    """Listar e criar tarefas"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'descricao']
    ordering_fields = ['data_vencimento', 'prioridade', 'criado_em']
    ordering = ['data_vencimento', '-prioridade']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TarefaCreateSerializer
        return TarefaAtendimentoSerializer
    
    def get_queryset(self):
        queryset = TarefaAtendimento.objects.select_related(
            'criado_por__user', 'responsavel__user', 'conversa__contato', 'contato'
        )
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        prioridade = self.request.query_params.get('prioridade')
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)
        
        responsavel_id = self.request.query_params.get('responsavel')
        if responsavel_id:
            queryset = queryset.filter(responsavel_id=responsavel_id)
        
        conversa_id = self.request.query_params.get('conversa')
        if conversa_id:
            queryset = queryset.filter(conversa_id=conversa_id)
        
        vencidas = self.request.query_params.get('vencidas')
        if vencidas == 'true':
            queryset = queryset.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            )
        
        vence_hoje = self.request.query_params.get('vence_hoje')
        if vence_hoje == 'true':
            hoje = timezone.now().date()
            queryset = queryset.filter(
                data_vencimento__date=hoje,
                status__in=['pendente', 'em_andamento']
            )
        
        return queryset
    
    def perform_create(self, serializer):
        operador = get_user_operador(self.request.user)
        validated_data = serializer.validated_data
        
        if 'responsavel_id' not in validated_data and operador:
            validated_data['responsavel'] = operador
        elif 'responsavel_id' in validated_data:
            validated_data['responsavel'] = get_object_or_404(Operador, id=validated_data.pop('responsavel_id'))
        
        if operador:
            serializer.save(criado_por=operador)

class TarefaAtendimentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalhar, atualizar e deletar tarefa"""
    serializer_class = TarefaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if operador:
            return TarefaAtendimento.objects.filter(
                Q(criado_por=operador) |
                Q(responsavel=operador)
            )
        return TarefaAtendimento.objects.none()

class MinhasTarefasView(generics.ListAPIView):
    """Tarefas do operador logado"""
    serializer_class = TarefaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if not operador:
            return TarefaAtendimento.objects.none()
        
        return TarefaAtendimento.objects.filter(
            responsavel=operador,
            status__in=['pendente', 'em_andamento']
        ).select_related('criado_por__user', 'conversa__contato', 'contato')

class TarefasStatsView(APIView):
    """Estatísticas das tarefas"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        operador = get_user_operador(request.user)
        if not operador:
            return Response({'error': 'Usuário não é operador'}, status=403)
        
        hoje = timezone.now().date()
        minhas_tarefas = TarefaAtendimento.objects.filter(responsavel=operador)
        
        stats = {
            'total_tarefas': minhas_tarefas.count(),
            'pendentes': minhas_tarefas.filter(status='pendente').count(),
            'em_andamento': minhas_tarefas.filter(status='em_andamento').count(),
            'concluidas_hoje': minhas_tarefas.filter(
                status='concluida',
                data_conclusao__date=hoje
            ).count(),
            'vencidas': minhas_tarefas.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            ).count(),
            'vence_hoje': minhas_tarefas.filter(
                data_vencimento__date=hoje,
                status__in=['pendente', 'em_andamento']
            ).count(),
            'por_prioridade': {
                'critica': minhas_tarefas.filter(prioridade='critica', status__in=['pendente', 'em_andamento']).count(),
                'alta': minhas_tarefas.filter(prioridade='alta', status__in=['pendente', 'em_andamento']).count(),
                'media': minhas_tarefas.filter(prioridade='media', status__in=['pendente', 'em_andamento']).count(),
                'baixa': minhas_tarefas.filter(prioridade='baixa', status__in=['pendente', 'em_andamento']).count(),
            }
        }
        
        return Response(stats)

# ===== QUICK ACTIONS =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_note_create(request):
    """Criar nota rápida"""
    try:
        conversa_id = request.data.get('conversa_id')
        titulo = request.data.get('titulo', 'Nota rápida')
        conteudo = request.data.get('conteudo')
        tipo = request.data.get('tipo', 'info')
        
        if not conversa_id or not conteudo:
            return Response({
                'error': 'conversa_id e conteudo são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        conversa = get_object_or_404(Conversa, id=conversa_id)
        operador = get_user_operador(request.user)
        
        if not operador:
            return Response({
                'error': 'Usuário não é operador'
            }, status=status.HTTP_403_FORBIDDEN)
        
        nota = NotaAtendimento.objects.create(
            conversa=conversa,
            operador=operador,
            titulo=titulo,
            conteudo=conteudo,
            tipo=tipo
        )
        
        serializer = NotaAtendimentoSerializer(nota)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Nota criada com sucesso'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_task_create(request):
    """Criar tarefa rápida"""
    try:
        titulo = request.data.get('titulo')
        conversa_id = request.data.get('conversa_id')
        prioridade = request.data.get('prioridade', 'media')
        data_vencimento = request.data.get('data_vencimento')
        
        if not titulo:
            return Response({
                'error': 'titulo é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        operador = get_user_operador(request.user)
        if not operador:
            return Response({
                'error': 'Usuário não é operador'
            }, status=status.HTTP_403_FORBIDDEN)
        
        conversa = None
        if conversa_id:
            conversa = get_object_or_404(Conversa, id=conversa_id)
        
        tarefa = TarefaAtendimento.objects.create(
            titulo=titulo,
            conversa=conversa,
            prioridade=prioridade,
            data_vencimento=data_vencimento,
            criado_por=operador,
            responsavel=operador
        )
        
        serializer = TarefaAtendimentoSerializer(tarefa)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Tarefa criada com sucesso'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_status(request, task_id):
    """Atualizar status da tarefa"""
    try:
        tarefa = get_object_or_404(TarefaAtendimento, id=task_id)
        operador = get_user_operador(request.user)
        
        if not operador:
            return Response({
                'error': 'Usuário não é operador'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if (tarefa.criado_por != operador and tarefa.responsavel != operador):
            return Response({
                'error': 'Sem permissão para alterar esta tarefa'
            }, status=status.HTTP_403_FORBIDDEN)
        
        novo_status = request.data.get('status')
        if not novo_status:
            return Response({
                'error': 'status é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        tarefa.status = novo_status
        if novo_status == 'concluida':
            tarefa.data_conclusao = timezone.now()
        
        tarefa.save()
        
        serializer = TarefaAtendimentoSerializer(tarefa)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Status atualizado com sucesso'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ===== ESTATÍSTICAS =====

class FunilStatsView(APIView):
    """Estatísticas do funil"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Correção: usar dict() corretamente
        leads_por_estagio = {}
        for item in Negocio.objects.values('estagio__nome').annotate(count=Count('id')):
            leads_por_estagio[item['estagio__nome']] = item['count']
        
        stats = {
            'leads_por_estagio': leads_por_estagio,
            'valor_total': Negocio.objects.aggregate(total=Sum('valor'))['total'] or 0,
        }
        return Response(stats)

class TempoRespostaStatsView(APIView):
    """Estatísticas de tempo de resposta"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({'tempo_medio_minutos': 3.5})

# ===== WEBHOOK =====

class EvolutionWebhookView(APIView):
    """Webhook para Evolution API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        return Response({'status': 'received'})