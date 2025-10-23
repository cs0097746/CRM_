"""
Verificar como áudios estão sendo salvos
"""
import os
import sys
import django

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from atendimento.models import Interacao

print("=" * 80)
print("🔍 VERIFICANDO INTERAÇÕES DE ÁUDIO")
print("=" * 80)

# Buscar últimas interações de áudio
audios = Interacao.objects.filter(tipo='audio').order_by('-criado_em')[:5]

if not audios.exists():
    print("\n❌ Nenhuma interação de áudio encontrada")
else:
    print(f"\n✅ Encontradas {audios.count()} interações de áudio:\n")
    
    for i, audio in enumerate(audios, 1):
        print(f"📝 Áudio #{i}")
        print(f"   ID: {audio.id}")
        print(f"   Conversa: {audio.conversa_id}")
        print(f"   Mensagem: {audio.mensagem[:100]}")
        print(f"   Tipo: {audio.tipo}")
        print(f"   WhatsApp ID: {audio.whatsapp_id}")
        print(f"   Media URL: {audio.media_url}")
        print(f"   Media Filename: {audio.media_filename}")
        print(f"   Media Size: {audio.media_size}")
        print(f"   Media Duration: {audio.media_duration}")
        print(f"   Media Mimetype: {audio.media_mimetype}")
        print(f"   Criado: {audio.criado_em}")
        print("-" * 80)
