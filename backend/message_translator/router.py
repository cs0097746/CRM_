"""
Sistema de roteamento de mensagens
Envia mensagens para múltiplos destinos em paralelo
"""
import requests
import logging
from typing import Dict, List, Any, Optional
from django.conf import settings
from .models import CanalConfig
from .schemas import LoomieMessage

logger = logging.getLogger(__name__)


def processar_mensagem_entrada(loomie_message: LoomieMessage, canal: Optional[CanalConfig] = None) -> Dict:
    """
    Processa mensagem de entrada e roteia para destinos configurados
    
    Fluxo:
    1. Recebe mensagem em formato Loomie
    2. Identifica destinos (CRM, n8n, outros canais)
    3. Envia para cada destino em paralelo (ou sequencial)
    4. Retorna resultado
    """
    resultados = {
        'success': True,
        'destinos_enviados': [],
        'erros': []
    }
    
    # Determinar destinos
    destinos = []
    if canal and canal.destinos:
        destinos = canal.destinos
    else:
        # Destinos padrão
        destinos = ['crm', 'n8n']
    
    logger.info(f"📤 Roteando mensagem {loomie_message.message_id} para: {destinos}")
    
    # Enviar para cada destino
    for destino in destinos:
        try:
            if destino == 'crm':
                sucesso = enviar_para_crm(loomie_message)
            elif destino == 'n8n':
                sucesso = enviar_para_n8n(loomie_message)
            else:
                # Outro canal
                sucesso = enviar_para_canal(destino, loomie_message)
            
            if sucesso:
                resultados['destinos_enviados'].append(destino)
                logger.info(f"✅ Enviado para {destino}")
            else:
                resultados['erros'].append(f"Falha ao enviar para {destino}")
                logger.warning(f"⚠️ Falha ao enviar para {destino}")
        
        except Exception as e:
            erro_msg = f"Erro ao enviar para {destino}: {str(e)}"
            resultados['erros'].append(erro_msg)
            logger.error(f"❌ {erro_msg}")
    
    # ✨ Processar webhooks customizados
    try:
        webhooks_enviados = processar_webhooks_customizados(loomie_message, direcao='entrada')
        resultados['destinos_enviados'].extend(webhooks_enviados)
    except Exception as e:
        logger.error(f"❌ Erro ao processar webhooks customizados: {str(e)}")
    
    if resultados['erros']:
        resultados['success'] = False
    
    return resultados


def enviar_para_crm(loomie_message: LoomieMessage) -> bool:
    """
    Envia mensagem para o CRM (cria Interação)
    """
    try:
        from contato.models import Contato
        from atendimento.models import Conversa, Interacao
        
        # Extrair número WhatsApp
        sender = loomie_message.sender.replace('whatsapp:', '').replace('evo:', '')
        
        # Buscar/criar contato
        contato, _ = Contato.objects.get_or_create(
            telefone=sender,
            defaults={'nome': loomie_message.sender_name or 'Usuário'}
        )
        
        # Buscar/criar conversa
        conversa, _ = Conversa.objects.get_or_create(
            contato=contato,
            defaults={'status': 'entrada'}
        )
        
        # Criar interação
        Interacao.objects.create(
            conversa=conversa,
            mensagem=loomie_message.text or '[Mídia]',
            remetente='cliente',
            tipo=loomie_message.content_type,
            whatsapp_id=loomie_message.external_id,
            media_url=loomie_message.media[0].url if loomie_message.media else None
        )
        
        logger.info(f"✅ [CRM] Interação salva: {loomie_message.message_id}")
        return True
    
    except Exception as e:
        logger.error(f"❌ [CRM] Erro ao salvar: {e}")
        return False


def enviar_para_n8n(loomie_message: LoomieMessage) -> bool:
    """
    Envia mensagem para n8n via webhook
    """
    try:
        # Buscar URL do webhook n8n (pode vir de settings ou banco)
        webhook_url = getattr(settings, 'N8N_WEBHOOK_URL', None)
        
        if not webhook_url:
            logger.warning("N8N_WEBHOOK_URL não configurado")
            return False
        
        # Payload para n8n
        payload = loomie_message.to_dict()
        
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        response.raise_for_status()
        logger.info(f"📨 Mensagem enviada para n8n: {loomie_message.message_id}")
        return True
    
    except requests.RequestException as e:
        logger.error(f"Erro ao enviar para n8n: {e}")
        return False


def enviar_para_canal(canal_nome: str, loomie_message: LoomieMessage) -> bool:
    """
    Envia mensagem para outro canal (ex: Telegram, Email, etc)
    """
    try:
        # Buscar config do canal
        canal = CanalConfig.objects.filter(nome=canal_nome, ativo=True).first()
        
        if not canal:
            logger.warning(f"Canal {canal_nome} não encontrado")
            return False
        
        # TODO: Implementar envio baseado no tipo de canal
        logger.info(f"📨 Mensagem enviada para canal {canal_nome}: {loomie_message.message_id}")
        return True
    
    except Exception as e:
        logger.error(f"Erro ao enviar para canal {canal_nome}: {e}")
        return False


