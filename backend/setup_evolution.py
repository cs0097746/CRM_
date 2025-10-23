"""
🔧 CONFIGURAR EVOLUTION API
Execute: docker-compose exec backend python setup_evolution.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import ConfiguracaoSistema

print("=" * 70)
print("🔧 CONFIGURAÇÃO DA EVOLUTION API")
print("=" * 70)

# Verificar se já existe
config = ConfiguracaoSistema.objects.first()

if config:
    print(f"\n✅ Configuração existente encontrada (ID: {config.pk})")
    print(f"   URL atual: {config.evolution_api_url}")
    print(f"   Instance atual: {config.whatsapp_instance_name}")
    print(f"   API Key: {'*' * 20 if config.evolution_api_key else '❌ NÃO CONFIGURADA'}")
else:
    print("\n⚠️  Nenhuma configuração encontrada. Criando nova...")
    config = ConfiguracaoSistema.objects.create(
        nome_empresa='CRM Teste',
        cor_primaria='#1877f2',
        cor_secundaria='#42a5f5'
    )
    print(f"✅ Configuração criada (ID: {config.pk})")

# Configurar Evolution API
print("\n" + "=" * 70)
print("📝 CONFIGURANDO EVOLUTION API")
print("=" * 70)

# IMPORTANTE: AJUSTE ESTES VALORES!
EVOLUTION_URL = input("\n🌐 URL da Evolution API (ex: https://evo.seudominio.com): ").strip()
EVOLUTION_API_KEY = input("🔑 API Key da Evolution: ").strip()
INSTANCE_NAME = input("📱 Nome da Instância (ex: crm_teste_2025): ").strip()

if EVOLUTION_URL and EVOLUTION_API_KEY and INSTANCE_NAME:
    config.evolution_api_url = EVOLUTION_URL
    config.evolution_api_key = EVOLUTION_API_KEY
    config.whatsapp_instance_name = INSTANCE_NAME
    config.save()
    
    print("\n✅ CONFIGURAÇÃO SALVA COM SUCESSO!")
    print("=" * 70)
    print(f"   URL: {config.evolution_api_url}")
    print(f"   Instance: {config.whatsapp_instance_name}")
    print(f"   API Key: {config.evolution_api_key[:20]}...")
    print("=" * 70)
    
    print("\n🔄 Próximos passos:")
    print("   1. Reinicie o backend: docker-compose restart backend")
    print("   2. Configure o webhook na Evolution API:")
    print(f"      Webhook URL: https://SEU_NGROK.ngrok-free.app/translator/evolution-webhook/")
    print("   3. Teste enviando uma mensagem no WhatsApp")
else:
    print("\n❌ Configuração cancelada (campos vazios)")
