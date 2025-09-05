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

from .models import (
    Contato, Conversa, Interacao, Operador, Estagio, Negocio,
    RespostasRapidas, NotaAtendimento, TarefaAtendimento, AnexoNota
)
from .serializers import (
    ContatoSerializer, OperadorSerializer,
    ConversaListSerializer, ConversaDetailSerializer, InteracaoSerializer,
    EstagioSerializer, NegocioSerializer, RespostasRapidasSerializer,
    NotaAtendimentoSerializer, TarefaAtendimentoSerializer, 
    TarefaCreateSerializer, AnexoNotaSerializer, ConversaCreateSerializer
)

# ===== FUNÇÃO AUXILIAR =====
def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None

# ===== INTEGRAÇÃO EVOLUTION API COMPLETA =====

def get_instance_config():
    """Obtém configuração da instância via settings"""
    from django.conf import settings
    return {
        'url': getattr(settings, 'EVOLUTION_API_URL', 'https://evo.loomiecrm.com'),
        'api_key': getattr(settings, 'API_KEY', '095B7FC5F286-4E22-A2E9-3A8C54545870'),
        'instance_name': getattr(settings, 'INSTANCE_NAME', 'nate')
    }

def enviar_mensagem_whatsapp(numero, mensagem, instance_name=None, evolution_api_url=None, api_key=None):
    """Envia mensagem via Evolution API - VERSÃO FINAL VPS"""
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/message/sendText/{instance_name or config['instance_name']}"
    
    payload = {
        "number": numero,
        "textMessage": {
            "text": mensagem
        }
    }
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            response_data = response.json()
            logger.info("✅ MENSAGEM ENVIADA COM SUCESSO!")
            return {
                "success": True, 
                "data": response_data,
                "message": "Mensagem enviada com sucesso",
                "whatsapp_id": response_data.get('key', {}).get('id'),
                "status": response_data.get('status', 'pending')
            }
        elif response.status_code == 400:
            response_data = response.json()
            if "exists" in response.text and "false" in response.text:
                return {
                    "success": False, 
                    "error": "Número não existe no WhatsApp", 
                    "details": response_data
                }
            else:
                return {
                    "success": False, 
                    "error": "Erro na requisição", 
                    "details": response_data
                }
        else:
            return {
                "success": False, 
                "error": f"HTTP {response.status_code}",
                "details": response.text[:200]
            }
            
    except Exception as e:
        logger.error(f"💥 Erro ao enviar mensagem: {str(e)}")
        return {"success": False, "error": str(e)}

def enviar_presenca_whatsapp(numero, presence="composing", instance_name=None, evolution_api_url=None, api_key=None):
    """Envia presença (digitando...) via Evolution API"""
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/chat/sendPresence/{instance_name or config['instance_name']}"
    
    payload = {
        "number": numero,
        "presence": presence
    }
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ Presença '{presence}' enviada para {numero}")
            return {"success": True, "data": response.json()}
        else:
            logger.warning(f"⚠️ Erro ao enviar presença: {response.status_code}")
            return {"success": False, "error": f"Status: {response.status_code}"}
            
    except Exception as e:
        logger.error(f"💥 Erro presença: {str(e)}")
        return {"success": False, "error": str(e)}

def verificar_status_instancia(instance_name=None, evolution_api_url=None, api_key=None):
    """Verifica status da conexão da instância WhatsApp"""
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/instance/connectionState/{instance_name or config['instance_name']}"
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            instance_data = data.get('instance', {})
            
            return {
                "success": True,
                "status": instance_data.get('state', 'unknown'),
                "connected": instance_data.get('state') == 'open',
                "instance_name": instance_data.get('instanceName'),
                "data": data
            }
        else:
            return {
                "success": False,
                "status": 'error',
                "connected": False,
                "error": f"HTTP {response.status_code}"
            }
            
    except Exception as e:
        logger.error(f"Erro ao verificar status: {str(e)}")
        return {
            "success": False,
            "status": 'error', 
            "connected": False,
            "error": str(e)
        }

