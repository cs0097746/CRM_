"""
Serviço para envio de mídias via WhatsApp
Base estrutural para futuro desenvolvimento
"""

import os
import mimetypes
import base64
from django.conf import settings
from django.core.files.storage import default_storage
import requests
import logging

logger = logging.getLogger(__name__)

class WhatsAppMediaSender:
    """
    Serviço para envio de mídias via API do WhatsApp.
    Preparado para futuro desenvolvimento do painel de atendimento.
    """
    
    SUPPORTED_SEND_TYPES = ['texto', 'imagem', 'audio', 'documento']
    
    def __init__(self):
        """Inicializa o serviço com configurações da API"""
        from atendimento.utils import get_instance_config
        self.config = get_instance_config()
        self.api_key = self.config.get('api_key')
        self.base_url = self.config.get('base_url', '').rstrip('/')
        
    def send_text_message(self, phone_number, message_text):
        """
        Envia mensagem de texto.
        
        Args:
            phone_number (str): Número do destinatário
            message_text (str): Texto da mensagem
            
        Returns:
            dict: Resultado do envio
        """
        try:
            logger.info(f"📤 Enviando mensagem de texto para {phone_number}")
            
            payload = {
                "number": phone_number,
                "text": message_text
            }
            
            response = self._make_api_request('/message/sendText', payload)
            
            if response and response.get('key'):
                logger.info("✅ Mensagem de texto enviada com sucesso")
                return {
                    'success': True,
                    'message_id': response.get('key', {}).get('id'),
                    'response': response
                }
            else:
                logger.error(f"❌ Falha no envio: {response}")
                return {
                    'success': False,
                    'error': 'Resposta inválida da API'
                }
                
        except Exception as e:
            logger.error(f"❌ Erro no envio de texto: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_media_message(self, phone_number, media_path, media_type, caption=None):
        """
        Envia mensagem com mídia (imagem, áudio, documento).
        Base para implementação futura.
        
        Args:
            phone_number (str): Número do destinatário
            media_path (str): Caminho do arquivo de mídia
            media_type (str): Tipo da mídia ('imagem', 'audio', 'documento')
            caption (str): Legenda opcional
            
        Returns:
            dict: Resultado do envio
        """
        try:
            logger.info(f"📤 Preparando envio de {media_type} para {phone_number}")
            
            if media_type not in self.SUPPORTED_SEND_TYPES:
                return {
                    'success': False,
                    'error': f'Tipo de mídia não suportado: {media_type}'
                }
            
            # Verificar se arquivo existe
            if not self._media_file_exists(media_path):
                return {
                    'success': False,
                    'error': 'Arquivo de mídia não encontrado'
                }
            
            # Preparar dados da mídia
            media_data = self._prepare_media_data(media_path, media_type)
            if not media_data['success']:
                return media_data
            
            # Definir endpoint baseado no tipo
            endpoint_map = {
                'imagem': '/message/sendMedia',
                'audio': '/message/sendMedia', 
                'documento': '/message/sendMedia'
            }
            
            endpoint = endpoint_map.get(media_type, '/message/sendMedia')
            
            # Preparar payload
            payload = {
                "number": phone_number,
                "mediatype": self._convert_media_type(media_type),
                "media": media_data['base64'],
                "fileName": media_data['filename']
            }
            
            if caption and media_type in ['imagem', 'documento']:
                payload['caption'] = caption
            
            # Fazer requisição
            response = self._make_api_request(endpoint, payload)
            
            if response and response.get('key'):
                logger.info(f"✅ {media_type.capitalize()} enviado com sucesso")
                return {
                    'success': True,
                    'message_id': response.get('key', {}).get('id'),
                    'response': response
                }
            else:
                logger.error(f"❌ Falha no envio de {media_type}: {response}")
                return {
                    'success': False,
                    'error': 'Resposta inválida da API'
                }
                
        except Exception as e:
            logger.error(f"❌ Erro no envio de {media_type}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _media_file_exists(self, media_path):
        """Verifica se o arquivo de mídia existe"""
        try:
            if media_path.startswith('/media/'):
                # Caminho relativo do Django
                file_path = media_path.replace('/media/', '')
                return default_storage.exists(file_path)
            else:
                # Caminho absoluto
                return os.path.exists(media_path)
        except:
            return False
    
    def _prepare_media_data(self, media_path, media_type):
        """Prepara dados de mídia para envio"""
        try:
            # Ler arquivo
            if media_path.startswith('/media/'):
                file_path = media_path.replace('/media/', '')
                with default_storage.open(file_path, 'rb') as f:
                    file_data = f.read()
                filename = os.path.basename(file_path)
            else:
                with open(media_path, 'rb') as f:
                    file_data = f.read()
                filename = os.path.basename(media_path)
            
            # Converter para base64
            base64_data = base64.b64encode(file_data).decode('utf-8')
            
            # Verificar mimetype
            mimetype, _ = mimetypes.guess_type(filename)
            
            return {
                'success': True,
                'base64': base64_data,
                'filename': filename,
                'mimetype': mimetype,
                'size': len(file_data)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao preparar mídia: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _convert_media_type(self, media_type):
        """Converte tipo interno para tipo da API"""
        type_map = {
            'imagem': 'image',
            'audio': 'audio',
            'documento': 'document'
        }
        return type_map.get(media_type, media_type)
    
    def _make_api_request(self, endpoint, payload):
        """Faz requisição para a API do WhatsApp"""
        try:
            if not self.api_key or not self.base_url:
                raise ValueError("Configuração da API não disponível")
            
            url = f"{self.base_url}{endpoint}"
            headers = {
                'apikey': self.api_key,
                'Content-Type': 'application/json'
            }
            
            logger.info(f"🌐 Fazendo requisição para: {url}")
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"❌ Erro HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erro na requisição: {e}")
            return None

# Funções de conveniência para uso futuro no painel
def send_message_from_panel(user, phone_number, message_type, content, media_file=None):
    """
    Função principal para envio de mensagens pelo painel.
    Para implementação futura.
    
    Args:
        user: Usuário do painel que está enviando
        phone_number (str): Número do destinatário  
        message_type (str): 'texto', 'imagem', 'audio', 'documento'
        content (str): Conteúdo da mensagem (texto ou legenda)
        media_file: Arquivo de mídia (para tipos não-texto)
        
    Returns:
        dict: Resultado do envio
    """
    try:
        sender = WhatsAppMediaSender()
        
        if message_type == 'texto':
            return sender.send_text_message(phone_number, content)
        else:
            # TODO: Implementar salvamento do arquivo enviado pelo usuário
            # TODO: Implementar logging da ação do usuário
            # TODO: Implementar atualização da conversa
            
            if not media_file:
                return {
                    'success': False,
                    'error': 'Arquivo de mídia obrigatório'
                }
            
            # Salvar arquivo temporariamente (implementação futura)
            # media_path = save_uploaded_file(media_file)
            
            # Enviar mídia
            # return sender.send_media_message(phone_number, media_path, message_type, content)
            
            return {
                'success': False,
                'error': 'Envio de mídia não implementado ainda'
            }
            
    except Exception as e:
        logger.error(f"❌ Erro no envio pelo painel: {e}")
        return {
            'success': False,
            'error': str(e)
        }