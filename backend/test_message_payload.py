"""
Teste simples do endpoint de envio de mensagem
"""
import json

# Simular payload que o frontend deveria estar enviando
test_payload = {
    "numero": "5555999566836",
    "mensagem": "Teste de envio de mensagem",
    "conversa_id": 1
}

print("📋 Payload de teste:")
print(json.dumps(test_payload, indent=2))

# Verificar se os campos estão presentes
required_fields = ['numero', 'mensagem']
missing_fields = []

for field in required_fields:
    if not test_payload.get(field):
        missing_fields.append(field)

if missing_fields:
    print(f"❌ Campos obrigatórios faltando: {', '.join(missing_fields)}")
else:
    print("✅ Todos os campos obrigatórios estão presentes")

print("\n" + "="*50)
print("CURL de teste (ajuste o token):")
print("="*50)

curl_command = f"""curl -X POST http://127.0.0.1:8000/whatsapp/enviar/ \\
  -H "Authorization: Token SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{json.dumps(test_payload)}'"""

print(curl_command)