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
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
import requests
import json
import logging

# ===== CONFIGURAR LOGGING PARA VPS =====
logger = logging.getLogger(__name__)

# ===== IMPORTS DE TIPOS PARA PYLANCE - CORRIGIDO =====
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from rest_framework.request import Request

from .models import Contato, Operador
from atendimento.models import Conversa, Interacao, RespostasRapidas, NotaAtendimento, AnexoNota, TarefaAtendimento, LogAtividade
from negocio.models import Negocio
from kanban.models import Kanban, Estagio
from .serializers import (
    ContatoSerializer, OperadorSerializer
)
from atendimento.serializers import (
    ConversaListSerializer, ConversaDetailSerializer, InteracaoSerializer,
    RespostasRapidasSerializer, NotaAtendimentoSerializer, TarefaAtendimentoSerializer,
    TarefaCreateSerializer, AnexoNotaSerializer, ConversaCreateSerializer
)
from kanban.serializers import EstagioSerializer, KanbanSerializer
from negocio.serializers import NegocioSerializer
from atendimento.utils import get_instance_config
# ===== VIEWS DE API - CONTATOS =====

class ContatoListCreateView(generics.ListCreateAPIView):
    """API: Listar e criar contatos"""
    serializer_class = ContatoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'email', 'telefone']
    ordering_fields = ['nome', 'criado_em']
    ordering = ['nome']

    def get_queryset(self):
        user = self.request.user
        return Contato.objects.filter(criado_por=user)

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

class ContatoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalhar, atualizar e deletar contato"""
    serializer_class = ContatoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Contato.objects.filter(criado_por=user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_operadores_list(request):
    """API: Lista operadores"""
    operadores = Operador.objects.select_related('user')
    serializer = OperadorSerializer(operadores, many=True)
    return Response(serializer.data)

class TempoRespostaStatsView(APIView):
    """Estatísticas de tempo de resposta"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({'tempo_medio_minutos': 3.5})

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def whatsapp_restart_debug(request):
    """Debug completo da função restart"""
    try:
        logger.info("🔄 RESTART DEBUG: Iniciando...")
        
        # Pegar configuração
        config = get_instance_config()
        logger.info(f"📋 Config: {config}")
        
        base_url = config['url']
        instance_name = config['instance_name']
        api_key = config['api_key']
        
        # URL que está sendo usada
        restart_url = f"{base_url}/instance/restart/{instance_name}"
        logger.info(f"🌐 URL Restart: {restart_url}")
        
        headers = {
            'apikey': api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            logger.info("📡 Fazendo requisição PUT...")
            response = requests.put(restart_url, headers=headers, timeout=30)
            
            logger.info(f"📊 Status Code: {response.status_code}")
            logger.info(f"📦 Headers Response: {dict(response.headers)}")
            logger.info(f"📄 Content Type: {response.headers.get('content-type', 'N/A')}")
            logger.info(f"📏 Content Length: {len(response.content)}")
            logger.info(f"🔤 Raw Content: {response.content}")
            
            # Verificar se tem conteúdo
            if not response.content:
                return Response({
                    'success': False,
                    'error': 'API retornou resposta vazia',
                    'status_code': response.status_code,
                    'headers': dict(response.headers),
                    'url_testada': restart_url
                })
            
            # Tentar fazer parse do JSON
            try:
                response_data = response.json()
                logger.info(f"✅ JSON válido: {response_data}")
                
                return Response({
                    'success': True,
                    'message': 'Restart executado com sucesso',
                    'data': response_data,
                    'status_code': response.status_code,
                    'url_usada': restart_url
                })
                
            except json.JSONDecodeError as json_error:
                logger.error(f"💥 Erro JSON: {json_error}")
                return Response({
                    'success': False,
                    'error': 'Resposta não é JSON válido',
                    'raw_content': response.text,
                    'status_code': response.status_code,
                    'json_error': str(json_error)
                })
                
        except requests.exceptions.Timeout:
            return Response({
                'success': False,
                'error': 'Timeout na requisição (30s)',
                'url': restart_url
            })
            
        except requests.exceptions.ConnectionError:
            return Response({
                'success': False,
                'error': 'Erro de conexão com a Evolution API',
                'url': restart_url
            })
            
    except Exception as e:
        logger.error(f"💥 Erro geral no debug: {e}")
        return Response({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_contato_por_telefone(request):
    telefone = request.GET.get('telefone')

    if not telefone:
        return Response({'error': 'Informe o parâmetro telefone.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        telefone = telefone.strip()

        contatos = Contato.objects.filter(
            Q(telefone=telefone) | Q(whatsapp_id=telefone)
        )

        if not contatos.exists():
            return Response([], status=status.HTTP_200_OK)

        serializer = ContatoSerializer(contatos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        print("Exception", e)
        return Response([], status=status.HTTP_200_OK)