def obter_qr_code(instance_name=None, evolution_api_url=None, api_key=None):
    """Obtém QR Code para conectar instância"""
    config = get_instance_config()
    
    try:
        # Primeiro verificar status
        status_result = verificar_status_instancia(instance_name, evolution_api_url, api_key)
        
        # Se já conectado, não precisa de QR
        if status_result.get('connected'):
            return {
                "success": True,
                "connected": True,
                "qr_code": None,
                "message": "Instância já conectada"
            }
        
        # Obter QR Code
        url = f"{evolution_api_url or config['url']}/instance/connect/{instance_name or config['instance_name']}"
        
        headers = {
            'apikey': api_key or config['api_key'],
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            qr_code = data.get('qrcode') or data.get('base64')
            
            return {
                "success": True,
                "connected": False,
                "qr_code": qr_code,
                "data": data
            }
        else:
            return {
                "success": False,
                "connected": False,
                "error": f"HTTP {response.status_code}",
                "details": response.text
            }
            
    except Exception as e:
        logger.error(f"Erro ao obter QR Code: {str(e)}")
        return {
            "success": False,
            "connected": False,
            "error": str(e)
        }

def reiniciar_instancia(instance_name=None, evolution_api_url=None, api_key=None):
    """Reinicia instância WhatsApp"""
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/instance/restart/{instance_name or config['instance_name']}"
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.put(url, headers=headers, timeout=15)
        
        if response.status_code in [200, 201]:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"Status: {response.status_code}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def desconectar_instancia(instance_name=None, evolution_api_url=None, api_key=None):
    """Desconecta instância WhatsApp"""
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/instance/logout/{instance_name or config['instance_name']}"
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.delete(url, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"Status: {response.status_code}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

# ===== VIEWS DE API - CONTATOS =====

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
        },
        'whatsapp': {
            'mensagens_enviadas_hoje': Interacao.objects.filter(
                criado_em__date=hoje,
                remetente='operador'
            ).count(),
            'mensagens_recebidas_hoje': Interacao.objects.filter(
                criado_em__date=hoje,
                remetente='cliente'
            ).count()
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
        
        tipo = self.request.GET.get('tipo')
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
        
        status_param = self.request.GET.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        prioridade = self.request.GET.get('prioridade')
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)
        
        responsavel_id = self.request.GET.get('responsavel')
        if responsavel_id:
            queryset = queryset.filter(responsavel_id=responsavel_id)
        
        conversa_id = self.request.GET.get('conversa')
        if conversa_id:
            queryset = queryset.filter(conversa_id=conversa_id)
        
        vencidas = self.request.GET.get('vencidas')
        if vencidas == 'true':
            queryset = queryset.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            )
        
        vence_hoje = self.request.GET.get('vence_hoje')
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

