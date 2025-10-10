"""
WhatsApp Service - Serviços para integração com Evolution API
"""
import requests
import logging
from django.conf import settings
from .utils import get_instance_config

logger = logging.getLogger(__name__)


def enviar_mensagem_whatsapp(numero, mensagem, instance_name=None, evolution_api_url=None, api_key=None):
    """
    Envia mensagem pelo WhatsApp usando Evolution API
    """
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/message/sendText/{instance_name or config['instance_name']}"
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    payload = {
        "number": numero,
        "text": mensagem
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 201:
            logger.info("MENSAGEM ENVIADA COM SUCESSO!")
            return {
                "success": True, 
                "data": response.json(),
                "message": "Mensagem enviada com sucesso"
            }
        else:
            logger.warning(f"Erro no envio: Status {response.status_code}")
            return {
                "success": False, 
                "error": f"Status {response.status_code}: {response.text}",
                "message": "Falha no envio da mensagem"
            }
            
    except Exception as e:
        logger.error(f"Erro na requisição: {e}")
        return {
            "success": False, 
            "error": str(e),
            "message": "Erro na conexão com WhatsApp"
        }


def enviar_presenca_whatsapp(numero, presence="composing", instance_name=None, evolution_api_url=None, api_key=None):
    """
    Envia indicador de presença (digitando, online, etc.)
    """
    config = get_instance_config()
    
    url = f"{evolution_api_url or config['url']}/chat/sendPresence/{instance_name or config['instance_name']}"
    
    headers = {
        'apikey': api_key or config['api_key'],
        'Content-Type': 'application/json'
    }
    
    payload = {
        "number": numero,
        "presence": presence
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Presença '{presence}' enviada para {numero}")
            return {"success": True, "data": response.json()}
        else:
            logger.warning(f"Erro ao enviar presença: {response.status_code}")
            return {"success": False, "error": f"Status {response.status_code}"}
            
    except Exception as e:
        logger.error(f"Erro na requisição de presença: {e}")
        return {"success": False, "error": str(e)}


def verificar_status_instancia(instance_name=None, evolution_api_url=None, api_key=None):
    """
    Verifica status da instância WhatsApp
    """
    config = get_instance_config()
    
    try:
        url = f"{evolution_api_url or config['url']}/instance/connectionState/{instance_name or config['instance_name']}"
        
        headers = {
            'apikey': api_key or config['api_key'],
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        logger.info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verificar se resposta está vazia
            if not data:
                return {
                    "success": False,
                    "connected": False,
                    "error": "Resposta vazia da API"
                }
            
            state = data.get('instance', {}).get('state')
            
            return {
                "success": True,
                "connected": state == 'open',
                "state": state,
                "data": data
            }
        else:
            return {
                "success": False,
                "connected": False,
                "error": f"HTTP {response.status_code}: {response.text}"
            }
            
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        return {
            "success": False,
            "connected": False,
            "error": str(e)
        }


def obter_qr_code(instance_name=None, evolution_api_url=None, api_key=None):
    """
    Obtém QR Code para conectar instância
    """
    config = get_instance_config()

    try:
        status_result = verificar_status_instancia(instance_name, evolution_api_url, api_key)

        # Se já conectado, não precisa de QR
        if status_result.get('connected'):
            return {
                "success": True,
                "connected": True,
                "qr_code": None,
                "message": "Instância já conectada"
            }

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
                "error": f"HTTP {response.status_code}: {response.text}"
            }
            
    except Exception as e:
        logger.error(f"Erro ao obter QR Code: {e}")
        return {
            "success": False,
            "connected": False,
            "error": str(e)
        }


def reiniciar_instancia(instance_name=None, evolution_api_url=None, api_key=None):
    """
    Reinicia instância WhatsApp
    """
    config = get_instance_config()
    
    try:
        url = f"{evolution_api_url or config['url']}/instance/restart/{instance_name or config['instance_name']}"
        
        headers = {
            'apikey': api_key or config['api_key'],
            'Content-Type': 'application/json'
        }
        
        response = requests.put(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {
                "success": True,
                "message": "Instância reiniciada com sucesso",
                "data": response.json()
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}"
            }
            
    except Exception as e:
        logger.error(f"Erro ao reiniciar instância: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def desconectar_instancia(instance_name=None, evolution_api_url=None, api_key=None):
    """
    Desconecta instância WhatsApp
    """
    config = get_instance_config()
    
    try:
        url = f"{evolution_api_url or config['url']}/instance/logout/{instance_name or config['instance_name']}"
        
        headers = {
            'apikey': api_key or config['api_key'],
            'Content-Type': 'application/json'
        }
        
        response = requests.delete(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {
                "success": True,
                "message": "Instância desconectada com sucesso",
                "data": response.json()
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}"
            }
            
    except Exception as e:
        logger.error(f"Erro ao desconectar instância: {e}")
        return {
            "success": False,
            "error": str(e)
        }