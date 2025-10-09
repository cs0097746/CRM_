#!/usr/bin/env python3
"""
Verificar usuários e configuração do sistema
"""
import os
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append(os.path.dirname(__file__))

import django
django.setup()

from django.contrib.auth.models import User
from core.models import ConfiguracaoSistema

def check_users():
    """Verificar usuários cadastrados"""
    print("👤 Verificando usuários...")
    users = User.objects.all()
    
    for user in users:
        print(f"  - Username: {user.username}")
        print(f"    Email: {user.email}")
        print(f"    Active: {user.is_active}")
        print(f"    Staff: {user.is_staff}")
        print(f"    Superuser: {user.is_superuser}")
        print()

def check_whatsapp_config():
    """Verificar configuração do WhatsApp"""
    print("📱 Verificando configuração WhatsApp...")
    try:
        config = ConfiguracaoSistema.objects.first()
        if config:
            print(f"  - URL Evolution: {config.evolution_api_url}")
            print(f"  - Instance Name: {config.whatsapp_instance_name}")
            print(f"  - API Key: {'*' * 20 if config.evolution_api_key else 'NÃO CONFIGURADA'}")
        else:
            print("  ❌ Nenhuma configuração encontrada")
    except Exception as e:
        print(f"  ❌ Erro ao verificar configuração: {e}")

def main():
    print("🔍 Verificação do Sistema CRM")
    print("=" * 40)
    check_users()
    check_whatsapp_config()
    print("=" * 40)

if __name__ == "__main__":
    main()