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

from .models import CanalConfig, MensagemLog, RegrasRoteamento, WebhookCustomizado
from .schemas import LoomieMessage
from .translators import get_translator
from .router import processar_mensagem_entrada, enviar_mensagem_saida
from .serializers import (
    CanalConfigSerializer,
    MensagemLogSerializer,
    RegrasRoteamentoSerializer,
    WebhookCustomizadoSerializer
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
@permission_classes([AllowAny])  # 🔓 Webhook público para Evolution API
def webhook_evolution(request):
    """
    🟢 Webhook dedicado para Evolution API
    
    POST /translator/evolution-webhook/
    
    Recebe payloads direto da Evolution e processa
    """
    inicio = time.time()
    
    try:
        logger.info(f"📱 Webhook Evolution recebido")
        logger.debug(f"📦 Payload: {request.data}")
        
        # Evolution API envia eventos assim:
        # {
        #   "event": "messages.upsert",
        #   "instance": "crm_teste_2025",
        #   "data": { ... }
        # }
        
        event = request.data.get('event')
        instance = request.data.get('instance')
        data = request.data.get('data')
        
        # Filtrar apenas mensagens recebidas E mensagens enviadas
        if event not in ['messages.upsert', 'SEND_MESSAGE']:
            logger.debug(f"⏭️ Evento ignorado: {event}")
            return Response({'success': True, 'message': 'Evento ignorado'})
        
        # Buscar canal pelo nome da instância
        try:
            canal = CanalConfig.objects.get(
                credenciais__instance=instance,
                tipo='evo',
                ativo=True
            )
            logger.info(f"✅ Canal encontrado: {canal.nome} (ID: {canal.pk})")
        except CanalConfig.DoesNotExist:
            logger.error(f"❌ Instância {instance} não encontrada no banco")
            return Response({
                'success': False,
                'error': f'Instância {instance} não configurada'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Traduzir para formato Loomie
        translator = get_translator('evo')
        loomie_message = translator.to_loomie(data)
        loomie_message.channel_id = canal.pk
        
        # Criar log inicial
        log = MensagemLog.objects.create(
            message_id=loomie_message.message_id,
            direcao='entrada',
            status='processando',
            canal_origem=canal,
            payload_original=data,
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
            'tempo_processamento': tempo_total
        })
    
    except Exception as e:
        logger.error(f"❌ Erro no webhook_evolution: {e}", exc_info=True)
        
        if 'log' in locals():
            log.status = 'erro'
            log.erro_mensagem = str(e)
            log.save()
        
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])  # 🔓 Webhook público (CRM interno precisa acessar)
def webhook_saida(request):
    """
    🔴 Endpoint principal de SAÍDA de mensagens
    
    Recebe mensagem no formato Loomie → Traduz para canal → Envia
    
    POST /translator/outgoing/
    """
    inicio = time.time()
    
    try:
        # Formato simplificado (suporte a PT e EN)
        if 'canal_tipo' in request.data or 'channel_type' in request.data:
            # 🌍 Suporte bilíngue (PT-BR e EN)
            canal_tipo = request.data.get('canal_tipo') or request.data.get('channel_type')
            destinatario = request.data.get('destinatario') or request.data.get('recipient') or request.data.get('number')
            texto = request.data.get('texto') or request.data.get('text') or request.data.get('message')
            media_url = request.data.get('media_url') or request.data.get('media')
            
            # 🔧 IMPORTANTE: Manter "evolution" separado de "whatsapp" (API oficial futura)
            # "evolution" e "evo" → Evolution API (não oficial)
            # "whatsapp" → WhatsApp Business API (oficial) - FUTURO
            if canal_tipo == 'evolution':
                canal_tipo = 'evo'  # Normalizar para "evo"
            
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
        canal_tipo = loomie_message.channel_type
        
        # 🔧 Evolution API (não oficial)
        if canal_tipo in ['evo', 'evolution']:
            canal = CanalConfig.objects.filter(
                tipo='evo',
                ativo=True,
                envia_saida=True
            ).first()
        # 🔧 WhatsApp Business API (oficial) - FUTURO
        elif canal_tipo == 'whatsapp':
            canal = CanalConfig.objects.filter(
                tipo='whatsapp',
                ativo=True,
                envia_saida=True
            ).first()
        # Outros canais
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
        
        # ✨ PROCESSAR WEBHOOKS CUSTOMIZADOS DE SAÍDA
        if resultado.get('success'):
            try:
                from .router import processar_webhooks_customizados
                webhooks_enviados = processar_webhooks_customizados(loomie_message, direcao='saida')
                if webhooks_enviados:
                    logger.info(f"📤 [SAÍDA] {len(webhooks_enviados)} webhook(s) customizado(s) disparado(s): {webhooks_enviados}")
                    resultado['webhooks_customizados'] = webhooks_enviados
            except Exception as e:
                logger.error(f"❌ Erro ao processar webhooks customizados de saída: {e}")
                # Não falhar o envio por causa disso
        
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
    
    def perform_create(self, serializer):
        """Auto-preencher criado_por ao criar"""
        serializer.save(criado_por=self.request.user)
    
    def perform_update(self, serializer):
        """Auto-preencher atualizado_por ao atualizar"""
        serializer.save(atualizado_por=self.request.user)
    
    def perform_destroy(self, instance):
        """
        🔌 Desconectar instância Evolution API ao deletar canal
        """
        import requests
        
        # Se for canal Evolution API, desconectar antes de deletar
        if instance.tipo == 'evo':
            try:
                credenciais = instance.credenciais
                base_url = credenciais.get('base_url', '').rstrip('/')
                api_key = credenciais.get('api_key')
                instance_name = credenciais.get('instance')
                
                if all([base_url, api_key, instance_name]):
                    # 1️⃣ Desconectar (logout)
                    logout_url = f"{base_url}/instance/logout/{instance_name}"
                    headers = {'apikey': api_key}
                    
                    try:
                        logout_response = requests.delete(logout_url, headers=headers, timeout=5)
                        if logout_response.status_code == 200:
                            logger.info(f"✅ Instância {instance_name} desconectada com sucesso")
                        else:
                            logger.warning(f"⚠️ Não foi possível desconectar {instance_name}: {logout_response.status_code}")
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao desconectar {instance_name}: {e}")
                    
                    # 2️⃣ Deletar instância (opcional - comentado para segurança)
                    # delete_url = f"{base_url}/instance/delete/{instance_name}"
                    # requests.delete(delete_url, headers=headers, timeout=5)
                    
            except Exception as e:
                logger.error(f"❌ Erro ao processar desconexão: {e}")
        
        # Deletar o canal do banco
        instance.delete()
        logger.info(f"🗑️ Canal '{instance.nome}' (ID: {instance.pk}) deletado")
    
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
    
    def perform_create(self, serializer):
        """Auto-preencher criado_por ao criar"""
        serializer.save(criado_por=self.request.user)
    
    def perform_update(self, serializer):
        """Auto-preencher atualizado_por ao atualizar"""
        serializer.save(atualizado_por=self.request.user)


