"""
Script para buscar credenciais Evolution API salvas no banco
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from message_translator.models import CanalConfig

print("=" * 60)
print("🔍 BUSCANDO CREDENCIAIS SALVAS NO BANCO")
print("=" * 60)

canais = CanalConfig.objects.filter(tipo='evo').all()

if canais.exists():
    for canal in canais:
        print(f"\n📱 Canal: {canal.nome}")
        print(f"   ID: {canal.id}")
        print(f"   Base URL: {canal.credenciais.get('base_url', 'N/A')}")
        print(f"   API Key: {canal.credenciais.get('api_key', 'N/A')}")
        print(f"   Instance: {canal.credenciais.get('instance', 'N/A')}")
        print(f"   Ativo: {'Sim ✅' if canal.ativo else 'Não ❌'}")
        print(f"   Estado: {canal.credenciais.get('estado_conexao', 'N/A')}")
        print(f"   Criado por: {canal.criado_por.username}")
        print("-" * 60)
else:
    print("\n⚠️ Nenhum canal WhatsApp encontrado no banco!")

print("\n" + "=" * 60)
