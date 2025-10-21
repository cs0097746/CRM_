"""
Views/API do Message Translator
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import transaction
import time
import logging

from .models import CanalConfig, MensagemLog, RegrasRoteamento
from .schemas import LoomieMessage
from .translators import get_translator
from .router import processar_mensagem_entrada, enviar_mensagem_saida
from .serializers import (
    CanalConfigSerializer,
    MensagemLogSerializer,
    RegrasRoteamentoSerializer
)

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])  # 🔓 Webhook público (Evolution API precisa acessar)
def webhook_entrada(request):
    """
    🔵 Endpoint principal de ENTRADA de mensagens
    
    Recebe mensagem de qualquer canal → Formata para Loomie → Roteia para destinos
    
    POST /translator/incoming/
    
    Body:
    {
        "canal_tipo": "whatsapp",  // ou "telegram", "evo", etc
        "canal_id": 1,              // ID do CanalConfig (opcional)
        "payload": { ... }          // Payload original do canal
    }
    """
    inicio = time.time()
    
    try:
        canal_tipo = request.data.get('canal_tipo')
        canal_id = request.data.get('canal_id')
        payload = request.data.get('payload')
        
        if not canal_tipo or not payload:
            return Response({
                'success': False,
                'error': 'canal_tipo e payload são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar config do canal
        canal = None
        if canal_id:
            try:
                canal = CanalConfig.objects.get(id=canal_id, ativo=True)
            except CanalConfig.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Canal {canal_id} não encontrado ou inativo'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Traduzir para formato Loomie
        translator = get_translator(canal_tipo)
        loomie_message = translator.to_loomie(payload)
        
        if canal:
            loomie_message.channel_id = canal.id
        
        # Criar log inicial
        log = MensagemLog.objects.create(
            message_id=loomie_message.message_id,
            direcao='entrada',
            status='processando',
            canal_origem=canal,
            payload_original=payload,
            payload_loomie=loomie_message.to_dict(),
            remetente=loomie_message.sender,
            destinatario=loomie_message.recipient
        )
        
        # Processar e rotear
        resultado = processar_mensagem_entrada(loomie_message, canal)
        
        # Atualizar log
        tempo_total = time.time() - inicio
        log.status = 'enviada'
        log.processado_em = timezone.now()
        log.tempo_processamento = tempo_total
        log.save()
        
        logger.info(f"✅ Mensagem {loomie_message.message_id} processada em {tempo_total:.2f}s")
        
        return Response({
            'success': True,
            'message_id': loomie_message.message_id,
            'tempo_processamento': tempo_total,
            'destinos_enviados': resultado.get('destinos_enviados', [])
        })
    
    except Exception as e:
        logger.error(f"❌ Erro no webhook_entrada: {e}", exc_info=True)
        
        if 'log' in locals():
            log.status = 'erro'
            log.erro_mensagem = str(e)
            log.save()
        
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])  # 🔓 Webhook público (n8n/CRM precisam acessar)
def webhook_saida(request):
    """
    🔴 Endpoint principal de SAÍDA de mensagens
    
    Recebe mensagem no formato Loomie → Traduz para canal → Envia
    
    POST /translator/outgoing/
    """
    inicio = time.time()
    
    try:
        # Formato simplificado
        if 'canal_tipo' in request.data:
            canal_tipo = request.data.get('canal_tipo')
            destinatario = request.data.get('destinatario')
            texto = request.data.get('texto')
            media_url = request.data.get('media_url')
            
            # Criar LoomieMessage
            loomie_message = LoomieMessage(
                sender="system:crm",
                recipient=f"{canal_tipo}:{destinatario}",
                channel_type=canal_tipo,
                content_type='text',
                text=texto
            )
            
            if media_url:
                loomie_message.content_type = 'media'
                loomie_message.add_media(tipo='image', url=media_url)
        
        # Formato Loomie completo
        else:
            loomie_message = LoomieMessage.from_dict(request.data)
        
        # Buscar canal configurado
        # 🔧 WhatsApp pode ser tipo 'whatsapp' ou 'evo' (Evolution API)
        canal_tipo = loomie_message.channel_type
        if canal_tipo == 'whatsapp':
            # Buscar canal whatsapp OU evo
            canal = CanalConfig.objects.filter(
                tipo__in=['whatsapp', 'evo'],
                ativo=True,
                envia_saida=True
            ).first()
        else:
            canal = CanalConfig.objects.filter(
                tipo=canal_tipo,
                ativo=True,
                envia_saida=True
            ).first()
        
        if not canal:
            return Response({
                'success': False,
                'error': f'Nenhum canal ativo do tipo {loomie_message.channel_type} configurado para envio'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Traduzir para formato do canal
        translator = get_translator(loomie_message.channel_type)
        payload_canal = translator.from_loomie(loomie_message)
        
        # Criar log
        log = MensagemLog.objects.create(
            message_id=loomie_message.message_id,
            direcao='saida',
            status='processando',
            canal_destino=canal,
            payload_loomie=loomie_message.to_dict(),
            payload_original=payload_canal,
            remetente=loomie_message.sender,
            destinatario=loomie_message.recipient
        )
        
        # Enviar
        resultado = enviar_mensagem_saida(loomie_message, canal, payload_canal)
        
        # Atualizar log
        tempo_total = time.time() - inicio
        log.status = 'enviada' if resultado.get('success') else 'erro'
        log.processado_em = timezone.now()
        log.tempo_processamento = tempo_total
        if not resultado.get('success'):
            log.erro_mensagem = resultado.get('error', '')
        log.save()
        
        return Response({
            'success': resultado.get('success'),
            'message_id': loomie_message.message_id,
            'tempo_processamento': tempo_total,
            'external_id': resultado.get('external_id')
        })
    
    except Exception as e:
        logger.error(f"❌ Erro no webhook_saida: {e}", exc_info=True)
        
        if 'log' in locals():
            log.status = 'erro'
            log.erro_mensagem = str(e)
            log.save()
        
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ViewSets para CRUD
class CanalConfigViewSet(viewsets.ModelViewSet):
    """
    CRUD para configuração de canais
    """
    queryset = CanalConfig.objects.all()
    serializer_class = CanalConfigSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def testar_conexao(self, request, pk=None):
        """
        Testa conexão com o canal
        """
        canal = self.get_object()
        
        try:
            # TODO: Implementar teste real de conexão
            return Response({
                'success': True,
                'message': f'Conexão com {canal.nome} OK ✅'
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class MensagemLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Visualização de logs de mensagens (somente leitura)
    """
    queryset = MensagemLog.objects.all()
    serializer_class = MensagemLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros
        direcao = self.request.query_params.get('direcao')
        status_param = self.request.query_params.get('status')
        canal_id = self.request.query_params.get('canal_id')
        
        if direcao:
            queryset = queryset.filter(direcao=direcao)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if canal_id:
            queryset = queryset.filter(
                canal_origem_id=canal_id
            ) | queryset.filter(
                canal_destino_id=canal_id
            )
        
        return queryset


class RegrasRoteamentoViewSet(viewsets.ModelViewSet):
    """
    CRUD para regras de roteamento
    """
    queryset = RegrasRoteamento.objects.all()
    serializer_class = RegrasRoteamentoSerializer
    permission_classes = [IsAuthenticated]
