# backend/atendimento/utils.py - CRIAR NOVO ARQUIVO:

import os
import requests
import time
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import logging

logger = logging.getLogger(__name__)

def baixar_e_salvar_media(media_url, filename, tipo_media='arquivo'):
    """
    Baixa mídia do WhatsApp e salva localmente
    Retorna: (arquivo_local_url, sucesso, erro)
    """
    try:
        if not media_url:
            return None, False, "URL vazia"
            
        logger.info(f"📥 Baixando mídia: {filename}")
        
        # ✅ FAZER DOWNLOAD DA MÍDIA:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(media_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            # ✅ CRIAR PASTA SE NÃO EXISTIR:
            media_folder = f"whatsapp_media/{tipo_media}/{time.strftime('%Y/%m')}"
            
            # ✅ SALVAR ARQUIVO:
            file_path = f"{media_folder}/{filename}"
            saved_path = default_storage.save(file_path, ContentFile(response.content))
            
            # ✅ RETORNAR URL LOCAL:
            arquivo_url = f"{settings.MEDIA_URL}{saved_path}"
            
            logger.info(f"✅ Mídia salva: {arquivo_url}")
            return arquivo_url, True, None
            
        else:
            logger.error(f"❌ Erro HTTP {response.status_code}")
            return None, False, f"HTTP {response.status_code}"
            
    except Exception as e:
        logger.error(f"💥 Erro ao baixar mídia: {str(e)}")
        return None, False, str(e)