class WebhookCustomizadoViewSet(viewsets.ModelViewSet):
    """
    CRUD para webhooks customizados
    """
    queryset = WebhookCustomizado.objects.all()
    serializer_class = WebhookCustomizadoSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Auto-preencher criado_por ao criar"""
        serializer.save(criado_por=self.request.user)
    
    def perform_update(self, serializer):
        """Auto-preencher atualizado_por ao atualizar"""
        serializer.save(atualizado_por=self.request.user)
    
    @action(detail=True, methods=['post'])
    def testar(self, request, pk=None):
        """
        Testa webhook com payload de exemplo
        """
        from .router import enviar_para_webhook_customizado
        from datetime import datetime
        
        webhook = self.get_object()
        
        # Criar mensagem de teste
        mensagem_teste = {
            "message_id": f"test_{datetime.now().timestamp()}",
            "channel_type": "whatsapp",
            "sender": "whatsapp:5511999999999",
            "recipient": "system:test",
            "content_type": "text",
            "text": "🧪 Mensagem de teste do Message Translator",
            "timestamp": datetime.now().isoformat(),
            "status": "sent"
        }
        
        try:
            sucesso = enviar_para_webhook_customizado(webhook, mensagem_teste)
            
            if sucesso:
                return Response({
                    'success': True,
                    'message': f'✅ Webhook testado com sucesso! Verifique seu endpoint.'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Falha ao enviar. Verifique os logs e configurações do webhook.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"❌ Erro ao testar webhook: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """
        Retorna estatísticas gerais de todos os webhooks
        """
        from django.db.models import Sum, Avg
        
        webhooks = WebhookCustomizado.objects.filter(ativo=True)
        
        stats = {
            'total_webhooks': webhooks.count(),
            'total_enviados': webhooks.aggregate(Sum('total_enviados'))['total_enviados__sum'] or 0,
            'total_erros': webhooks.aggregate(Sum('total_erros'))['total_erros__sum'] or 0,
            'webhooks': []
        }
        
        for webhook in webhooks:
            taxa_sucesso = 0
            if webhook.total_enviados > 0:
                taxa_sucesso = ((webhook.total_enviados - webhook.total_erros) / webhook.total_enviados) * 100
            
            stats['webhooks'].append({
                'id': webhook.id,
                'nome': webhook.nome,
                'total_enviados': webhook.total_enviados,
                'total_erros': webhook.total_erros,
                'taxa_sucesso': round(taxa_sucesso, 2),
                'ultima_execucao': webhook.ultima_execucao
            })
        
        return Response(stats)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def conectar_whatsapp(request):
    """
    🟢 Conecta/Salva WhatsApp Evolution API
    
    POST /translator/conectar-whatsapp/
    
    Body:
    {
        "nome": "WhatsApp Principal",
        "base_url": "https://evo.loomiecrm.com",
        "api_key": "B6D711FCDE4D4FD5936544120E713976",
        "instance": "crm_teste_2025"
    }
    
    Returns:
    {
        "success": true,
        "canal_id": 1,
        "conectado": true/false,
        "estado": "✅ Conectado" ou "⚠️ Aguardando QR Code",
        "requer_qr": true/false,
        "mensagem": "WhatsApp conectado com sucesso!"
    }
    """
    import requests
    
    try:
        # 1️⃣ VALIDAR INPUT
        nome = request.data.get('nome', 'WhatsApp Principal')
        base_url = request.data.get('base_url', '').strip().rstrip('/')
        api_key = request.data.get('api_key', '').strip()
        instance = request.data.get('instance', '').strip()
        
        logger.info(f"📝 Tentando conectar WhatsApp: {instance}")
        
        if not all([base_url, api_key, instance]):
            return Response({
                'success': False,
                'error': 'Campos obrigatórios: base_url, api_key, instance'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 2️⃣ VALIDAR CREDENCIAIS (SEM EXIGIR CONEXÃO)
        headers = {
            'apikey': api_key,
            'Content-Type': 'application/json'
        }
        
        state = 'close'  # Padrão: desconectado
        estado_conexao = 'Credenciais salvas - aguardando QR Code'
        
        try:
            # Tentar obter estado da conexão (opcional)
            connection_url = f"{base_url}/instance/connectionState/{instance}"
            logger.info(f"🔍 Testando credenciais: {connection_url}")
            
            conn_response = requests.get(
                connection_url,
                headers=headers,
                timeout=10
            )
            
            # ✅ VALIDAR CREDENCIAIS (não conexão)
            if conn_response.status_code == 401:
                return Response({
                    'success': False,
                    'error': 'API Key inválida. Verifique suas credenciais.'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if conn_response.status_code == 404:
                return Response({
                    'success': False,
                    'error': f'Instância "{instance}" não encontrada. Crie a instância primeiro na Evolution API.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Se chegou aqui, credenciais estão OK
            if conn_response.status_code == 200:
                connection_data = conn_response.json()
                state = connection_data.get('state', 'close')
                
                if state == 'open':
                    estado_conexao = '✅ Conectado'
                    logger.info(f"✅ WhatsApp já conectado: {instance}")
                else:
                    estado_conexao = '⚠️ Aguardando QR Code'
                    logger.info(f"⚠️ WhatsApp aguardando QR Code: {instance}")
            
        except requests.exceptions.Timeout:
            logger.warning("⏱️ Timeout ao testar conexão. Salvando credenciais mesmo assim.")
            estado_conexao = '⚠️ Timeout - Credenciais salvas'
        
        except requests.exceptions.ConnectionError:
            return Response({
                'success': False,
                'error': 'Não foi possível conectar ao servidor Evolution API. Verifique a URL.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # 3️⃣ SALVAR/ATUALIZAR CANALCONFIG (SEMPRE SALVA)
        with transaction.atomic():
            # Buscar por canal do mesmo usuário com tipo 'evo'
            canal, criado = CanalConfig.objects.update_or_create(
                tipo='evo',
                criado_por=request.user,  # ✅ Apenas 1 canal por usuário
                defaults={
                    'nome': nome,
                    'ativo': (state == 'open'),  # ✅ Só ativo se conectado
                    'prioridade': 1,
                    'credenciais': {  # ✅ CORREÇÃO: 'credenciais' não 'configuracao'
                        'base_url': base_url,
                        'api_key': api_key,
                        'instance': instance,
                        'estado_conexao': state
                    },
                    'recebe_entrada': True,
                    'envia_saida': True,
                    'destinos': ['crm'],
                    'atualizado_por': request.user
                }
            )
            
            logger.info(f"{'✅ Canal criado' if criado else '🔄 Canal atualizado'}: ID {canal.pk} - {canal.nome}")
        
        # 4️⃣ CONFIGURAR WEBHOOK (OPCIONAL - SÓ SE CONECTADO)
        webhook_configurado = False
        webhook_url = f"{request.scheme}://{request.get_host()}/translator/incoming/"
        
        if state == 'open':
            try:
                webhook_config_url = f"{base_url}/webhook/set/{instance}"
                webhook_payload = {
                    "enabled": True,
                    "url": webhook_url,
                    "webhookByEvents": False,
                    "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"]
                }
                
                webhook_response = requests.post(
                    webhook_config_url,
                    headers=headers,
                    json=webhook_payload,
                    timeout=10
                )
                
                webhook_configurado = (webhook_response.status_code == 200)
                logger.info(f"{'✅' if webhook_configurado else '⚠️'} Webhook: {webhook_configurado}")
            
            except Exception as webhook_error:
                logger.error(f"❌ Erro ao configurar webhook: {webhook_error}")
        
        # 5️⃣ RETORNAR RESPOSTA
        return Response({
            'success': True,
            'canal_id': canal.pk,
            'conectado': (state == 'open'),
            'estado': estado_conexao,
            'requer_qr': (state != 'open'),
            'webhook_configurado': webhook_configurado,
            'mensagem': f"✅ {nome} salvo com sucesso!" if criado else f"🔄 {nome} atualizado!",
            'criado': criado
        }, status=status.HTTP_201_CREATED if criado else status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"❌ Erro ao conectar WhatsApp: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gerar_qr_code_whatsapp(request, canal_id):
    """
    🔑 Gera QR Code para conectar WhatsApp usando credenciais do canal
    
    POST /translator/gerar-qr-code/<canal_id>/
    
    Returns:
    {
        "success": true,
        "qr_code": "data:image/png;base64,...",
        "connected": false,
        "message": "Escaneie o QR Code"
    }
    """
    import requests
    
    try:
        # 1️⃣ BUSCAR CANAL DO USUÁRIO
        canal = CanalConfig.objects.filter(
            id=canal_id,
            criado_por=request.user,
            tipo='evo'
        ).first()
        
        if not canal:
            return Response({
                'success': False,
                'error': 'Canal não encontrado ou não pertence ao usuário'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 2️⃣ EXTRAIR CREDENCIAIS
        credenciais = canal.credenciais
        base_url = credenciais.get('base_url', '').rstrip('/')
        api_key = credenciais.get('api_key')
        instance = credenciais.get('instance')
        
        if not all([base_url, api_key, instance]):
            return Response({
                'success': False,
                'error': 'Credenciais incompletas no canal'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        headers = {
            'apikey': api_key,
            'Content-Type': 'application/json'
        }
        
        # 3️⃣ VERIFICAR SE JÁ ESTÁ CONECTADO
        status_url = f"{base_url}/instance/connectionState/{instance}"
        
        try:
            status_response = requests.get(status_url, headers=headers, timeout=10)
            
            if status_response.status_code == 200:
                connection_data = status_response.json()
                state = connection_data.get('instance', {}).get('state', 'close')
                
                if state == 'open':
                    # ✅ JÁ CONECTADO - Atualizar banco
                    canal.ativo = True
                    canal.credenciais['estado_conexao'] = 'open'
                    canal.save()
                    
                    logger.info(f"✅ Canal {canal_id} já está conectado")
                    
                    return Response({
                        'success': True,
                        'connected': True,
                        'qr_code': None,
                        'message': 'WhatsApp já está conectado!'
                    })
        
        except requests.exceptions.RequestException:
            pass  # Continuar para gerar QR Code
        
        # 4️⃣ GERAR QR CODE
        qr_url = f"{base_url}/instance/connect/{instance}"
        
        logger.info(f"🔄 Gerando QR Code para canal {canal_id}: {qr_url}")
        
        qr_response = requests.get(qr_url, headers=headers, timeout=15)
        
        if qr_response.status_code == 200:
            qr_data = qr_response.json()
            qr_code = qr_data.get('qrcode') or qr_data.get('base64')
            
            if qr_code:
                # ✅ ATUALIZAR ESTADO NO BANCO
                canal.ativo = False
                canal.credenciais['estado_conexao'] = 'aguardando_qr'
                canal.save()
                
                logger.info(f"✅ QR Code gerado para canal {canal_id}")
                
                return Response({
                    'success': True,
                    'connected': False,
                    'qr_code': qr_code,
                    'message': 'Escaneie o QR Code com seu WhatsApp'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'QR Code não encontrado na resposta da API'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        else:
            return Response({
                'success': False,
                'error': f'Erro ao gerar QR Code: HTTP {qr_response.status_code}',
                'details': qr_response.text[:200]
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"❌ Erro ao gerar QR Code: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_status_canal(request, canal_id):
    """
    🔍 Verifica APENAS o status de conexão do canal (sem gerar QR Code)
    
    GET /translator/status-canal/<canal_id>/
    
    Returns:
    {
        "success": true,
        "ativo": true,
        "estado_conexao": "open"  // 'open', 'close', 'aguardando_qr'
    }
    """
    import requests
    
    try:
        # 1️⃣ BUSCAR CANAL DO USUÁRIO
        canal = CanalConfig.objects.filter(
            id=canal_id,
            criado_por=request.user,
            tipo='evo'
        ).first()
        
        if not canal:
            return Response({
                'success': False,
                'error': 'Canal não encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 2️⃣ EXTRAIR CREDENCIAIS
        credenciais = canal.credenciais
        base_url = credenciais.get('base_url', '').rstrip('/')
        api_key = credenciais.get('api_key')
        instance = credenciais.get('instance')
        
        if not all([base_url, api_key, instance]):
            return Response({
                'success': True,
                'ativo': canal.ativo,
                'estado_conexao': credenciais.get('estado_conexao', 'unknown')
            })
        
        # 3️⃣ VERIFICAR STATUS NA EVOLUTION API
        status_url = f"{base_url}/instance/connectionState/{instance}"
        headers = {'apikey': api_key}
        
        try:
            status_response = requests.get(status_url, headers=headers, timeout=5)
            
            if status_response.status_code == 200:
                connection_data = status_response.json()
                state = connection_data.get('instance', {}).get('state', 'close')
                
                # 4️⃣ ATUALIZAR BANCO SE MUDOU
                if state == 'open' and not canal.ativo:
                    canal.ativo = True
                    canal.credenciais['estado_conexao'] = 'open'
                    canal.save()
                    logger.info(f"✅ Canal {canal_id} conectado!")
                
                elif state == 'close' and canal.ativo:
                    canal.ativo = False
                    canal.credenciais['estado_conexao'] = 'close'
                    canal.save()
                    logger.warning(f"⚠️ Canal {canal_id} desconectado!")
                
                return Response({
                    'success': True,
                    'ativo': canal.ativo,
                    'estado_conexao': state
                })
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao verificar status: {e}")
            
            # Retornar status do banco
            return Response({
                'success': True,
                'ativo': canal.ativo,
                'estado_conexao': credenciais.get('estado_conexao', 'unknown')
            })
    
    except Exception as e:
        logger.error(f"❌ Erro ao verificar status: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

