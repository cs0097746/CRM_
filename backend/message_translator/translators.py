"""
Tradutores específicos para cada canal
Convertem formato do canal ↔ formato Loomie
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from datetime import datetime
from .schemas import LoomieMessage, LoomieMedia
import logging

logger = logging.getLogger(__name__)


class BaseTranslator(ABC):
    """
    Classe base para todos os tradutores de canais
    """
    
    @abstractmethod
    def to_loomie(self, payload: Dict[str, Any]) -> LoomieMessage:
        """
        Converte payload do canal para formato Loomie
        """
        pass
    
    @abstractmethod
    def from_loomie(self, message: LoomieMessage) -> Dict[str, Any]:
        """
        Converte formato Loomie para payload do canal
        """
        pass


class WhatsAppTranslator(BaseTranslator):
    """
    Tradutor para WhatsApp (formato Evolution API)
    """
    
    def to_loomie(self, payload: Dict[str, Any]) -> LoomieMessage:
        """
        Converte mensagem do WhatsApp para Loomie
        
        Suporta 2 formatos:
        1. Evolution API direto: {"key": {...}, "message": {...}}
        2. Evolution API com wrapper: {"event": "...", "data": {"key": {...}}}
        """
        try:
            # 🔧 SUPORTE DUPLO: Evolution pode enviar com ou sem wrapper "data"
            if 'data' in payload and 'event' in payload:
                # Formato: {"event": "messages.upsert", "data": {...}}
                data = payload.get('data', {})
            else:
                # Formato direto: {"key": {...}, "message": {...}}
                data = payload
            
            key = data.get('key', {})
            message_data = data.get('message', {})
            
            # Identificadores
            external_id = key.get('id', '')
            remote_jid = key.get('remoteJid', '')
            from_me = key.get('fromMe', False)
            participant = key.get('participant', '')  # ✅ Quem enviou em grupos
            
            # ✅ CORREÇÃO: Determinar remetente corretamente
            if from_me:
                # Mensagem enviada pelo sistema (você/operador)
                # sender = quem enviou (sistema/operador)
                # recipient = destinatário (cliente)
                sender = "system:crm"  # Indica que foi enviado pelo CRM
                recipient = remote_jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
            else:
                # Mensagem recebida (cliente)
                if participant:
                    # Mensagem de grupo - usar participant
                    sender = participant.replace('@s.whatsapp.net', '').replace('@g.us', '')
                else:
                    # Mensagem individual - usar remoteJid
                    sender = remote_jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
                recipient = "system:crm"
            
            # Criar mensagem Loomie
            loomie_msg = LoomieMessage(
                external_id=external_id,
                sender=f"whatsapp:{sender}",
                recipient=recipient if not from_me else f"whatsapp:{recipient}",
                sender_name=data.get('pushName', ''),
                channel_type='whatsapp',
                timestamp=datetime.fromtimestamp(data.get('messageTimestamp', 0)),
                metadata={'from_me': from_me}  # ⭐ ADICIONAR fromMe ao metadata
            )
            
            # Extrair conteúdo
            if 'conversation' in message_data:
                loomie_msg.content_type = 'text'
                loomie_msg.text = message_data['conversation']
            
            elif 'extendedTextMessage' in message_data:
                ext_text = message_data['extendedTextMessage']
                loomie_msg.content_type = 'text'
                loomie_msg.text = ext_text.get('text', '')
                
                # Reply
                if ext_text.get('contextInfo', {}).get('quotedMessage'):
                    loomie_msg.reply_to = ext_text['contextInfo'].get('stanzaId')
            
            elif 'imageMessage' in message_data:
                img = message_data['imageMessage']
                loomie_msg.content_type = 'media'
                loomie_msg.text = img.get('caption', '')
                
                # 🔥 PROCESSAR MÍDIA: Baixar + Descriptografar + Salvar localmente
                # Evolution envia base64 dentro da mensagem OU no data.base64
                base64_img = data.get('base64', '') or img.get('base64', '')
                
                media_result = self._processar_midia_whatsapp(
                    message_data=img,
                    tipo='imagem',
                    base64_data=base64_img
                )
                
                loomie_msg.add_media(
                    tipo='image',
                    url=media_result.get('url_local') or img.get('url'),  # Usar URL local se processou
                    mime_type=img.get('mimetype'),
                    tamanho=media_result.get('size') or img.get('fileLength'),
                    legenda=img.get('caption'),
                    filename=media_result.get('filename')
                )
            
            elif 'videoMessage' in message_data:
                video = message_data['videoMessage']
                loomie_msg.content_type = 'media'
                loomie_msg.text = video.get('caption', '')
                
                # 🔥 PROCESSAR MÍDIA
                base64_video = data.get('base64', '') or video.get('base64', '')
                
                media_result = self._processar_midia_whatsapp(
                    message_data=video,
                    tipo='video',
                    base64_data=base64_video
                )
                
                loomie_msg.add_media(
                    tipo='video',
                    url=media_result.get('url_local') or video.get('url'),
                    mime_type=video.get('mimetype'),
                    tamanho=media_result.get('size') or video.get('fileLength'),
                    duracao=video.get('seconds'),
                    legenda=video.get('caption'),
                    filename=media_result.get('filename')
                )
            
            elif 'audioMessage' in message_data:
                audio = message_data['audioMessage']
                loomie_msg.content_type = 'media'
                
                logger.info(f"🎵 [AUDIO] Processando áudio...")
                logger.info(f"🎵 [AUDIO] URL: {audio.get('url')}")
                logger.info(f"🎵 [AUDIO] MediaKey: {'SIM' if audio.get('mediaKey') else 'NÃO'}")
                logger.info(f"🎵 [AUDIO] Base64: {'SIM' if data.get('base64') or audio.get('base64') else 'NÃO'}")
                
                # 🔥 PROCESSAR MÍDIA
                base64_audio = data.get('base64', '') or audio.get('base64', '')
                
                media_result = self._processar_midia_whatsapp(
                    message_data=audio,
                    tipo='audio',
                    base64_data=base64_audio
                )
                
                logger.info(f"🎵 [AUDIO] Resultado do processamento:")
                logger.info(f"🎵 [AUDIO]   URL local: {media_result.get('url_local')}")
                logger.info(f"🎵 [AUDIO]   Filename: {media_result.get('filename')}")
                logger.info(f"🎵 [AUDIO]   Size: {media_result.get('size')}")
                
                loomie_msg.add_media(
                    tipo='audio',
                    url=media_result.get('url_local') or audio.get('url'),
                    mime_type=audio.get('mimetype'),
                    tamanho=media_result.get('size') or audio.get('fileLength'),
                    duracao=audio.get('seconds'),
                    filename=media_result.get('filename')
                )
            
            elif 'documentMessage' in message_data:
                doc = message_data['documentMessage']
                loomie_msg.content_type = 'media'
                
                # 🔥 PROCESSAR MÍDIA
                media_result = self._processar_midia_whatsapp(
                    message_data=doc,
                    tipo='documento',
                    base64_data=data.get('base64', '')
                )
                
                loomie_msg.add_media(
                    tipo='document',
                    url=media_result.get('url_local') or doc.get('url'),
                    mime_type=doc.get('mimetype'),
                    filename=media_result.get('filename') or doc.get('fileName'),
                    tamanho=media_result.get('size') or doc.get('fileLength')
                )
            
            elif 'locationMessage' in message_data:
                loc = message_data['locationMessage']
                loomie_msg.content_type = 'media'
                loomie_msg.add_media(
                    tipo='location',
                    latitude=loc.get('degreesLatitude'),
                    longitude=loc.get('degreesLongitude'),
                    endereco=loc.get('address')
                )
            
            # Metadados
            loomie_msg.set_metadata('whatsapp_raw', payload)
            loomie_msg.set_metadata('is_group', '@g.us' in remote_jid)
            loomie_msg.set_metadata('from_me', from_me)  # ⭐ CRUCIAL: Indica se foi enviado por mim (operador)
            
            return loomie_msg
        
        except Exception as e:
            logger.error(f"Erro ao converter WhatsApp para Loomie: {e}")
            raise
    
    def from_loomie(self, message: LoomieMessage) -> Dict[str, Any]:
        """
        Converte Loomie para formato WhatsApp (Evolution API)
        """
        try:
            # Extrair número do destinatário (remover prefixos whatsapp:, evo:, etc)
            recipient = message.recipient
            for prefix in ['whatsapp:', 'evo:', 'telegram:', 'system:']:
                recipient = recipient.replace(prefix, '')
            
            logger.info(f"🔍 [from_loomie] Recipient original: {message.recipient}")
            logger.info(f"🔍 [from_loomie] Recipient limpo: {recipient}")
            logger.info(f"🔍 [from_loomie] Content type: {message.content_type}")
            logger.info(f"🔍 [from_loomie] Text: {message.text}")
            
            payload = {
                "number": recipient,
            }
            
            # Texto simples
            if message.content_type == 'text' and message.text:
                payload["text"] = message.text
                logger.info(f"✅ [from_loomie] Payload final: {payload}")
            
            # Mídia
            elif message.content_type == 'media' and message.media:
                media = message.media[0]  # Primeira mídia
                
                if media.tipo == 'image':
                    payload["mediatype"] = "image"
                    payload["media"] = media.url
                    if media.legenda or message.text:
                        payload["caption"] = media.legenda or message.text
                
                elif media.tipo == 'video':
                    payload["mediatype"] = "video"
                    payload["media"] = media.url
                    if media.legenda or message.text:
                        payload["caption"] = media.legenda or message.text
                
                elif media.tipo == 'audio':
                    payload["audio"] = media.url
                
                elif media.tipo == 'document':
                    payload["mediatype"] = "document"
                    payload["media"] = media.url
                    if media.filename:
                        payload["fileName"] = media.filename
            
            # Reply (quoted message)
            if message.reply_to:
                payload["quoted"] = {
                    "key": {
                        "id": message.reply_to
                    }
                }
            
            return payload
        
        except Exception as e:
            logger.error(f"Erro ao converter Loomie para WhatsApp: {e}")
            raise
    
    def _processar_midia_whatsapp(self, message_data: Dict, tipo: str, base64_data: str = '') -> Dict:
        """
        🔥 PROCESSA MÍDIA DO WHATSAPP: Baixa + Descriptografa + Salva localmente
        
        Usa o WhatsAppMediaProcessor do app atendimento (já testado e funcional)
        
        Returns:
            dict: {
                'url_local': 'http://backend:8000/media/whatsapp_media/...',
                'filename': 'audio_abc123.mp3',
                'size': 123456
            }
        """
        try:
            # 🔥 IMPORTAR o processador do app atendimento
            from atendimento.media_processor import WhatsAppMediaProcessor
            
            logger.info(f"🔥 Processando {tipo} usando WhatsAppMediaProcessor...")
            
            # Processar mídia (download + decrypt + save)
            result = WhatsAppMediaProcessor.process_media(
                message_data=message_data,
                tipo_mensagem=tipo,
                base64_data=base64_data
            )
            
            if result['success']:
                logger.info(f"✅ Mídia processada: {result.get('filename')} ({result.get('size')} bytes)")
                return {
                    'url_local': result.get('media_local_path'),
                    'filename': result.get('filename'),
                    'size': result.get('size')
                }
            else:
                logger.error(f"❌ Erro ao processar mídia: {result.get('error')}")
                return {'url_local': None, 'filename': None, 'size': None}
        
        except Exception as e:
            logger.error(f"💥 Exceção ao processar mídia: {e}", exc_info=True)
            return {'url_local': None, 'filename': None, 'size': None}


class N8nTranslator(BaseTranslator):
    """
    Tradutor para n8n (webhook format)
    """
    
    def to_loomie(self, payload: Dict[str, Any]) -> LoomieMessage:
        """
        Converte webhook n8n para Loomie
        """
        return LoomieMessage(
            external_id=payload.get('id', ''),
            sender=payload.get('sender', 'n8n:webhook'),
            recipient=payload.get('recipient', 'system:crm'),
            channel_type='n8n',
            content_type='text',
            text=payload.get('message', ''),
            metadata=payload.get('metadata', {})
        )
    
    def from_loomie(self, message: LoomieMessage) -> Dict[str, Any]:
        """
        Converte Loomie para formato n8n
        """
        return {
            "message_id": message.message_id,
            "sender": message.sender,
            "recipient": message.recipient,
            "text": message.text,
            "timestamp": message.timestamp.isoformat() if message.timestamp else None,
            "media": [m.to_dict() for m in message.media] if message.media else [],
            "metadata": message.metadata,
            "channel_type": message.channel_type
        }


class TelegramTranslator(BaseTranslator):
    """
    Tradutor para Telegram
    """
    
    def to_loomie(self, payload: Dict[str, Any]) -> LoomieMessage:
        """
        Converte mensagem Telegram para Loomie
        """
        message = payload.get('message', {})
        
        loomie_msg = LoomieMessage(
            external_id=str(message.get('message_id', '')),
            sender=f"telegram:{message.get('from', {}).get('id', '')}",
            sender_name=message.get('from', {}).get('first_name', ''),
            recipient="system:crm",
            channel_type='telegram',
            timestamp=datetime.fromtimestamp(message.get('date', 0)),
        )
        
        # Texto
        if message.get('text'):
            loomie_msg.content_type = 'text'
            loomie_msg.text = message['text']
        
        # Foto
        elif message.get('photo'):
            loomie_msg.content_type = 'media'
            loomie_msg.text = message.get('caption', '')
            # Pegar maior resolução
            photo = message['photo'][-1]
            loomie_msg.add_media(
                tipo='image',
                tamanho=photo.get('file_size'),
                legenda=message.get('caption')
            )
        
        # Reply
        if message.get('reply_to_message'):
            loomie_msg.reply_to = str(message['reply_to_message']['message_id'])
        
        return loomie_msg
    
    def from_loomie(self, message: LoomieMessage) -> Dict[str, Any]:
        """
        Converte Loomie para formato Telegram Bot API
        """
        chat_id = message.recipient.replace('telegram:', '')
        
        payload = {
            "chat_id": chat_id,
            "text": message.text or ""
        }
        
        # Reply
        if message.reply_to:
            payload["reply_to_message_id"] = int(message.reply_to)
        
        return payload


class EvoTranslator(WhatsAppTranslator):
    """
    Tradutor para Evolution API (herda de WhatsApp)
    """
    pass


# Factory de tradutores
TRANSLATORS = {
    'whatsapp': WhatsAppTranslator(),
    'evo': EvoTranslator(),
    'n8n': N8nTranslator(),
    'telegram': TelegramTranslator(),
}


def get_translator(channel_type: str) -> BaseTranslator:
    """
    Retorna tradutor para o tipo de canal
    """
    translator = TRANSLATORS.get(channel_type)
    if not translator:
        raise ValueError(f"Tradutor não encontrado para canal: {channel_type}")
    return translator
