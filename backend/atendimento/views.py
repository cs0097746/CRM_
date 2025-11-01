# Python Standard Library
import base64
import json
import logging
import mimetypes
import os
import time
import traceback
import uuid
from core.utils import get_ids_visiveis
import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Q, F, Avg, Count, Min, Max
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination
from core.models import ConfiguracaoSistema
from core.utils import get_user_operador
from core.ffmpeg_service import FFmpegService
from contato.models import Contato, Operador
from .utils import baixar_e_salvar_media, get_instance_config
from .models import (
    Conversa,
    Interacao,
    NotaAtendimento,
    RespostasRapidas,
    TarefaAtendimento,
)
from .serializers import (
    ConversaDetailSerializer,
    ConversaListSerializer,
    InteracaoSerializer,
    NotaAtendimentoSerializer,
    RespostasRapidasSerializer,
    TarefaAtendimentoSerializer,
    TarefaCreateSerializer,
)
from .utils import baixar_e_salvar_media

logger = logging.getLogger(__name__)


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
            logger.info("MENSAGEM ENVIADA COM SUCESSO!")
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
            logger.info(f"Presença '{presence}' enviada para {numero}")
            return {"success": True, "data": response.json()}
        else:
            logger.warning(f"Erro ao enviar presença: {response.status_code}")
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

        logger.info(f"Status: {response.status_code}")
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

