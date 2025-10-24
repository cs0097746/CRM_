"""
Script para verificar e configurar webhook na Evolution API
"""
import requests
import json

# 🔧 CONFIGURAÇÕES (ajuste com suas credenciais)
BASE_URL = "https://evo.loomiecrm.com"  # URL da Evolution API
API_KEY = "9EBCBE3B764B-487C-856C-523E78C5B5E3"  # Sua API Key
INSTANCE = "crm_teste_2025"  # Nome da instância

headers = {
    'apikey': API_KEY,
    'Content-Type': 'application/json'
}

def verificar_webhook():
    """Verifica webhook atual configurado"""
    print(f"\n🔍 Verificando webhook da instância {INSTANCE}...")
    
    url = f"{BASE_URL}/webhook/find/{INSTANCE}"
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Webhook atual:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        else:
            print(f"\n❌ Erro ao buscar webhook: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        return None


def configurar_webhook(webhook_url):
    """Configura webhook para a instância"""
    print(f"\n🔧 Configurando webhook para {INSTANCE}...")
    print(f"📡 URL: {webhook_url}")
    
    url = f"{BASE_URL}/webhook/set/{INSTANCE}"
    
    payload = {
        "webhook": {
            "enabled": True,
            "url": webhook_url,
            "webhook_by_events": False,
            "webhook_base64": True,
            "events": [
                "QRCODE_UPDATED",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "MESSAGES_DELETE",
                "SEND_MESSAGE",
                "CONNECTION_UPDATE"
            ]
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200 or response.status_code == 201:
            print(f"\n✅ Webhook configurado com sucesso!")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            return True
        else:
            print(f"\n❌ Erro ao configurar webhook: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("🔧 EVOLUTION API - WEBHOOK MANAGER")
    print("=" * 60)
    
    # Verificar webhook atual
    webhook_atual = verificar_webhook()
    
    print("\n" + "=" * 60)
    print("\n📝 PRÓXIMOS PASSOS:")
    print("\n1. Inicie o ngrok:")
    print("   ngrok http 8000")
    print("\n2. Copie a URL do ngrok (ex: https://abc123.ngrok.io)")
    print("\n3. Configure o webhook com este script:")
    print("   python test_webhook_config.py --set https://abc123.ngrok.io/translator/incoming/")
    print("\n" + "=" * 60)
    
    # Se passar --set como argumento
    import sys
    if len(sys.argv) > 2 and sys.argv[1] == "--set":
        webhook_url = sys.argv[2]
        configurar_webhook(webhook_url)
