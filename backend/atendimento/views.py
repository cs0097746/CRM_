from django.shortcuts import render
import traceback
import json
import requests
import time
import logging
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .utils import baixar_e_salvar_media

from core.models import ConfiguracaoSistema
from contato.models import Contato, Operador
from .models import (
    Conversa,
    Interacao,
    RespostasRapidas,
    NotaAtendimento,
    TarefaAtendimento,
)

from .serializers import (
    InteracaoSerializer,
    ConversaListSerializer,
    ConversaDetailSerializer,
    RespostasRapidasSerializer,
    NotaAtendimentoSerializer,
    TarefaAtendimentoSerializer,
    TarefaCreateSerializer,
)

from core.utils import get_user_operador

logger = logging.getLogger(__name__)


# ===== INTEGRAÇÃO EVOLUTION API COMPLETA =====
def get_instance_config():
    """Obtém configuração dinâmica do banco ou fallback para settings"""
    try:
        from core.models import ConfiguracaoSistema
        config = ConfiguracaoSistema.objects.first()
        
        if config and config.evolution_api_key:  # ✅ Só usa se tiver API key configurada
            return {
                'url': config.evolution_api_url,
                'api_key': config.evolution_api_key,
                'instance_name': config.whatsapp_instance_name
            }
    except Exception as e:
        logger.warning(f"⚠️ Erro ao buscar config do banco: {e}")
    
    # ✅ Fallback para settings.py se não tiver config no banco
    return {
        'url': getattr(settings, 'EVOLUTION_API_URL', 'https://evolution-api.local'),
        'api_key': getattr(settings, 'API_KEY', ''),
        'instance_name': getattr(settings, 'INSTANCE_NAME', 'main')
    }


