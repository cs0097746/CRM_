#!/usr/bin/env python3
"""
Teste simples para verificar se a descriptografia WhatsApp está funcionando
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import base64
from core.whatsapp_decrypt import WhatsAppDecryption

def test_decryption():
    """Teste básico da descriptografia"""
    print("🔬 Testando sistema de descriptografia WhatsApp...")
    
    # Dados de exemplo (você pode substituir por dados reais dos logs)
    media_key = "X/G7zp7zN9h8XYbpcM8xaUl4yJJvVY2elmp82Z3Eguo="
    
    # Dados criptografados simulados (substitua por dados reais se disponível)
    sample_encrypted_data = b"sample_encrypted_data_for_testing"
    
    try:
        print(f"🔑 MediaKey: {media_key}")
        print(f"📊 Dados criptografados: {len(sample_encrypted_data)} bytes")
        
        # Testar descriptografia
        decrypted = WhatsAppDecryption.decrypt_media(sample_encrypted_data, media_key, 'audio')
        
        if decrypted:
            print(f"✅ Descriptografia funcionou! Resultado: {len(decrypted)} bytes")
            print(f"🔍 Primeiros bytes: {decrypted[:20] if len(decrypted) >= 20 else decrypted}")
        else:
            print("❌ Descriptografia retornou None")
            
    except Exception as e:
        print(f"❌ Erro na descriptografia: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_decryption()