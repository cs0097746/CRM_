"""
Teste do endpoint de envio de mensagem
"""
import requests
import json

# Configurações
backend_url = "http://127.0.0.1:8000/"  # URL do Django
test_phone = "5555999566836"  # Número de teste (ajuste conforme necessário)
test_message = "🧪 Teste de envio via API - CRM funcionando!"

def get_auth_token():
    """Obtém token de autenticação"""
    token_url = f"{backend_url}o/token/"
    
    data = {
        'grant_type': 'password',
        'username': 'admin',  # Ajuste conforme seu usuário
        'password': 'admin123',  # Ajuste conforme sua senha
        'client_id': 'KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz',
    }
    
    try:
        response = requests.post(token_url, data=data)
        print(f"Token response status: {response.status_code}")
        print(f"Token response body: {response.text}")
        
        if response.status_code == 200:
            return response.json().get('access_token')
        else:
            print(f"❌ Erro ao obter token: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Erro na requisição de token: {e}")
        return None

def test_send_message():
    """Testa o envio de mensagem"""
    print("🧪 Testando envio de mensagem...")
    
    # Obter token
    token = get_auth_token()
    if not token:
        print("❌ Não foi possível obter token de autenticação")
        return False
    
    print(f"✅ Token obtido: {token[:20]}...")
    
    # Preparar dados da mensagem
    send_url = f"{backend_url}whatsapp/enviar/"
    
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'numero': test_phone,
        'mensagem': test_message,
        'conversa_id': None  # Opcional
    }
    
    print(f"📤 Enviando para: {send_url}")
    print(f"📦 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(send_url, json=payload, headers=headers)
        
        print(f"📊 Status da resposta: {response.status_code}")
        print(f"📄 Resposta completa: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Mensagem enviada com sucesso!")
                return True
            else:
                print(f"❌ Erro na resposta: {result.get('error')}")
                return False
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            print(f"📄 Erro detalhado: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando teste de envio de mensagem")
    print("=" * 50)
    
    success = test_send_message()
    
    print("=" * 50)
    print(f"Resultado: {'✅ SUCESSO' if success else '❌ FALHA'}")