class ConversaPagination(PageNumberPagination):
    """
    Paginação para conversas - 20 itens por página
    Evita carregar todas as conversas de uma vez (performance)
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ConversaListView(generics.ListAPIView):
    """
    API: Lista conversas com URLs locais e paginação
    """
    serializer_class = ConversaListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ConversaPagination  # ✅ PAGINAÇÃO ADICIONADA
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'operador']
    search_fields = ['contato__nome', 'contato__telefone']
    ordering_fields = ['criado_em', 'atualizado_em']
    ordering = ['-atualizado_em']
    
    def get_queryset(self):
        return Conversa.objects.select_related('contato', 'operador__user').prefetch_related(
            'interacoes'
        )
    
    def get_serializer_context(self):
        """✅ GARANTIR request context para URLs completas"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class ConversaCreateView(generics.CreateAPIView):
    """
    API: Cria nova conversa manualmente com um contato
    POST /conversas/criar/
    Body: { "contato": <contato_id>, "assunto": "...", "origem": "manual" }
    """
    serializer_class = ConversaDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        operador = get_user_operador(self.request.user)
        contato_id = self.request.data.get('contato')
        
        if not contato_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"contato": "Campo obrigatório"})
        
        # Verificar se já existe conversa ativa com esse contato
        conversa_existente = Conversa.objects.filter(
            contato_id=contato_id,
            status__in=['entrada', 'atendimento']
        ).first()
        
        if conversa_existente:
            # Se já existe, atualiza operador e retorna a existente
            if operador and not conversa_existente.operador:
                conversa_existente.operador = operador
                conversa_existente.status = 'atendimento'
                conversa_existente.save()
            
            # Retornar conversa existente sem criar nova
            return conversa_existente
        
        # Se não existe, cria nova conversa
        serializer.save(
            operador=operador,
            origem=self.request.data.get('origem', 'manual'),
            status='atendimento'
        )
    
    def create(self, request, *args, **kwargs):
        """Sobrescrever create para lidar com conversas existentes"""
        import re
        operador = get_user_operador(request.user)
        contato_id = request.data.get('contato')
        
        if not contato_id:
            return Response(
                {"error": "Campo 'contato' é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar contato para normalizar telefone
        from contato.models import Contato
        try:
            contato = Contato.objects.get(id=contato_id)
        except Contato.DoesNotExist:
            return Response(
                {"error": "Contato não encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Normalizar telefone do contato (remover tudo que não é número)
        telefone_normalizado = re.sub(r'\D', '', contato.telefone) if contato.telefone else ''
        
        # Buscar conversa existente por telefone normalizado OU por contato_id
        # Isso evita duplicatas quando o telefone varia (999152039 vs 99152039)
        conversa_existente = None
        if telefone_normalizado:
            # Buscar todos os contatos com telefone similar
            contatos_similares = Contato.objects.filter(
                criado_por=contato.criado_por
            ).exclude(telefone__isnull=True).exclude(telefone='')
            
            # Filtrar por telefone normalizado
            for c in contatos_similares:
                telefone_c = re.sub(r'\D', '', c.telefone) if c.telefone else ''
                # Comparar últimos 10 ou 11 dígitos (ignora código do país)
                if telefone_c and telefone_normalizado:
                    tel_curto = telefone_normalizado[-11:]
                    tel_c_curto = telefone_c[-11:]
                    if tel_curto == tel_c_curto or tel_curto[-10:] == tel_c_curto[-10:]:
                        # Encontrou contato com telefone similar, buscar conversa ativa
                        conversa_existente = Conversa.objects.filter(
                            contato=c,
                            status__in=['entrada', 'atendimento']
                        ).first()
                        if conversa_existente:
                            break
        
        # Se não encontrou por telefone, buscar por contato_id direto
        if not conversa_existente:
            conversa_existente = Conversa.objects.filter(
                contato_id=contato_id,
                status__in=['entrada', 'atendimento']
            ).first()
        
        if conversa_existente:
            # Atualizar operador se necessário
            if operador and not conversa_existente.operador:
                conversa_existente.operador = operador
                conversa_existente.status = 'atendimento'
                conversa_existente.save()
            
            # Retornar conversa existente
            serializer = self.get_serializer(conversa_existente)
            return Response(
                {
                    "message": "Conversa já existe",
                    "conversa": serializer.data,
                    "created": False
                },
                status=status.HTTP_200_OK
            )
        
        # Se não existe, criar nova conversa
        # (contato já foi buscado acima)
        
        # Criar conversa
        conversa = Conversa.objects.create(
            contato=contato,
            operador=operador,
            status='atendimento',
            assunto=request.data.get('assunto', ''),
            origem=request.data.get('origem', 'site'),
            prioridade=request.data.get('prioridade', 'media')
        )
        
        # Serializar para retornar
        serializer = self.get_serializer(conversa)
        
        return Response(
            {
                "message": "Conversa criada com sucesso",
                "conversa": serializer.data,
                "created": True
            },
            status=status.HTTP_201_CREATED
        )


class ConversaDetailView(generics.RetrieveUpdateAPIView):
    """
    ✅ API: Detalha conversa com URLs locais nas interações
    """
    queryset = Conversa.objects.all().prefetch_related(
        'interacoes__operador__user'
    ).select_related('contato', 'operador__user')  # ✅ Otimizar queries
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Usar serializer apropriado baseado no método HTTP"""
        if self.request.method in ['PATCH', 'PUT']:
            from .serializers import ConversaUpdateSerializer
            return ConversaUpdateSerializer
        return ConversaDetailSerializer
    
    def get_serializer_context(self):
        """✅ GARANTIR request context para URLs completas"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def update(self, request, *args, **kwargs):
        """
        ✅ Sobrescrever update para retornar dados completos após PATCH/PUT
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Usar ConversaUpdateSerializer para validar e salvar
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # ✅ RETORNAR dados completos usando ConversaDetailSerializer
        detail_serializer = ConversaDetailSerializer(instance, context=self.get_serializer_context())
        return Response(detail_serializer.data)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_atendimento_humano(request, conversa_id):
    """
    🤖 Ativa/Desativa o atendimento humano (pausa o bot por 15 minutos)
    
    POST /conversas/<id>/atendimento-humano/
    Body:
    {
        "ativar": true  // true = ligar (15 min), false = desligar imediatamente
    }
    
    Resposta:
    {
        "success": true,
        "atendimento_humano": true,
        "atendimento_humano_ate": "2025-10-18T15:30:00Z",
        "mensagem": "Atendimento humano ativado por 15 minutos"
    }
    """
    from datetime import timedelta
    from tarefas.tasks import desativar_atendimento_humano
    
    try:
        conversa = Conversa.objects.get(id=conversa_id)
        ativar = request.data.get('ativar', True)
        
        if ativar:
            # ✅ ATIVAR: Bot pausado por 15 minutos
            conversa.atendimento_humano = True
            conversa.atendimento_humano_ate = timezone.now() + timedelta(minutes=15)
            conversa.save()
            
            desativar_atendimento_humano.apply_async(
                args=[conversa_id],
                countdown=15 * 60
            )
            
            return Response({
                'success': True,
                'atendimento_humano': True,
                'atendimento_humano_ate': conversa.atendimento_humano_ate.isoformat(),
                'mensagem': 'Atendimento humano ativado por 15 minutos'
            })
        else:
            # ❌ DESATIVAR: Bot volta imediatamente
            conversa.atendimento_humano = False
            conversa.atendimento_humano_ate = None
            conversa.save()
            
            return Response({
                'success': True,
                'atendimento_humano': False,
                'atendimento_humano_ate': None,
                'mensagem': 'Bot reativado manualmente'
            })
            
    except Conversa.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Conversa não encontrada'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


class InteracaoListView(generics.ListAPIView):
    """
    ✅ API: Lista interações com URLs locais
    """
    serializer_class = InteracaoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['remetente', 'tipo', 'conversa']
    search_fields = ['mensagem']
    ordering_fields = ['criado_em']
    ordering = ['-criado_em']
    
    def get_queryset(self):
        return Interacao.objects.select_related(
            'conversa__contato',
            'operador__user'
        )
    
    def get_serializer_context(self):
        """✅ GARANTIR request context para URLs completas"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
class BuscarMensagensView(generics.ListAPIView):
    """
    ✅ API: Busca mensagens com URLs locais
    """
    serializer_class = InteracaoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['mensagem', 'conversa__contato__nome', 'conversa__contato__telefone']
    filterset_fields = ['tipo', 'remetente']
    
    def get_queryset(self):
        queryset = Interacao.objects.select_related(
            'conversa__contato',
            'operador__user'
        ).order_by('-criado_em')
        
        # ✅ FILTROS adicionais
        conversa_id = self.request.query_params.get('conversa', None)
        if conversa_id:
            queryset = queryset.filter(conversa_id=conversa_id)
            
        data_inicio = self.request.query_params.get('data_inicio', None)
        if data_inicio:
            queryset = queryset.filter(criado_em__gte=data_inicio)
            
        data_fim = self.request.query_params.get('data_fim', None)
        if data_fim:
            queryset = queryset.filter(criado_em__lte=data_fim)
        
        return queryset
    
    def get_serializer_context(self):
        """✅ GARANTIR request context para URLs completas"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
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
@permission_classes([AllowAny])  # ✅ PERMITIR sem autenticação (setup inicial)
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
@permission_classes([AllowAny])  # ✅ PERMITIR sem autenticação (verificação pública)
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
        logger.info(f"📤 Recebendo requisição para enviar mensagem")
        
        # Extrair dados
        data = request.data or {}
        if not data and request.body:
            try:
                import json
                data = json.loads(request.body.decode('utf-8'))
            except:
                pass
        
        numero = data.get('numero', '').strip()
        mensagem = data.get('mensagem', '').strip()
        conversa_id = data.get('conversa_id')
        
        logger.info(f"� Campos - numero: '{numero}', mensagem: '{mensagem[:50] if mensagem else None}...', conversa_id: {conversa_id}")

        if not numero or not mensagem:
            logger.error(f"❌ Campos obrigatórios faltando")
            return Response({
                'success': False,
                'error': 'Campos obrigatórios: numero, mensagem'
            }, status=400)

        # ✅ ENVIAR VIA MESSAGE TRANSLATOR
        try:
            from message_translator.schemas import LoomieMessage
            from message_translator.router import enviar_mensagem_saida
            from message_translator.models import CanalConfig
            from message_translator.translators import get_translator
            
            # Buscar operador
            operador = get_user_operador(request.user)
            
            # Criar LoomieMessage com metadata do operador
            loomie_message = LoomieMessage(
                sender=f"system:crm:user_{request.user.id}",
                recipient=f"whatsapp:{numero}",
                channel_type='whatsapp',
                content_type='text',
                text=mensagem,
                metadata={
                    'operador_id': operador.id if operador else None,
                    'user_id': request.user.id,
                    'conversa_id': conversa_id
                }
            )
            
            # Buscar canal configurado
            canal = CanalConfig.objects.filter(
                tipo__in=['whatsapp', 'evo'],
                ativo=True,
                envia_saida=True
            ).first()
            
            if not canal:
                logger.error("❌ Nenhum canal WhatsApp configurado")
                return Response({
                    'success': False,
                    'error': 'Nenhum canal WhatsApp configurado para envio'
                }, status=404)
            
            # Traduzir para formato do canal
            translator = get_translator(canal.tipo)
            payload_canal = translator.from_loomie(loomie_message)
            
            # ✅ ENVIAR (isso já vai criar a Interação automaticamente)
            resultado = enviar_mensagem_saida(loomie_message, canal, payload_canal)
            
            if resultado['success']:
                # 🤖 Pegar estado do atendimento humano
                atendimento_humano_ativo = False
                atendimento_humano_ate = None
                
                if conversa_id:
                    try:
                        conversa = Conversa.objects.get(id=conversa_id)
                        atendimento_humano_ativo = conversa.atendimento_humano
                        atendimento_humano_ate = conversa.atendimento_humano_ate.isoformat() if conversa.atendimento_humano_ate else None
                    except Conversa.DoesNotExist:
                        pass
                
                logger.info(f"✅ Mensagem enviada com sucesso via Message Translator")
                
                return Response({
                    'success': True,
                    'message': 'Mensagem enviada com sucesso',
                    'whatsapp_id': resultado.get('external_id'),
                    'interacao_id': resultado.get('interacao_id'),  # ✅ NOVO
                    'atendimento_humano': atendimento_humano_ativo,
                    'atendimento_humano_ate': atendimento_humano_ate
                })
            else:
                logger.error(f"❌ Erro ao enviar via Message Translator: {resultado.get('error')}")
                return Response({
                    'success': False,
                    'error': resultado.get('error', 'Erro ao enviar mensagem')
                }, status=400)
        
        except Exception as translator_error:
            logger.error(f"❌ Erro no Message Translator: {translator_error}", exc_info=True)
            
            # FALLBACK: Tentar método antigo
            logger.warning("⚠️ Usando método de envio legado como fallback")
            resultado = enviar_mensagem_whatsapp(numero, mensagem)

            if resultado['success']:
                atendimento_humano_ativo = False
                atendimento_humano_ate = None
                
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
                        
                        conversa.atualizado_em = timezone.now()
                        conversa.save()
                        
                        atendimento_humano_ativo = conversa.atendimento_humano
                        atendimento_humano_ate = conversa.atendimento_humano_ate.isoformat() if conversa.atendimento_humano_ate else None
                        
                        logger.info("💾 Interação salva no CRM (método legado)")
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao salvar no CRM: {e}")

                return Response({
                    'success': True,
                    'message': 'Mensagem enviada com sucesso',
                    'data': resultado['data'],
                    'whatsapp_id': resultado.get('whatsapp_id'),
                    'status': resultado.get('status', 'pending'),
                    'atendimento_humano': atendimento_humano_ativo,
                    'atendimento_humano_ate': atendimento_humano_ate
                })
            else:
                return Response({
                    'success': False,
                    'error': resultado['error']
                }, status=400)

    except Exception as e:
        logger.error(f"Erro em enviar_mensagem_view: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }, status=500)

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

def processar_mensagem_media(message_data):
    """
    Processa mensagens e extrai informações para processamento unificado.
    Retorna: (texto_msg, tipo_msg, message_info, nome_arquivo, tamanho, duracao, mimetype, base64)
    """
    try:
        logger.info(f"🔍 Processando mensagem com chaves: {list(message_data.keys())}")
        base64_data = message_data.get('base64', '')
        
        # --- IMAGEM ---
        if msg := message_data.get('imageMessage'):
            caption = msg.get('caption', '')
            texto = f"Imagem enviada{': ' + caption if caption else ''}"
            filename = f"imagem_{uuid.uuid4().hex}.jpg"
            
            logger.info(f"📸 Imagem detectada - MediaKey: {'SIM' if msg.get('mediaKey') else 'NÃO'}, "
                       f"URL: {'SIM' if msg.get('url') else 'NÃO'}, Base64: {'SIM' if base64_data else 'NÃO'}")
            
            return (texto, 'imagem', msg, filename, msg.get('fileLength'), None, msg.get('mimetype'), base64_data)

        # --- ÁUDIO ---
        elif msg := message_data.get('audioMessage'):
            duration = msg.get('seconds', 0)
            texto = f"Áudio enviado ({duration}s)"
            filename = f"audio_{uuid.uuid4().hex}.ogg"
            
            logger.info(f"🎵 Áudio detectado - MediaKey: {'SIM' if msg.get('mediaKey') else 'NÃO'}, "
                       f"URL: {'SIM' if msg.get('url') else 'NÃO'}, Base64: {'SIM' if base64_data else 'NÃO'}")
            
            return (texto, 'audio', msg, filename, msg.get('fileLength'), duration, msg.get('mimetype'), base64_data)
        
        # --- VÍDEO ---
        elif msg := message_data.get('videoMessage'):
            caption = msg.get('caption', '')
            texto = f"Vídeo enviado{': ' + caption if caption else ''}"
            filename = f"video_{uuid.uuid4().hex}.mp4"
            
            logger.info(f"🎥 Vídeo detectado - MediaKey: {'SIM' if msg.get('mediaKey') else 'NÃO'}")
            
            return (texto, 'video', msg, filename, msg.get('fileLength'), None, msg.get('mimetype'), base64_data)
        
        # --- DOCUMENTO ---
        elif msg := message_data.get('documentMessage'):
            doc_name = msg.get('fileName', 'documento')
            texto = f"Documento enviado: {doc_name}"
            filename = f"doc_{uuid.uuid4().hex}_{doc_name}"
            
            logger.info(f"📄 Documento detectado: {doc_name}")
            
            return (texto, 'documento', msg, filename, msg.get('fileLength'), None, msg.get('mimetype'), base64_data)
        
        # --- STICKER ---
        elif msg := message_data.get('stickerMessage'):
            texto = "Sticker enviado"
            filename = f"sticker_{uuid.uuid4().hex}.webp"
            
            logger.info(f"🎨 Sticker detectado")
            
            return (texto, 'sticker', msg, filename, msg.get('fileLength'), None, msg.get('mimetype'), base64_data)
        
        # --- TEXTO ---
        elif text := message_data.get('conversation') or message_data.get('extendedTextMessage', {}).get('text'):
            logger.info(f"💬 Texto detectado: {text[:50]}...")
            return (text, 'texto', None, None, None, None, None, None)
        
        else:
            logger.warning(f"⚠️ Tipo de mensagem não reconhecido: {list(message_data.keys())}")
            return ("[Mensagem não suportada]", 'outros', None, None, None, None, None, None)

    except Exception as e:
        logger.error(f"💥 Erro ao processar mensagem: {str(e)}", exc_info=True)
        return ("[Erro ao processar mensagem]", 'erro', None, None, None, None, None, None)


# ============================================================================
# WEBHOOKS REMOVIDOS - Agora usando Message Translator
# ============================================================================
# 
# Os webhooks evolution_webhook() e debug_webhook() foram removidos.
# Todas as mensagens agora são processadas pelo Message Translator:
# 
# Endpoint atual: /translator/evolution-webhook/
# Código: backend/message_translator/views.py
# 
# Vantagens:
# - Suporte multi-canal (WhatsApp, Instagram, Telegram, etc)
# - Código reutilizável e modular
# - Processamento de mídias unificado
# - Fácil adicionar novos canais
# 
# ============================================================================


@api_view(['GET'])
def atendimento_stats(request):
    agora = timezone.now()
    hoje = agora.date()

    total_conversas = Conversa.objects.count()
    aguardando = Conversa.objects.filter(status='entrada').count()
    em_andamento = Conversa.objects.filter(status='atendimento').count()
    resolvidas_hoje = Conversa.objects.filter(finalizada_em__date=hoje).count()

    primeiras = (
        Interacao.objects
        .values('conversa')
        .annotate(
            primeira_msg=Min('criado_em'),
            primeira_resposta=Min('criado_em', filter=Q(operador__isnull=False))
        )
    )

    tempos_resposta = []
    for p in primeiras:
        if p['primeira_msg'] and p['primeira_resposta']:
            delta = (p['primeira_resposta'] - p['primeira_msg']).total_seconds() / 60
            tempos_resposta.append(delta)

    tempo_resposta_medio_min = round(sum(tempos_resposta) / len(tempos_resposta), 2) if tempos_resposta else 0
    tempo_espera_max_min = round(max(tempos_resposta), 2) if tempos_resposta else 0

    operadores = Operador.objects.filter(
        user__id__in=get_ids_visiveis(request.user)
    )
    operadores_online = operadores.filter(status='online').count() if hasattr(Operador, 'status') else 0

    operadores_perf = []
    for op in operadores:
        conversas_ativas = Conversa.objects.filter(operador=op, status='atendimento').count()
        conversas_resolvidas = Conversa.objects.filter(operador=op, status='finalizada').count()

        respostas = Interacao.objects.filter(operador=op)
        medias = []
        for r in respostas:
            msg_anterior = (
                Interacao.objects
                .filter(conversa=r.conversa, criado_em__lt=r.criado_em, operador__isnull=True)
                .order_by('-criado_em')
                .first()
            )
            if msg_anterior:
                diff = (r.criado_em - msg_anterior.criado_em).total_seconds() / 60
                medias.append(diff)

        tempo_medio_min = round(sum(medias) / len(medias), 2) if medias else 0

        nome = f"{op.user.first_name} {op.user.last_name}"

        operadores_perf.append({
            "id": op.id,
            "nome": nome,
            "conversas_ativas": conversas_ativas,
            "conversas_resolvidas": conversas_resolvidas,
            "tempo_medio_min": tempo_medio_min,
            "status": getattr(op, "status", "online")
        })

    distrib = Conversa.objects.values('status').annotate(total=Count('id'))
    distrib_status = {
        'entrada': next((d['total'] for d in distrib if d['status'] == 'entrada'), 0),
        'atendimento': next((d['total'] for d in distrib if d['status'] == 'atendimento'), 0),
        'resolvida': next((d['total'] for d in distrib if d['status'] == 'finalizada'), 0),
    }

    interacoes = (
        Interacao.objects
        .filter(criado_em__date=hoje)
        .annotate(hora=F('criado_em__hour'))
        .values('hora')
        .annotate(conversas=Count('id'))
        .order_by('hora')
    )
    atividade_por_hora = [
        {"hora": f"{i['hora']:02d}:00", "conversas": i['conversas']}
        for i in interacoes
    ]

    taxa_resolucao_percent = (
        round((distrib_status['resolvida'] / total_conversas) * 100, 2)
        if total_conversas else 0
    )
    pico = max(atividade_por_hora, key=lambda x: x['conversas'], default={"hora": "00:00", "conversas": 0})

    data = {
        "conversas_totais": total_conversas,
        "conversas_aguardando": aguardando,
        "conversas_em_andamento": em_andamento,
        "conversas_resolvidas_hoje": resolvidas_hoje,
        "tempo_resposta_medio_min": tempo_resposta_medio_min,
        "tempo_espera_max_min": tempo_espera_max_min,
        "operadores_online": operadores_online,
        "taxa_resolucao_percent": taxa_resolucao_percent,
        "pico_horario": pico,
        "distribuicao_status": distrib_status,
        "operadores_performance": operadores_perf,
        "atividade_por_hora": atividade_por_hora,
    }

    return Response(data)