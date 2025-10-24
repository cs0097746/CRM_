"""
Serviço para descriptografar arquivos de mídia do WhatsApp
Baseado na especificação do WhatsApp Web Protocol
"""
import base64
import hashlib
import hmac
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)

class WhatsAppDecryption:
    """
    Classe para descriptografar arquivos de mídia do WhatsApp
    usando mediaKey e outros parâmetros de segurança
    """
    
    @staticmethod
    def decrypt_media(encrypted_data: bytes, media_key: str, media_type: str = 'audio') -> bytes:
        """
        Descriptografa dados de mídia do WhatsApp
        
        Args:
            encrypted_data: Dados criptografados baixados
            media_key: Chave de mídia em base64 do payload
            media_type: Tipo de mídia (audio, image, video, document)
            
        Returns:
            bytes: Dados descriptografados
        """
        try:
            logger.info(f"🔐 Iniciando descriptografia {media_type}")
            logger.info(f"🔑 MediaKey recebida: {media_key[:20]}...")
            logger.info(f"📦 Dados criptografados: {len(encrypted_data)} bytes")
            
            # Decodificar mediaKey de base64
            media_key_bytes = base64.b64decode(media_key)
            logger.info(f"🔑 MediaKey decodificada: {len(media_key_bytes)} bytes")
            
            # Expandir a chave usando HKDF (HMAC-based Key Derivation Function)
            expanded_key = WhatsAppDecryption._expand_media_key(media_key_bytes, media_type)
            
            # Extrair IV (16 bytes) e chave AES (32 bytes)
            iv = expanded_key[:16]
            cipher_key = expanded_key[16:48]
            mac_key = expanded_key[48:80]
            
            logger.info(f"🔐 IV: {len(iv)} bytes")
            logger.info(f"🔐 Cipher key: {len(cipher_key)} bytes") 
            logger.info(f"🔐 MAC key: {len(mac_key)} bytes")
            
            # Verificar integridade (MAC está nos últimos 10 bytes)
            if len(encrypted_data) < 10:
                raise ValueError("Arquivo muito pequeno para conter MAC")
                
            encrypted_content = encrypted_data[:-10]
            received_mac = encrypted_data[-10:]
            
            # Calcular MAC esperado
            expected_mac = WhatsAppDecryption._calculate_mac(mac_key, iv + encrypted_content)
            
            if received_mac != expected_mac:
                logger.warning("⚠️ MAC não confere - arquivo pode estar corrompido")
                # Continuar mesmo assim para tentar descriptografar
            
            # Descriptografar usando AES-CBC
            cipher = Cipher(
                algorithms.AES(cipher_key),
                modes.CBC(iv),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            decrypted_data = decryptor.update(encrypted_content) + decryptor.finalize()
            
            # Remover padding PKCS7
            decrypted_data = WhatsAppDecryption._remove_pkcs7_padding(decrypted_data)
            
            logger.info(f"✅ Descriptografia concluída: {len(decrypted_data)} bytes")
            
            # Verificar se é um arquivo OGG válido
            if media_type == 'audio' and decrypted_data.startswith(b'OggS'):
                logger.info("🎵 Arquivo OGG descriptografado válido!")
            
            return decrypted_data
            
        except Exception as e:
            logger.error(f"❌ Erro na descriptografia: {e}")
            raise
    
    @staticmethod
    def _expand_media_key(media_key: bytes, media_type: str) -> bytes:
        """
        Expande a mediaKey usando HKDF conforme especificação WhatsApp
        """
        # Info strings para diferentes tipos de mídia
        info_map = {
            'audio': b'WhatsApp Audio Keys',
            'image': b'WhatsApp Image Keys', 
            'video': b'WhatsApp Video Keys',
            'document': b'WhatsApp Document Keys'
        }
        
        info = info_map.get(media_type, b'WhatsApp Audio Keys')
        
        # HKDF Extract
        salt = b'\x00' * 32  # Salt vazio de 32 bytes
        prk = hmac.new(salt, media_key, hashlib.sha256).digest()
        
        # HKDF Expand - gerar 112 bytes (IV + AES key + MAC key + refKey)
        output_length = 112
        t = b''
        okm = b''
        counter = 1
        
        while len(okm) < output_length:
            t = hmac.new(prk, t + info + bytes([counter]), hashlib.sha256).digest()
            okm += t
            counter += 1
            
        return okm[:output_length]
    
    @staticmethod
    def _calculate_mac(mac_key: bytes, data: bytes) -> bytes:
        """
        Calcula MAC usando HMAC-SHA256 e retorna os primeiros 10 bytes
        """
        mac = hmac.new(mac_key, data, hashlib.sha256).digest()
        return mac[:10]
    
    @staticmethod
    def _remove_pkcs7_padding(data: bytes) -> bytes:
        """
        Remove padding PKCS7
        """
        if not data:
            return data
            
        padding_length = data[-1]
        
        # Verificar se o padding é válido
        if padding_length > 16 or padding_length == 0:
            logger.warning("⚠️ Padding PKCS7 inválido - retornando dados sem remoção")
            return data
            
        # Verificar se todos os bytes de padding são iguais
        for i in range(padding_length):
            if data[-(i+1)] != padding_length:
                logger.warning("⚠️ Padding PKCS7 inconsistente - retornando dados sem remoção")
                return data
                
        return data[:-padding_length]