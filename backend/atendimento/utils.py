# em: atendimento/utils.py

import requests
import os
import uuid
import traceback
from django.utils import timezone
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# ==============================================================================
# VERSÃO DEFINITIVA DA FUNÇÃO - PARA SER USADA EM TODO O PROJETO
# ==============================================================================
def get_instance_config():
    """Obtém configuração dinâmica do banco ou fallback para settings.py"""
    try:
        # Importa o model aqui dentro para evitar importações circulares
        from core.models import ConfiguracaoSistema
        config = ConfiguracaoSistema.objects.first()
        
        if config and config.evolution_api_key:
            logger.info("✅ Usando configuração do WhatsApp do banco de dados.")
            return {
                'url': config.evolution_api_url,
                'api_key': config.evolution_api_key,
                'instance_name': config.whatsapp_instance_name
            }
    except Exception as e:
        logger.warning(f"⚠️ Erro ao buscar config do banco: {e}. Usando fallback.")
    
    # Fallback para o arquivo settings.py se não encontrar no banco ou der erro
    logger.info("ℹ️ Usando configuração do WhatsApp do arquivo settings.py (fallback).")
    return {
        'url': getattr(settings, 'EVOLUTION_API_URL', ''),
        'api_key': getattr(settings, 'API_KEY', ''),
        'instance_name': getattr(settings, 'INSTANCE_NAME', '')
    }

# ==============================================================================
# FUNÇÃO DE DOWNLOAD QUE USA A CONFIGURAÇÃO ACIMA
# ==============================================================================
def baixar_e_salvar_media(media_url, tipo_mensagem, nome_original, media_key=None, file_enc_sha256=None):
    """
    Baixa a mídia da URL fornecida pela Evolution API e salva localmente.
    Para arquivos WhatsApp criptografados (.enc), descriptografa automaticamente.
    VERSÃO COM DESCRIPTOGRAFIA WHATSAPP.
    """
    print("\n--- INÍCIO DO DOWNLOAD DE MÍDIA ---")
    try:
        config = get_instance_config()
        api_key = config.get('api_key')
        
        if not api_key:
            print("❌ ERRO: API Key da Evolution não foi encontrada.")
            return {"success": False, "error": "API Key da Evolution não configurada."}

        print(f"🔑 Usando API Key que termina em: ...{api_key[-4:]}")
        print(f"🔗 Baixando da URL: {media_url}")

        # A URL da API da Evolution pode ou não precisar da API Key no header.
        # URLs do WhatsApp (`mmg.whatsapp.net`) não usam.
        # Por segurança, vamos incluir de qualquer forma.
        headers = {'apikey': api_key}
        
        response = requests.get(media_url, headers=headers, stream=True, timeout=30)
        
        print(f"📊 Status da Resposta HTTP: {response.status_code}")

        if response.status_code == 200:
            file_data = response.content
            print(f"✅ Download bem-sucedido. Tamanho do arquivo: {len(file_data)} bytes.")

            # Definir nome do arquivo inicial
            subfolder = f"whatsapp_media/{tipo_mensagem}/{timezone.now().year}/{timezone.now().month:02d}"
            filename = nome_original or f"{tipo_mensagem}_{uuid.uuid4().hex}"
            
            # Detectar se é arquivo WhatsApp criptografado (.enc na URL)
            is_encrypted = '.enc' in media_url and media_key is not None
            
            if is_encrypted and tipo_mensagem == 'audio':
                print(f"🔐 Detectado arquivo WhatsApp criptografado - iniciando descriptografia...")
                print(f"🔑 MediaKey disponível: {'SIM' if media_key else 'NÃO'}")
                
                try:
                    from core.whatsapp_decrypt import WhatsAppDecryption
                    decrypted_data = WhatsAppDecryption.decrypt_media(file_data, str(media_key), 'audio')
                    
                    if decrypted_data:
                        print(f"✅ Arquivo descriptografado com sucesso: {len(decrypted_data)} bytes")
                        file_data = decrypted_data
                        
                        # Mudar extensão para .ogg já que foi descriptografado
                        if filename.endswith('.enc'):
                            filename = filename.replace('.enc', '.ogg')
                        elif '.ogg' not in filename:
                            filename = filename + '.ogg'
                        
                    else:
                        print("❌ Descriptografia falhou - salvando arquivo original criptografado")
                        
                except Exception as e:
                    print(f"❌ Erro na descriptografia: {e}")
                    print("⚠️ Salvando arquivo original criptografado como fallback")
            path = os.path.join(subfolder, filename)
            
            print(f"💾 Salvando arquivo em: {path}")
            saved_path = default_storage.save(path, ContentFile(file_data))
            
            print("--- FIM DO DOWNLOAD (SUCESSO) ---\n")
            return {
                "success": True,
                "local_path": default_storage.url(saved_path),
                "filename": os.path.basename(saved_path),
                "size": default_storage.size(saved_path)
            }
        else:
            print(f"❌ ERRO HTTP {response.status_code}. Conteúdo da resposta: {response.text[:200]}")
            print("--- FIM DO DOWNLOAD (ERRO HTTP) ---\n")
            return {"success": False, "error": f"Erro HTTP {response.status_code}."}
            
    except Exception as e:
        print(f"💥 EXCEÇÃO CRÍTICA no download: {str(e)}")
        traceback.print_exc() # Imprime o traceback completo para vermos a linha do erro
        print("--- FIM DO DOWNLOAD (EXCEÇÃO) ---\n")
        return {"success": False, "error": f"Exceção ao baixar: {str(e)}"}