# ===== VIEWS WHATSAPP AVANÇADAS =====

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whatsapp_dashboard(request):
    """Dashboard completo do WhatsApp"""
    try:
        status_result = verificar_status_instancia()
        
        # Estatísticas de mensagens hoje
        hoje = timezone.now().date()
        mensagens_enviadas = Interacao.objects.filter(
            criado_em__date=hoje,
            remetente='operador'
        ).count()
        
        mensagens_recebidas = Interacao.objects.filter(
            criado_em__date=hoje,
            remetente='cliente'
        ).count()
        
        return Response({
            'instancia': {
                'nome': get_instance_config()['instance_name'],
                'status': status_result.get('status', 'unknown'),
                'connected': status_result.get('connected', False),
                'url_api': get_instance_config()['url']
            },
            'estatisticas': {
                'mensagens_enviadas_hoje': mensagens_enviadas,
                'mensagens_recebidas_hoje': mensagens_recebidas,
                'total_conversas_ativas': Conversa.objects.filter(
                    status__in=['entrada', 'atendimento']
                ).count(),
                'ultima_atualizacao': timezone.now().isoformat()
            }
        })
        
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whatsapp_qr_code(request):
    """Obter QR Code para conectar"""
    try:
        resultado = obter_qr_code()
        
        if resultado['success']:
            if resultado.get('connected'):
                return Response({
                    'success': True,
                    'connected': True,
                    'message': 'WhatsApp já está conectado!',
                    'qr_code': None
                })
            else:
                return Response({
                    'success': True,
                    'connected': False,
                    'qr_code': resultado.get('qr_code'),
                    'message': 'Escaneie o QR Code com seu WhatsApp'
                })
        else:
            return Response({
                'success': False,
                'error': resultado.get('error'),
                'connected': False
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}',
            'connected': False
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def whatsapp_restart(request):
    """Reiniciar instância WhatsApp"""
    try:
        resultado = reiniciar_instancia()
        
        if resultado['success']:
            return Response({
                'success': True,
                'message': 'Instância reiniciada com sucesso',
                'data': resultado['data']
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error']
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def whatsapp_disconnect(request):
    """Desconectar instância WhatsApp"""
    try:
        resultado = desconectar_instancia()
        
        if resultado['success']:
            return Response({
                'success': True,
                'message': 'WhatsApp desconectado com sucesso',
                'data': resultado['data']
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error']
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whatsapp_status(request):
    """Status detalhado da conexão"""
    try:
        resultado = verificar_status_instancia()
        
        return Response({
            'success': resultado['success'],
            'instance_name': get_instance_config()['instance_name'],
            'status': resultado.get('status'),
            'connected': resultado.get('connected', False),
            'message': f"Status: {resultado.get('status', 'unknown')}"
        })
        
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}',
            'connected': False
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_mensagem_view(request):
    """API para enviar mensagem via WhatsApp"""
    try:
        numero = request.data.get('numero')
        mensagem = request.data.get('mensagem')
        conversa_id = request.data.get('conversa_id')
        
        if not numero or not mensagem:
            return Response({
                'error': 'Campos obrigatórios: numero, mensagem'
            }, status=400)
        
        resultado = enviar_mensagem_whatsapp(numero, mensagem)
        
        if resultado['success']:
            # Salvar no CRM se conversa_id fornecido
            if conversa_id:
                try:
                    conversa = Conversa.objects.get(id=conversa_id)
                    operador = get_user_operador(request.user)
                    
                    Interacao.objects.create(
                        conversa=conversa,
                        mensagem=mensagem,
                        remetente='operador',
                        tipo='texto',
                        operador=operador,
                        whatsapp_id=resultado.get('whatsapp_id')
                    )
                    logger.info("💾 Interação salva no CRM")
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao salvar no CRM: {e}")
            
            return Response({
                'success': True,
                'message': 'Mensagem enviada com sucesso',
                'data': resultado['data'],
                'whatsapp_id': resultado.get('whatsapp_id'),
                'status': resultado.get('status')
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error'],
                'details': resultado.get('details')
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_presenca_view(request):
    """API para enviar presença (digitando...)"""
    try:
        numero = request.data.get('numero')
        presence = request.data.get('presence', 'composing')
        
        if not numero:
            return Response({
                'error': 'Campo obrigatório: numero'
            }, status=400)
        
        resultado = enviar_presenca_whatsapp(numero, presence)
        
        if resultado['success']:
            return Response({
                'success': True,
                'message': 'Presença enviada com sucesso',
                'data': resultado['data']
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error']
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

# ===== WEBHOOK EVOLUTION API ROBUSTO =====

@api_view(['POST'])
@permission_classes([AllowAny])
def evolution_webhook(request):
    """
    Webhook robusto para Evolution API - OTIMIZADO PARA VPS
    Processa mensagens recebidas e cria contatos automaticamente
    """
    try:
        data = request.data
        event_type = data.get('event')
        instance_name = data.get('instance')
        event_data = data.get('data', {})
        
        logger.info(f"🔔 WEBHOOK: {event_type} da instância {instance_name}")
        
        # Processar mensagens recebidas
        if event_type == 'messages.upsert':
            key_data = event_data.get('key', {})
            message_data = event_data.get('message', {})
            
            # Verificar se é mensagem recebida (não enviada por nós)
            if not key_data.get('fromMe', True):
                numero_remetente = key_data.get('remoteJid', '').replace('@s.whatsapp.net', '')
                texto_mensagem = (
                    message_data.get('conversation', '') or 
                    message_data.get('extendedTextMessage', {}).get('text', '') or
                    '[Mídia]'
                )
                whatsapp_id = key_data.get('id')
                
                logger.info(f"📱 Nova mensagem de: {numero_remetente}")
                logger.info(f"💬 Conteúdo: {texto_mensagem}")
                
                # Buscar ou criar contato
                contato, created = Contato.objects.get_or_create(
                    telefone=numero_remetente,
                    defaults={
                        'nome': f'WhatsApp {numero_remetente[-4:]}',
                        'origem': 'whatsapp',
                        'observacoes': 'Criado automaticamente via webhook'
                    }
                )
                
                if created:
                    logger.info(f"👤 Novo contato criado: {contato.nome}")
                
                # Buscar ou criar conversa ativa
                conversa, conv_created = Conversa.objects.get_or_create(
                    contato=contato,
                    status__in=['entrada', 'atendimento'],
                    defaults={
                        'status': 'entrada',
                        'canal': 'whatsapp',
                        'assunto': 'Conversa WhatsApp'
                    }
                )
                
                if conv_created:
                    logger.info(f"💬 Nova conversa criada: ID {conversa.pk}")
                
                # Salvar mensagem
                if texto_mensagem and texto_mensagem.strip():
                    interacao = Interacao.objects.create(
                        conversa=conversa,
                        mensagem=texto_mensagem,
                        remetente='cliente',
                        tipo='texto',
                        whatsapp_id=whatsapp_id
                    )
                    
                    logger.info(f"💾 Mensagem salva: ID {interacao.pk}")
                    
                    # Atualizar timestamp da conversa
                    conversa.atualizado_em = timezone.now()
                    conversa.save()
                
                return Response({
                    'status': 'processed',
                    'contato_id': contato.pk,
                    'conversa_id': conversa.pk,
                    'message': 'Mensagem processada com sucesso'
                })
        
        # Processar outros eventos
        elif event_type == 'connection.update':
            connection_state = event_data.get('state')
            logger.info(f"🔌 Estado da conexão: {connection_state}")
        
        return Response({
            'status': 'received',
            'event': event_type,
            'processed': True
        })
        
    except Exception as e:
        logger.error(f"💥 Erro no webhook: {str(e)}")
        return Response({
            'status': 'error',
            'error': str(e)
        }, status=500)

# ===== ENDPOINTS PARA INTEGRAÇÃO N8N =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def webhook_n8n_lead(request):
    """Endpoint para N8N criar/atualizar leads"""
    try:
        data = request.data
        numero = data.get('numero')
        nome = data.get('nome', f'Lead {numero}')
        tipo_interesse = data.get('tipo_interesse', 'geral')
        origem = data.get('origem', 'whatsapp')
        
        # Buscar ou criar contato
        contato, created = Contato.objects.get_or_create(
            telefone=numero,
            defaults={
                'nome': nome,
                'origem': origem,
                'observacoes': f'Interesse: {tipo_interesse}'
            }
        )
        
        # Criar conversa se não existir
        conversa, conv_created = Conversa.objects.get_or_create(
            contato=contato,
            status__in=['entrada', 'atendimento'],
            defaults={
                'status': 'entrada',
                'canal': origem
            }
        )
        
        return Response({
            'success': True,
            'contato_id': contato.pk,
            'conversa_id': conversa.pk,
            'created': created,
            'message': 'Lead processado com sucesso'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_contato_por_telefone(request):
    """Buscar contato por telefone para N8N"""
    numero = request.GET.get('numero')
    
    if not numero:
        return Response({'error': 'Parâmetro numero é obrigatório'}, status=400)
    
    try:
        contato = Contato.objects.get(telefone=numero)
        serializer = ContatoSerializer(contato)
        
        conversa_ativa = Conversa.objects.filter(
            contato=contato,
            status__in=['entrada', 'atendimento']
        ).first()
        
        return Response({
            'found': True,
            'contato': serializer.data,
            'conversa_id': conversa_ativa.pk if conversa_ativa else None,
            'is_cliente': True
        })
        
    except Contato.DoesNotExist:
        return Response({
            'found': False,
            'is_cliente': False
        })

# ===== ESTATÍSTICAS =====

class FunilStatsView(APIView):
    """Estatísticas do funil"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
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

# ===== HEALTH CHECK PARA VPS =====

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check para monitoramento da VPS"""
    try:
        # Verificar database
        contatos_count = Contato.objects.count()
        
        # Verificar Evolution API
        status_whatsapp = verificar_status_instancia()
        
        return Response({
            'status': 'healthy',
            'timestamp': timezone.now(),
            'database': {
                'connected': True,
                'contatos': contatos_count
            },
            'whatsapp': {
                'connected': status_whatsapp.get('connected', False),
                'status': status_whatsapp.get('status', 'unknown')
            },
            'services': {
                'backend': 'online',
                'evolution_api': 'https://evo.loomiecrm.com',
                'frontend': 'https://crm.loomiecrm.com'
            }
        })
        
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now()
        }, status=500)

# ===== AUTENTICAÇÃO =====

@api_view(['POST'])
@permission_classes([AllowAny])
def obter_token_auth(request):
    """Obter token de autenticação"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Username e password são obrigatórios'
            }, status=400)
        
        user = authenticate(username=username, password=password)
        
        if user:
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'token': token.key,
                'user_id': user.pk,
                'username': user.username,
                'message': 'Token gerado com sucesso'
            })
        else:
            return Response({
                'error': 'Credenciais inválidas'
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def criar_usuario_teste(request):
    """Criar usuário para teste"""
    try:
        username = request.data.get('username', 'testuser')
        password = request.data.get('password', 'test123')
        email = request.data.get('email', 'test@test.com')
        
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        
        if created:
            user.set_password(password)
            user.save()
            
            # Criar operador
            operador, op_created = Operador.objects.get_or_create(
                user=user,
                defaults={
                    'ativo': True,
                    'ramal': '1001',
                    'setor': 'Atendimento'
                }
            )
            
            return Response({
                'success': True,
                'message': 'Usuário e operador criados com sucesso',
                'user_id': user.pk,
                'operador_id': operador.pk
            })
        else:
            return Response({
                'success': False,
                'message': 'Usuário já existe'
            })
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

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