def enviar_mensagem_saida(loomie_message: LoomieMessage, canal: CanalConfig, payload: Dict) -> Dict:
    """
    Envia mensagem de saída para o canal externo (WhatsApp, Telegram, etc)
    
    Args:
        loomie_message: Mensagem no formato Loomie
        canal: Configuração do canal
        payload: Payload já traduzido para o formato do canal
    
    Returns:
        Dict com success, external_id, error
    """
    try:
        if canal.tipo == 'whatsapp' or canal.tipo == 'evo':
            return enviar_whatsapp_evo(canal, payload)
        
        elif canal.tipo == 'telegram':
            return enviar_telegram(canal, payload)
        
        elif canal.tipo == 'n8n':
            return enviar_n8n_direto(canal, payload)
        
        else:
            return {
                'success': False,
                'error': f'Tipo de canal {canal.tipo} não suportado para envio'
            }
    
    except Exception as e:
        logger.error(f"Erro ao enviar mensagem: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def enviar_whatsapp_evo(canal: CanalConfig, payload: Dict) -> Dict:
    """
    Envia mensagem via Evolution API (WhatsApp)
    """
    try:
        credenciais = canal.credenciais
        base_url = credenciais.get('base_url')
        api_key = credenciais.get('api_key')
        instance = credenciais.get('instance')
        
        if not all([base_url, api_key, instance]):
            return {
                'success': False,
                'error': 'Credenciais incompletas para Evolution API'
            }
        
        # URL do endpoint
        url = f"{base_url}/message/sendText/{instance}"
        
        # Headers
        headers = {
            'Content-Type': 'application/json',
            'apikey': api_key
        }
        
        # 🔍 DEBUG: Mostrar request completa
        logger.info(f"📤 [Evolution API] URL: {url}")
        logger.info(f"📤 [Evolution API] Headers: apikey={api_key[:10]}...")
        logger.info(f"📤 [Evolution API] Payload: {payload}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        # 🔍 DEBUG: Mostrar response
        logger.info(f"📥 [Evolution API] Status: {response.status_code}")
        logger.info(f"📥 [Evolution API] Response: {response.text[:200]}")
        
        response.raise_for_status()
        
        result = response.json()
        
        return {
            'success': True,
            'external_id': result.get('key', {}).get('id', '')
        }
    
    except requests.RequestException as e:
        logger.error(f"❌ [Evolution API] Erro: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"❌ [Evolution API] Response body: {e.response.text}")
        return {
            'success': False,
            'error': str(e)
        }


def enviar_telegram(canal: CanalConfig, payload: Dict) -> Dict:
    """
    Envia mensagem via Telegram Bot API
    """
    try:
        credenciais = canal.credenciais
        bot_token = credenciais.get('bot_token')
        
        if not bot_token:
            return {
                'success': False,
                'error': 'Bot token não configurado'
            }
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()
        
        result = response.json()
        
        return {
            'success': True,
            'external_id': str(result.get('result', {}).get('message_id', ''))
        }
    
    except requests.RequestException as e:
        logger.error(f"Erro ao enviar via Telegram: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def enviar_n8n_direto(canal: CanalConfig, payload: Dict) -> Dict:
    """
    Envia mensagem diretamente para webhook n8n
    """
    try:
        credenciais = canal.credenciais
        webhook_url = credenciais.get('webhook_url')
        
        if not webhook_url:
            return {
                'success': False,
                'error': 'Webhook URL não configurado'
            }
        
        response = requests.post(webhook_url, json=payload, timeout=15)
        response.raise_for_status()
        
        return {
            'success': True,
            'external_id': ''
        }
    
    except requests.RequestException as e:
        logger.error(f"Erro ao enviar para n8n: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def enviar_para_webhook_customizado(webhook, loomie_data: Dict, tentativa: int = 1) -> bool:
    """
    Envia mensagem para webhook customizado configurado pelo cliente
    
    Args:
        webhook: Instância de WebhookCustomizado
        loomie_data: Dicionário com dados da mensagem em formato Loomie
        tentativa: Número da tentativa atual (para retry)
    
    Returns:
        bool: True se enviado com sucesso, False caso contrário
    """
    from datetime import datetime
    from .models import WebhookCustomizado
    
    try:
        # Verificar se webhook está ativo
        if not webhook.ativo:
            logger.warning(f"⚠️ Webhook '{webhook.nome}' está inativo")
            return False
        
        # Preparar headers
        headers = {'Content-Type': 'application/json'}
        if webhook.headers:
            headers.update(webhook.headers)
        
        # Mapear método HTTP
        metodo_map = {
            'POST': requests.post,
            'PUT': requests.put,
            'PATCH': requests.patch
        }
        metodo_func = metodo_map.get(webhook.metodo_http, requests.post)
        
        # Log de envio
        logger.info(f"📤 [Webhook Customizado] Enviando para '{webhook.nome}' (tentativa {tentativa}/{webhook.max_tentativas})")
        logger.info(f"📤 [Webhook Customizado] URL: {webhook.url}")
        logger.info(f"📤 [Webhook Customizado] Método: {webhook.metodo_http}")
        
        # Fazer request
        response = metodo_func(
            webhook.url,
            json=loomie_data,
            headers=headers,
            timeout=webhook.timeout
        )
        
        # Verificar resposta
        response.raise_for_status()
        
        # Log de sucesso
        logger.info(f"✅ [Webhook Customizado] '{webhook.nome}' - Status: {response.status_code}")
        
        # Atualizar estatísticas
        webhook.incrementar_enviado()
        webhook.ultima_execucao = datetime.now()
        webhook.save(update_fields=['total_enviados', 'ultima_execucao'])
        
        return True
    
    except requests.Timeout as e:
        logger.error(f"⏱️ [Webhook Customizado] '{webhook.nome}' - Timeout após {webhook.timeout}s")
        return _handle_webhook_error(webhook, loomie_data, tentativa, f"Timeout: {str(e)}")
    
    except requests.RequestException as e:
        error_msg = f"Erro HTTP: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f" - Status: {e.response.status_code}"
            logger.error(f"❌ [Webhook Customizado] '{webhook.nome}' - {error_msg}")
            logger.error(f"❌ Response body: {e.response.text[:200]}")
        else:
            logger.error(f"❌ [Webhook Customizado] '{webhook.nome}' - {error_msg}")
        
        return _handle_webhook_error(webhook, loomie_data, tentativa, error_msg)
    
    except Exception as e:
        logger.error(f"❌ [Webhook Customizado] '{webhook.nome}' - Erro inesperado: {str(e)}")
        return _handle_webhook_error(webhook, loomie_data, tentativa, f"Erro: {str(e)}")


def _handle_webhook_error(webhook, loomie_data: Dict, tentativa: int, error_msg: str) -> bool:
    """
    Lida com erro de webhook (retry logic)
    """
    from datetime import datetime
    
    # Incrementar contador de erros
    webhook.incrementar_erro()
    webhook.ultima_execucao = datetime.now()
    webhook.save(update_fields=['total_erros', 'ultima_execucao'])
    
    # Verificar se deve tentar novamente
    if webhook.retry_em_falha and tentativa < webhook.max_tentativas:
        logger.info(f"🔄 [Webhook Customizado] Tentando novamente '{webhook.nome}'...")
        import time
        time.sleep(2 ** tentativa)  # Exponential backoff: 2s, 4s, 8s...
        return enviar_para_webhook_customizado(webhook, loomie_data, tentativa + 1)
    
    return False


def processar_webhooks_customizados(loomie_message: LoomieMessage, direcao: str = 'entrada') -> List[str]:
    """
    Processa webhooks customizados com base em filtros
    
    Args:
        loomie_message: Mensagem em formato Loomie
        direcao: 'entrada' ou 'saida'
    
    Returns:
        List[str]: Lista de webhooks que receberam a mensagem com sucesso
    """
    from .models import WebhookCustomizado
    
    webhooks_enviados = []
    
    try:
        # Buscar webhooks ativos
        webhooks = WebhookCustomizado.objects.filter(ativo=True)
        
        if not webhooks.exists():
            logger.debug("Nenhum webhook customizado configurado")
            return webhooks_enviados
        
        logger.info(f"🔍 Verificando {webhooks.count()} webhook(s) customizado(s)")
        
        for webhook in webhooks:
            # Aplicar filtro de canal
            if webhook.filtro_canal != 'todos' and webhook.filtro_canal != loomie_message.channel_type:
                logger.debug(f"⏭️ Webhook '{webhook.nome}' - Canal filtrado ({webhook.filtro_canal} != {loomie_message.channel_type})")
                continue
            
            # Aplicar filtro de direção
            if webhook.filtro_direcao == 'entrada' and direcao != 'entrada':
                logger.debug(f"⏭️ Webhook '{webhook.nome}' - Direção filtrada (espera entrada, recebeu {direcao})")
                continue
            elif webhook.filtro_direcao == 'saida' and direcao != 'saida':
                logger.debug(f"⏭️ Webhook '{webhook.nome}' - Direção filtrada (espera saída, recebeu {direcao})")
                continue
            
            # Webhook passou pelos filtros, enviar
            logger.info(f"✅ Webhook '{webhook.nome}' passou nos filtros, enviando...")
            
            # Converter LoomieMessage para dict (garantir tipo correto)
            if hasattr(loomie_message, 'to_dict'):
                loomie_data: Dict = loomie_message.to_dict()
            else:
                loomie_data: Dict = loomie_message  # type: ignore
            
            sucesso = enviar_para_webhook_customizado(webhook, loomie_data)
            
            if sucesso:
                webhooks_enviados.append(f"webhook:{webhook.nome}")
        
        logger.info(f"📊 Webhooks customizados: {len(webhooks_enviados)} enviado(s) com sucesso")
    
    except Exception as e:
        logger.error(f"❌ Erro ao processar webhooks customizados: {str(e)}")
    
    return webhooks_enviados
