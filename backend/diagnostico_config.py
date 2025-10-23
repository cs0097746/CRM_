#!/usr/bin/env python
"""
🔍 DIAGNÓSTICO DE CONFIGURAÇÃO
Verifica se Evolution API está configurada corretamente
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import ConfiguracaoSistema
from django.conf import settings

print("=" * 60)
print("🔍 DIAGNÓSTICO DE CONFIGURAÇÃO EVOLUTION API")
print("=" * 60)

# Verificar banco de dados
print("\n📊 CONFIGURAÇÃO NO BANCO DE DADOS:")
config = ConfiguracaoSistema.objects.first()

if config:
    print(f"✅ ConfiguracaoSistema encontrada (ID: {config.id})")
    print(f"   URL: {config.evolution_api_url or '❌ VAZIA'}")
    print(f"   API Key: {config.evolution_api_key[:20] + '...' if config.evolution_api_key else '❌ VAZIA'}")
    print(f"   Instance: {config.whatsapp_instance_name or '❌ VAZIA'}")
else:
    print("❌ NENHUMA configuração encontrada no banco!")

# Verificar settings.py
print("\n⚙️ CONFIGURAÇÃO NO SETTINGS.PY (FALLBACK):")
print(f"   EVOLUTION_API_URL: {getattr(settings, 'EVOLUTION_API_URL', '❌ NÃO DEFINIDO')}")
print(f"   API_KEY: {getattr(settings, 'API_KEY', '❌ NÃO DEFINIDO')[:20] + '...' if getattr(settings, 'API_KEY', None) else '❌ NÃO DEFINIDO'}")
print(f"   INSTANCE_NAME: {getattr(settings, 'INSTANCE_NAME', '❌ NÃO DEFINIDO')}")

# Verificar o que get_instance_config retorna
print("\n🔧 TESTANDO get_instance_config():")
from atendimento.utils import get_instance_config
config_result = get_instance_config()
print(f"   URL: {config_result.get('url') or '❌ VAZIA'}")
print(f"   API Key: {config_result.get('api_key')[:20] + '...' if config_result.get('api_key') else '❌ VAZIA'}")
print(f"   Instance: {config_result.get('instance_name') or '❌ VAZIA'}")

# Diagnóstico final
print("\n" + "=" * 60)
if config_result.get('url') and config_result.get('api_key') and config_result.get('instance_name'):
    print("✅ CONFIGURAÇÃO OK - Pronto para usar!")
else:
    print("❌ CONFIGURAÇÃO INCOMPLETA!")
    print("\n🔧 SOLUÇÃO:")
    print("   1. Acesse: https://backend.localhost/admin/core/configuracaosistema/")
    print("   2. Configure:")
    print("      - URL Evolution API")
    print("      - API Key")
    print("      - Instance Name")
    print("   3. Reinicie o backend")
print("=" * 60)
