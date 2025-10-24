"""
Script para listar todas as instâncias na Evolution API
"""
import requests
import json

BASE_URL = "http://localhost:8080"
API_KEY = "B6D711FCDE4D4FD5936544120E713976"

headers = {
    'apikey': API_KEY,
    'Content-Type': 'application/json'
}

print("=" * 60)
print("🔍 LISTANDO INSTÂNCIAS NA EVOLUTION API")
print("=" * 60)

try:
    # Endpoint para listar instâncias
    url = f"{BASE_URL}/instance/fetchInstances"
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        instances = response.json()
        
        if isinstance(instances, list) and len(instances) > 0:
            print(f"\n✅ Encontradas {len(instances)} instância(s):\n")
            
            for i, inst in enumerate(instances, 1):
                print(f"{i}. Nome: {inst.get('instance', {}).get('instanceName', 'N/A')}")
                print(f"   Estado: {inst.get('instance', {}).get('state', 'N/A')}")
                print(f"   Owner: {inst.get('instance', {}).get('owner', 'N/A')}")
                print(f"   Conectado: {'Sim' if inst.get('instance', {}).get('state') == 'open' else 'Não'}")
                print("-" * 60)
        else:
            print("\n⚠️ Nenhuma instância encontrada!")
            print("\nCrie uma instância primeiro:")
            print(f"POST {BASE_URL}/instance/create")
    else:
        print(f"\n❌ Erro: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\n❌ Erro ao conectar: {e}")
    print("\n💡 Verifique se:")
    print("   1. Evolution API está rodando na porta 8080")
    print("   2. API Key está correta")
    print("   3. Docker container 'evolution-api' está ativo")

print("\n" + "=" * 60)
