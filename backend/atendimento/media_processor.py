"""
Processador unificado de mídias WhatsApp
Suporta texto, imagem e áudio com descriptografia automática
"""

import os
import uuid
import base64
import mimetypes
import logging
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings
from core.ffmpeg_service import FFmpegService
from core.whatsapp_decrypt import WhatsAppDecryption

logger = logging.getLogger(__name__)

class WhatsAppMediaProcessor:
    """
    Processador unificado para todas as mídias do WhatsApp.
    Suporta texto, imagem, áudio com descriptografia automática.
    """
    
    SUPPORTED_TYPES = ['texto', 'imagem', 'audio', 'video', 'documento', 'sticker']
    
    @staticmethod
    def process_media(message_data, tipo_mensagem, base64_data=None):
        """
        Processa qualquer tipo de mídia do WhatsApp de forma unificada.
        
        Args:
            message_data (dict): Dados da mensagem (imageMessage, audioMessage, etc.)
            tipo_mensagem (str): Tipo da mensagem ('imagem', 'audio', 'texto', etc.)
            base64_data (str): Dados base64 opcionais do payload principal
            
        Returns:
            dict: Resultado do processamento
        """
        result = {
            'success': False,
            'media_local_path': None,
            'filename': None,
            'size': None,
            'duration': None,
            'error': None,
            'conversion_applied': False
        }
        
        try:
            if tipo_mensagem == 'texto':
                result['success'] = True
                return result
            
            if tipo_mensagem not in WhatsAppMediaProcessor.SUPPORTED_TYPES:
                result['error'] = f"Tipo de mídia não suportado: {tipo_mensagem}"
                return result
            
            # Extrair dados básicos da mensagem
            media_url = message_data.get('url')
            media_key = message_data.get('mediaKey')
            file_enc_sha256 = message_data.get('fileEncSha256')
            mimetype = message_data.get('mimetype')
            file_length = message_data.get('fileLength')
            
            logger.info(f"🔄 Processando {tipo_mensagem} - URL: {'SIM' if media_url else 'NÃO'}, "
                       f"MediaKey: {'SIM' if media_key else 'NÃO'}, Base64: {'SIM' if base64_data else 'NÃO'}")
            
            # Estratégia 1: Processar de URL (preferencial para arquivos criptografados)
            if media_url:
                result = WhatsAppMediaProcessor._process_from_url(
                    media_url, tipo_mensagem, media_key, file_enc_sha256, mimetype
                )
                if result['success']:
                    return result
            
            # Estratégia 2: Processar de base64 (fallback)
            if base64_data:
                result = WhatsAppMediaProcessor._process_from_base64(
                    base64_data, tipo_mensagem, media_key, mimetype
                )
                if result['success']:
                    return result
            
            result['error'] = "Nenhuma fonte de mídia válida encontrada"
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro no processamento de mídia {tipo_mensagem}: {e}")
            result['error'] = str(e)
            return result
    
    @staticmethod
    def _process_from_url(media_url, tipo_mensagem, media_key, file_enc_sha256, mimetype):
        """Processa mídia a partir de URL (com suporte a descriptografia)"""
        result = {
            'success': False,
            'media_local_path': None,
            'filename': None,
            'size': None,
            'error': None,
            'conversion_applied': False
        }
        
        try:
            from .utils import baixar_e_salvar_media
            
            # Usar função existente que já suporta descriptografia
            download_result = baixar_e_salvar_media(
                media_url, 
                tipo_mensagem, 
                None,  # nome_original será gerado automaticamente
                media_key=media_key,
                file_enc_sha256=file_enc_sha256
            )
            
            if download_result['success']:
                result['success'] = True
                result['media_local_path'] = download_result['local_path']
                result['filename'] = download_result['filename']
                result['size'] = download_result.get('size')
                
                # Para áudios, aplicar conversão FFmpeg se necessário
                if tipo_mensagem == 'audio':
                    result = WhatsAppMediaProcessor._apply_audio_conversion(result)
                
                return result
            else:
                result['error'] = download_result.get('error', 'Erro no download')
                return result
                
        except Exception as e:
            logger.error(f"❌ Erro no processamento de URL: {e}")
            result['error'] = str(e)
            return result
    
    @staticmethod
    def _process_from_base64(base64_data, tipo_mensagem, media_key, mimetype):
        """Processa mídia a partir de dados base64"""
        result = {
            'success': False,
            'media_local_path': None,
            'filename': None,
            'size': None,
            'error': None,
            'conversion_applied': False
        }
        
        try:
            # Limpar dados base64
            base64_clean = base64_data.split(',')[-1] if ',' in base64_data else base64_data
            file_data = base64.b64decode(base64_clean)
            
            logger.info(f"📦 Dados base64 decodificados: {len(file_data)} bytes")
            
            # Verificar se precisa descriptografar
            if media_key and WhatsAppMediaProcessor._is_encrypted_data(file_data, tipo_mensagem):
                logger.info("🔓 Aplicando descriptografia aos dados base64...")
                
                media_type = 'audio' if tipo_mensagem == 'audio' else 'image'
                decrypted_data = WhatsAppDecryption.decrypt_media(file_data, str(media_key), media_type)
                
                if decrypted_data:
                    file_data = decrypted_data
                    logger.info(f"✅ Dados descriptografados: {len(file_data)} bytes")
                else:
                    logger.warning("⚠️ Descriptografia falhou, usando dados originais")
            
            # Para áudios, aplicar conversão FFmpeg
            if tipo_mensagem == 'audio':
                file_data = WhatsAppMediaProcessor._convert_audio_data(file_data)
                result['conversion_applied'] = True
            
            # Salvar arquivo
            save_result = WhatsAppMediaProcessor._save_media_file(
                file_data, tipo_mensagem, mimetype
            )
            
            if save_result['success']:
                result.update(save_result)
            else:
                result['error'] = save_result['error']
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro no processamento de base64: {e}")
            result['error'] = str(e)
            return result
    
    @staticmethod
    def _is_encrypted_data(file_data, tipo_mensagem):
        """Verifica se os dados estão criptografados baseado nos primeiros bytes"""
        if len(file_data) < 4:
            return False
        
        first_bytes = file_data[:4]
        
        if tipo_mensagem == 'audio':
            # Áudio não criptografado geralmente começa com 'OggS'
            return not first_bytes.startswith(b'OggS')
        elif tipo_mensagem == 'imagem':
            # Imagem JPEG não criptografada começa com 0xFF, 0xD8, 0xFF
            return not first_bytes.startswith(b'\xff\xd8\xff')
        
        return False
    
    @staticmethod
    def _convert_audio_data(audio_data):
        """Converte dados de áudio usando FFmpeg"""
        try:
            success, mp3_data, message = FFmpegService.convert_to_mp3(audio_data)
            
            if success and mp3_data:
                logger.info("🎵 Áudio convertido para MP3 com sucesso")
                return mp3_data
            else:
                logger.warning(f"⚠️ Conversão FFmpeg falhou: {message}. Usando áudio original.")
                return audio_data
                
        except Exception as e:
            logger.error(f"❌ Erro na conversão de áudio: {e}")
            return audio_data
    
    @staticmethod
    def _apply_audio_conversion(result):
        """Aplica conversão FFmpeg a um arquivo de áudio já salvo"""
        try:
            if not result['media_local_path']:
                return result
            
            # Ler arquivo salvo
            file_path = result['media_local_path'].replace('/media/', '')
            full_path = os.path.join(settings.MEDIA_ROOT, file_path)
            
            with open(full_path, 'rb') as f:
                audio_data = f.read()
            
            # Converter usando FFmpeg
            converted_data = WhatsAppMediaProcessor._convert_audio_data(audio_data)
            
            if converted_data != audio_data:  # Houve conversão
                # Salvar arquivo convertido
                subfolder = f"whatsapp_media/audio/{timezone.now().year}/{timezone.now().month:02d}"
                mp3_filename = f"audio_{uuid.uuid4().hex}.mp3"
                path = os.path.join(subfolder, mp3_filename)
                saved_path = default_storage.save(path, ContentFile(converted_data))
                
                result['media_local_path'] = default_storage.url(saved_path)
                result['filename'] = mp3_filename
                result['size'] = len(converted_data)
                result['conversion_applied'] = True
                
                logger.info(f"🎵 Áudio convertido e salvo como MP3: {result['filename']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na conversão pós-salvamento: {e}")
            return result
    
    @staticmethod
    def _save_media_file(file_data, tipo_mensagem, mimetype):
        """Salva arquivo de mídia no storage"""
        result = {
            'success': False,
            'media_local_path': None,
            'filename': None,
            'size': None,
            'error': None
        }
        
        try:
            # Determinar extensão e nome do arquivo
            if tipo_mensagem == 'audio':
                ext = '.mp3'  # Sempre MP3 após conversão
            elif tipo_mensagem == 'imagem':
                ext = mimetypes.guess_extension(mimetype) or '.jpg'
            else:
                ext = mimetypes.guess_extension(mimetype) or '.bin'
            
            # Gerar nome único
            filename = f"{tipo_mensagem}_{uuid.uuid4().hex}{ext}"
            subfolder = f"whatsapp_media/{tipo_mensagem}/{timezone.now().year}/{timezone.now().month:02d}"
            path = os.path.join(subfolder, filename)
            
            # Salvar arquivo
            saved_path = default_storage.save(path, ContentFile(file_data))
            
            result['success'] = True
            result['media_local_path'] = default_storage.url(saved_path)
            result['filename'] = filename
            result['size'] = len(file_data)
            
            logger.info(f"💾 {tipo_mensagem.capitalize()} salvo: {result['filename']} ({result['size']} bytes)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro ao salvar arquivo: {e}")
            result['error'] = str(e)
            return result