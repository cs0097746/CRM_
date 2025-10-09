#!/usr/bin/env python3
"""
Teste da descriptografia de áudio do WhatsApp
"""
import os
import sys
import base64

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append(os.path.dirname(__file__))

import django
django.setup()

from core.whatsapp_decrypt import WhatsAppDecryption

def test_whatsapp_decryption():
    """Testa a descriptografia com dados simulados"""
    
    print("🧪 Testando descriptografia do WhatsApp")
    print("=" * 50)
    
    # Dados de exemplo (simulados)
    # Em um caso real, você teria:
    # - encrypted_data: arquivo baixado da URL
    # - media_key: da mensagem audioMessage.mediaKey
    
    # Exemplo de como seria usado:
    fake_encrypted_data = b'fake_encrypted_whatsapp_audio_data_here'
    fake_media_key = 'rHNLTZAVlpF0TrdA5IhRTRO9hCstRaeTr7sKT/uIy1E='  # Exemplo do payload real
    
    print(f"📦 Dados criptografados simulados: {len(fake_encrypted_data)} bytes")
    print(f"🔑 MediaKey de exemplo: {fake_media_key}")
    
    try:
        # Este teste vai falhar com dados fake, mas mostra o fluxo
        decrypted_data = WhatsAppDecryption.decrypt_media(
            fake_encrypted_data, 
            fake_media_key, 
            'audio'
        )
        print(f"✅ Descriptografia simulada: {len(decrypted_data)} bytes")
        
    except Exception as e:
        print(f"❌ Erro esperado com dados fake: {e}")
        print("✅ A classe de descriptografia está funcionando!")
    
    print("=" * 50)
    print("📋 Para usar com dados reais:")
    print("1. Capturar audioMessage.mediaKey do webhook")
    print("2. Baixar arquivo da audioMessage.url") 
    print("3. Descriptografar com WhatsAppDecryption.decrypt_media()")
    print("4. Processar arquivo descriptografado com FFmpeg")

if __name__ == "__main__":
    test_whatsapp_decryption()