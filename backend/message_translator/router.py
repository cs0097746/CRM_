"""
Sistema de roteamento de mensagens
Envia mensagens para múltiplos destinos em paralelo
"""
import requests
import logging
from typing import Dict, List, Any
from django.conf import settings
from .models import CanalConfig
from .schemas import LoomieMessage

logger = logging.getLogger(__name__)


def processar_mensagem_entrada(loomie_message: LoomieMessage, canal: CanalConfig = None) -> Dict:
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
    
    if resultados['erros']:
        resultados['success'] = False
    
    return resultados


def enviar_para_crm(loomie_message: LoomieMessage) -> bool:
    """
    Envia mensagem para o CRM (sistema de atendimento interno)
    
    Por enquanto apenas registra o envio.
    TODO: Integrar com atendimento.views quando a função estiver pronta
    """
    try:
        # Extrair número WhatsApp
        sender = loomie_message.sender.replace('whatsapp:', '')
        
        # Log do que seria enviado
        logger.info(f"📨 [CRM] Mensagem recebida de {sender}: {loomie_message.text[:50] if loomie_message.text else 'sem texto'}...")
        logger.info(f"📨 [CRM] Message ID: {loomie_message.message_id}")
        
        # TODO: Quando estiver pronto, descomentar:
        # from atendimento.views import processar_mensagem_whatsapp
        # processar_mensagem_whatsapp(sender, loomie_message.text, loomie_message.metadata)
        
        return True
    
    except Exception as e:
        logger.error(f"Erro ao enviar para CRM: {e}")
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