def enviar_mensagem_whatsapp(numero, mensagem, instance_name=None, evolution_api_url=None, api_key=None):
    """Envia mensagem via Evolution API - VERSÃO FINAL VPS"""
    config = get_instance_config()

    url = f"{evolution_api_url or config['url']}/message/sendText/{instance_name or config['instance_name']}"

    payload = {
        "number": numero,
        "text": mensagem
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
    """Reinicia instância WhatsApp - VERSÃO CORRIGIDA"""
    config = get_instance_config()

    url = f"{evolution_api_url or config['url']}/instance/restart/{instance_name or config['instance_name']}"

    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }

    try:
        logger.info(f"🔄 Tentando reiniciar: {url}")
        response = requests.put(url, headers=headers, timeout=30)

        logger.info(f"📊 Status: {response.status_code}")
        logger.info(f"📦 Content: {response.content}")

        # Verificar se resposta está vazia
        if not response.content:
            if response.status_code in [200, 201, 204]:
                # Algumas APIs retornam 204 (No Content) para sucesso
                return {
                    "success": True,
                    "message": "Restart executado (resposta vazia)",
                    "status_code": response.status_code
                }
            else:
                return {
                    "success": False,
                    "error": f"Status {response.status_code} com resposta vazia"
                }

        # Tentar parse JSON
        try:
            response_data = response.json()
            if response.status_code in [200, 201]:
                return {"success": True, "data": response_data}
            else:
                return {"success": False, "error": f"Status: {response.status_code}", "data": response_data}
        except json.JSONDecodeError:
            # Se não é JSON, mas status é sucesso
            if response.status_code in [200, 201, 204]:
                return {
                    "success": True,
                    "message": "Restart executado (resposta não-JSON)",
                    "raw_response": response.text
                }
            else:
                return {
                    "success": False,
                    "error": f"Status: {response.status_code}",
                    "raw_response": response.text
                }

    except requests.exceptions.Timeout:
        return {"success": False, "error": "Timeout na requisição"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Erro de conexão"}
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
    """Obter QR Code para conectar - USA CONFIG DO BANCO"""
    try:
        # ✅ Buscar config do banco
        config = get_instance_config()
        
        # ✅ Verificar se WhatsApp está configurado
        if not config['api_key']:
            return Response({
                'success': False,
                'error': 'WhatsApp não configurado. Configure primeiro em Configurações do Sistema.',
                'connected': False,
                'redirect_to': '/configuracao'
            }, status=400)
        
        # ✅ Obter QR Code usando config dinâmica
        resultado = obter_qr_code(
            instance_name=config['instance_name'],
            evolution_api_url=config['url'],
            api_key=config['api_key']
        )

        if resultado['success']:
            if resultado.get('connected'):
                return Response({
                    'success': True,
                    'connected': True,
                    'message': 'WhatsApp já está conectado!',
                    'qr_code': None,
                    'config_source': 'banco'
                })
            else:
                return Response({
                    'success': True,
                    'connected': False,
                    'qr_code': resultado.get('qr_code'),
                    'message': 'Escaneie o QR Code com seu WhatsApp',
                    'config_source': 'banco'
                })
        else:
            return Response({
                'success': False,
                'error': resultado.get('error'),
                'connected': False,
                'config_source': 'banco'
            }, status=400)

    except Exception as e:
        logger.error(f"Erro em whatsapp_qr_code: {str(e)}")
        return Response({
            'error': f'Erro interno: {str(e)}',
            'connected': False
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def whatsapp_restart(request):
    """Reiniciar instância WhatsApp - USA CONFIG DO BANCO"""
    try:
        # ✅ Buscar config do banco
        config = get_instance_config()
        
        # ✅ Verificar se WhatsApp está configurado
        if not config['api_key']:
            return Response({
                'success': False,
                'error': 'WhatsApp não configurado. Configure primeiro em Configurações do Sistema.',
                'redirect_to': '/configuracao'
            }, status=400)
        
        # ✅ Reiniciar usando config dinâmica
        resultado = reiniciar_instancia(
            instance_name=config['instance_name'],
            evolution_api_url=config['url'],
            api_key=config['api_key']
        )

        if resultado['success']:
            return Response({
                'success': True,
                'message': 'Instância reiniciada com sucesso',
                'data': resultado.get('data'),
                'config_source': 'banco'
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error'],
                'config_source': 'banco'
            }, status=400)

    except Exception as e:
        logger.error(f"Erro em whatsapp_restart: {str(e)}")
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def whatsapp_disconnect(request):
    """Desconectar instância WhatsApp - USA CONFIG DO BANCO"""
    try:
        # ✅ Buscar config do banco
        config = get_instance_config()
        
        # ✅ Verificar se WhatsApp está configurado
        if not config['api_key']:
            return Response({
                'success': False,
                'error': 'WhatsApp não configurado.',
                'redirect_to': '/configuracao'
            }, status=400)
        
        # ✅ Desconectar usando config dinâmica
        resultado = desconectar_instancia(
            instance_name=config['instance_name'],
            evolution_api_url=config['url'],
            api_key=config['api_key']
        )

        if resultado['success']:
            return Response({
                'success': True,
                'message': 'WhatsApp desconectado com sucesso',
                'data': resultado.get('data'),
                'config_source': 'banco'
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error'],
                'config_source': 'banco'
            }, status=400)

    except Exception as e:
        logger.error(f"Erro em whatsapp_disconnect: {str(e)}")
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whatsapp_status(request):
    """Status detalhado da conexão - USA CONFIG DO BANCO"""
    try:
        # ✅ Buscar config do banco
        config = get_instance_config()
        
        # ✅ Verificar se WhatsApp está configurado
        if not config['api_key']:
            return Response({
                'success': False,
                'error': 'WhatsApp não configurado. Acesse Configurações do Sistema.',
                'connected': False,
                'config_source': 'não configurado',
                'redirect_to': '/configuracao'
            })
        
        # ✅ Verificar status usando config dinâmica
        resultado = verificar_status_instancia(
            instance_name=config['instance_name'],
            evolution_api_url=config['url'],
            api_key=config['api_key']
        )

        return Response({
            'success': resultado['success'],
            'instance_name': config['instance_name'],
            'status': resultado.get('status'),
            'connected': resultado.get('connected', False),
            'message': f"Status: {resultado.get('status', 'unknown')}",
            'config_source': 'banco' if config['api_key'] else 'settings',
            'api_url': config['url']
        })

    except Exception as e:
        logger.error(f"Erro em whatsapp_status: {str(e)}")
        return Response({
            'error': f'Erro interno: {str(e)}',
            'connected': False,
            'config_source': 'erro'
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
                'success': False,
                'error': 'Campos obrigatórios: numero, mensagem'
            }, status=400)

        # ✅ Enviar para WhatsApp
        resultado = enviar_mensagem_whatsapp(numero, mensagem)

        if resultado['success']:
            # ✅ Salvar no CRM se conversa_id fornecido
            if conversa_id:
                try:
                    conversa = Conversa.objects.get(id=conversa_id)
                    operador = get_user_operador(request.user)

                    Interacao.objects.create(
                        conversa=conversa,
                        mensagem=mensagem,
                        remetente='operador',
                        tipo='texto',
                        operador=operador
                    )
                    logger.info("💾 Interação salva no CRM")
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao salvar no CRM: {e}")

            return Response({
                'success': True,
                'message': 'Mensagem enviada com sucesso',
                'data': resultado['data'],
                'whatsapp_id': resultado.get('whatsapp_id'),
                'status': resultado.get('status', 'pending')
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error']
            }, status=400)

    except Exception as e:
        logger.error(f"Erro em enviar_mensagem_view: {str(e)}")
        return Response({
            'success': False,
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


@api_view(['POST'])
@permission_classes([AllowAny])
def evolution_webhook(request):
    """Webhook Evolution API - VERSÃO CORRIGIDA"""
    try:
        event_type = request.data.get('event')
        event_data = request.data.get('data', {})
        
        logger.info(f"📥 Webhook recebido: {event_type}")
        
        if event_type == 'messages.upsert':
            key_data = event_data.get('key', {})
            message_data = event_data.get('message', {})
            
            # Verificar se é mensagem recebida (não enviada por nós)
            if not key_data.get('fromMe', True):
                numero_remetente = key_data.get('remoteJid', '').replace('@s.whatsapp.net', '')
                message_id = key_data.get('id')
                push_name = event_data.get('pushName', f'Contato {numero_remetente}')
                
                logger.info(f"📱 Nova mensagem de: {numero_remetente}")
                
                # ✅ USAR FUNÇÃO EXISTENTE processar_mensagem_media:
                texto_mensagem, tipo_mensagem, media_url, media_filename, media_size, media_duration = processar_mensagem_media(message_data)
                
                logger.info(f"💬 Tipo: {tipo_mensagem} | Conteúdo: {texto_mensagem or '[Mídia sem texto]'}")
                if media_url:
                    logger.info(f"🔗 Media URL: {media_url}")
                
                # ✅ BUSCAR OU CRIAR CONTATO:
                contato, created = Contato.objects.get_or_create(
                    telefone=numero_remetente,
                    defaults={
                        'nome': push_name,
                        'observacoes': 'Criado automaticamente via webhook'
                    }
                )
                
                if created:
                    logger.info(f"👤 Novo contato criado: {contato.nome}")
                
                # ✅ BUSCAR OU CRIAR CONVERSA:
                conversa, conv_created = Conversa.objects.get_or_create(
                    contato=contato,
                    status__in=['entrada', 'atendimento'],
                    defaults={
                        'status': 'entrada',
                        'origem': 'whatsapp',
                        'assunto': 'Conversa WhatsApp'
                    }
                )
                
                if conv_created:
                    logger.info(f"💬 Nova conversa criada: ID {conversa.pk}")

                # Só processa se houver conteúdo de texto ou mídia para salvar
                if texto_mensagem or media_url:
                    arquivo_local_url = None # Usar um nome de variável diferente para clareza
                    
                    if media_url and tipo_mensagem in ['imagem', 'audio', 'video', 'documento']:
                        arquivo_salvo, sucesso, erro = baixar_e_salvar_media(
                            media_url, 
                            media_filename or f"{tipo_mensagem}_{int(time.time())}.bin",
                            tipo_mensagem
                        )
                        
                        if sucesso:
                            logger.info(f"📁 Arquivo salvo localmente: {arquivo_salvo}")
                            # URL para ser acessada pelo sistema
                            arquivo_local_url = request.build_absolute_uri(arquivo_salvo)
                        else:
                            logger.warning(f"⚠️ Falha ao baixar mídia: {erro}")
                            # Salva a URL temporária como fallback
                            arquivo_local_url = media_url
                    
                    # Cria a interação no banco de dados
                    interacao = Interacao.objects.create(
                        conversa=conversa,
                        mensagem=texto_mensagem,
                        remetente='cliente',
                        tipo=tipo_mensagem,
                        whatsapp_id=message_id,
                        media_url=arquivo_local_url,
                        media_filename=media_filename,
                        media_size=media_size,
                        media_duration=media_duration
                    )
                    
                    logger.info(f"💾 Mensagem salva: ID {interacao.pk} | Tipo: {tipo_mensagem}")
                    if arquivo_local_url: 
                        logger.info(f"🔗 MÍDIA SALVA: {arquivo_local_url}")
                        
                    # Atualizar timestamp da conversa
                    conversa.atualizado_em = timezone.now()
                    conversa.save()
                
                    return Response({
                        'status': 'processed',
                        'contato_id': contato.pk,
                        'conversa_id': conversa.pk,
                        'interacao_id': interacao.pk,
                        'has_media': bool(arquivo_local_url),
                        'message': f'Mensagem {tipo_mensagem} processada com sucesso'
                    })
                else:
                    logger.info("ℹ️ Mensagem ignorada (sem texto ou mídia).")

        # Processar outros eventos
        elif event_type == 'connection.update':
            connection_state = event_data.get('state')
            logger.info(f"🔌 Estado da conexão: {connection_state}")
        
        # Resposta padrão para eventos recebidos mas não processados (ou mensagens 'fromMe')
        return Response({
            'status': 'received_ok',
            'event': event_type,
            'message': 'Event received but no action taken.'
        })
        
    except Exception as e:
        logger.error(f"💥 Erro no webhook: {str(e)}", exc_info=True) # exc_info=True para logar o traceback
        return Response({'status': 'error', 'error': str(e)}, status=500)

def processar_mensagem_media(message_data):
    """
    Processa diferentes tipos de mensagem e extrai mídia
    Retorna: (texto_mensagem, tipo_mensagem, media_url, media_filename, media_size, media_duration)
    """
    try:
        logger.info(f"🔍 Processando mensagem: {list(message_data.keys())}")
        
        # ✅ TEXTO SIMPLES
        if message_data.get('conversation'):
            return (
                message_data.get('conversation'),
                'texto',
                None, None, None, None
            )
        
        # ✅ TEXTO EXTENDIDO (com formatação)
        elif message_data.get('extendedTextMessage'):
            return (
                message_data.get('extendedTextMessage', {}).get('text', ''),
                'texto',
                None, None, None, None
            )
        
        # ✅ IMAGEM - VERSÃO MELHORADA
        elif message_data.get('imageMessage'):
            image_msg = message_data.get('imageMessage', {})
            caption = image_msg.get('caption', '')
            
            # ✅ TENTAR DIFERENTES CAMPOS DE URL:
            media_url = (
                image_msg.get('url') or 
                image_msg.get('directPath') or 
                image_msg.get('mediaUrl') or
                image_msg.get('thumbnail')
            )
            
            # ✅ OUTROS DADOS DA IMAGEM:
            filename = image_msg.get('fileName') or f"imagem_{int(time.time())}.jpg"
            file_size = image_msg.get('fileLength') or image_msg.get('size')
            
            logger.info(f"📷 Imagem detectada - URL: {media_url}")
            logger.info(f"📷 Dados da imagem: {image_msg}")
            
            return (
                f"📷 Imagem enviada{': ' + caption if caption else ''}",
                'imagem',
                media_url,
                filename,
                file_size,
                None
            )
        
        # ✅ ÁUDIO - VERSÃO MELHORADA
        elif message_data.get('audioMessage'):
            audio_msg = message_data.get('audioMessage', {})
            
            # ✅ TENTAR DIFERENTES CAMPOS DE URL:
            media_url = (
                audio_msg.get('url') or 
                audio_msg.get('directPath') or 
                audio_msg.get('mediaUrl')
            )
            
            # ✅ OUTROS DADOS DO ÁUDIO:
            duration = audio_msg.get('seconds', 0)
            filename = audio_msg.get('fileName') or f"audio_{int(time.time())}.ogg"
            file_size = audio_msg.get('fileLength') or audio_msg.get('size')
            
            logger.info(f"🎵 Áudio detectado - URL: {media_url} - Duração: {duration}s")
            logger.info(f"🎵 Dados do áudio: {audio_msg}")
            
            return (
                f"🎵 Áudio enviado ({duration}s)",
                'audio',
                media_url,
                filename,
                file_size,
                duration
            )
        
        # ✅ VÍDEO - VERSÃO MELHORADA
        elif message_data.get('videoMessage'):
            video_msg = message_data.get('videoMessage', {})
            caption = video_msg.get('caption', '')
            
            media_url = (
                video_msg.get('url') or 
                video_msg.get('directPath') or 
                video_msg.get('mediaUrl')
            )
            
            filename = video_msg.get('fileName') or f"video_{int(time.time())}.mp4"
            file_size = video_msg.get('fileLength') or video_msg.get('size')
            duration = video_msg.get('seconds', 0)
            
            logger.info(f"🎥 Vídeo detectado - URL: {media_url}")
            
            return (
                f"🎥 Vídeo enviado{': ' + caption if caption else ''}",
                'video',
                media_url,
                filename,
                file_size,
                duration
            )
        
        # ✅ STICKER/FIGURINHA
        elif message_data.get('stickerMessage'):
            sticker_msg = message_data.get('stickerMessage', {})
            
            media_url = (
                sticker_msg.get('url') or 
                sticker_msg.get('directPath') or 
                sticker_msg.get('mediaUrl')
            )
            
            filename = f"sticker_{int(time.time())}.webp"
            
            logger.info(f"😄 Sticker detectado - URL: {media_url}")
            
            return (
                "😄 Figurinha enviada",
                'sticker',
                media_url,
                filename,
                None,
                None
            )
        
        # ✅ DOCUMENTO
        elif message_data.get('documentMessage'):
            doc_msg = message_data.get('documentMessage', {})
            
            media_url = (
                doc_msg.get('url') or 
                doc_msg.get('directPath') or 
                doc_msg.get('mediaUrl')
            )
            
            filename = doc_msg.get('fileName', 'documento')
            file_size = doc_msg.get('fileLength') or doc_msg.get('size')
            
            return (
                f"📄 Documento: {filename}",
                'documento',
                media_url,
                filename,
                file_size,
                None
            )
        
        # ✅ LOCALIZAÇÃO
        elif message_data.get('locationMessage'):
            location_msg = message_data.get('locationMessage', {})
            lat = location_msg.get('degreesLatitude', 0)
            lng = location_msg.get('degreesLongitude', 0)
            
            return (
                f"📍 Localização: {lat}, {lng}",
                'localizacao',
                f"https://maps.google.com/maps?q={lat},{lng}",
                None,
                None,
                None
            )
        
        # ✅ CONTATO
        elif message_data.get('contactMessage'):
            contact_msg = message_data.get('contactMessage', {})
            name = contact_msg.get('displayName', 'Contato')
            
            return (
                f"👤 Contato compartilhado: {name}",
                'contato',
                None,
                None,
                None,
                None
            )
        
        # ✅ MENSAGEM NÃO SUPORTADA
        else:
            logger.warning(f"⚠️ Tipo de mensagem não reconhecido: {list(message_data.keys())}")
            return (
                "[Mensagem não suportada]",
                'outros',
                None,
                None,
                None,
                None
            )
            
    except Exception as e:
        logger.error(f"💥 Erro ao processar mídia: {str(e)}")
        return (
            "[Erro ao processar mensagem]",
            'erro',
            None,
            None,
            None,
            None
        )
    
@api_view(['POST'])
@permission_classes([AllowAny])
def debug_webhook(request):
    """Debug completo do webhook - VER DADOS RAW"""
    try:
        logger.info("🐛 DEBUG WEBHOOK - DADOS COMPLETOS:")
        logger.info(f"📦 Request data: {request.data}")
        
        event_type = request.data.get('event')
        event_data = request.data.get('data', {})
        
        if event_type == 'messages.upsert':
            message_data = event_data.get('message', {})
            
            logger.info(f"🔍 Message data completo: {json.dumps(message_data, indent=2)}")
            
            # Verificar especificamente mídias
            if message_data.get('imageMessage'):
                logger.info(f"📷 IMAGEM DETECTADA: {json.dumps(message_data.get('imageMessage'), indent=2)}")
            
            if message_data.get('audioMessage'):
                logger.info(f"🎵 ÁUDIO DETECTADO: {json.dumps(message_data.get('audioMessage'), indent=2)}")
        
        return Response({
            'status': 'debug_processed',
            'received_data': request.data,
            'message': 'Debug completo nos logs'
        })
        
    except Exception as e:
        logger.error(f"💥 Erro no debug: {str(e)}")
        return Response({
            'status': 'debug_error',
            'error': str(e)
        })