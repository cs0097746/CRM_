# 🔄 Webhook Evolution API - Novo Fluxo com Message Translator

## 📌 Como Era Antes (Antigo)

```bash
curl -X POST https://evo.loomiecrm.com/webhook/set/crm_teste_2025 \
  -H "apikey: 9EBCBE3B764B-487C-856C-523E78C5B5E3" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://backend.loomiecrm.com/webhook/evolution/",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

### Fluxo Antigo:
```
WhatsApp → Evolution API → /webhook/evolution/ → CRM (direto)
```

---

## 🆕 Como é Agora (Novo - Com Message Translator)

### Opção 1: **Webhook Duplo** (RECOMENDADO) ✅

**O QUE JÁ ESTÁ IMPLEMENTADO**: O endpoint `/webhook/evolution/` JÁ FAZ O WEBHOOK DUPLO automaticamente!

```python
# backend/atendimento/views.py - evolution_webhook()

def evolution_webhook(request):
    # ... processa mensagem normalmente para o CRM ...
    
    # 🆕 WEBHOOK DUPLO: Envia TAMBÉM para o Translator (em paralelo)
    def enviar_para_translator():
        try:
            translator_url = "http://backend:8000/translator/incoming/"
            payload_translator = {
                "canal_tipo": "whatsapp",
                "canal_id": None,  # Opcional
                "payload": payload  # Payload original da Evolution
            }
            requests.post(translator_url, json=payload_translator, timeout=5)
        except Exception as e:
            logger.error(f"Erro ao enviar para translator: {e}")
    
    # Envia em thread paralela (não bloqueia)
    threading.Thread(target=enviar_para_translator, daemon=True).start()
```

**Configuração**: **MESMA DE ANTES!** Não precisa mudar nada! 🎉

```bash
# MESMO comando de antes, funciona normalmente!
curl -X POST https://evo.loomiecrm.com/webhook/set/crm_teste_2025 \
  -H "apikey: 9EBCBE3B764B-487C-856C-523E78C5B5E3" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://backend.loomiecrm.com/webhook/evolution/",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

### Fluxo Novo (Automático):
```
WhatsApp → Evolution API → /webhook/evolution/
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
                       CRM                 /translator/incoming/
                  (fluxo antigo)            (novo - paralelo)
                                                    ↓
                                    ┌───────────────┼───────────────┐
                                    ↓               ↓               ↓
                                   n8n      Webhook Custom 1  Webhook Custom 2
```

---

### Opção 2: Webhook Direto para Translator (Alternativo)

Se você quiser que a Evolution envie **DIRETO** para o translator (sem passar pelo CRM):

```bash
curl -X POST https://evo.loomiecrm.com/webhook/set/crm_teste_2025 \
  -H "apikey: 9EBCBE3B764B-487C-856C-523E78C5B5E3" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://backend.loomiecrm.com/translator/incoming/",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

**Problema**: Vai precisar adicionar o CRM como destino no canal configurado!

---

## ✅ RECOMENDAÇÃO: Use a Opção 1 (Webhook Duplo)

### Vantagens:
- ✅ **Não precisa mudar nada** na configuração da Evolution
- ✅ CRM continua recebendo normalmente
- ✅ Translator recebe em paralelo (não bloqueia)
- ✅ Compatível com código existente
- ✅ Pode desativar Translator sem afetar CRM

### Configuração no Frontend (Nova Interface):

Quando criar um Canal Evolution API no Message Translator:

1. **Acesse**: http://crm.localhost/message-translator/canais
2. **Clique**: "Adicionar Canal"
3. **Preencha**:
   ```
   Nome: WhatsApp Principal
   Tipo: Evolution API (evo)
   Ativo: ✅ Sim
   
   Credenciais:
   {
     "base_url": "https://evo.loomiecrm.com",
     "api_key": "9EBCBE3B764B-487C-856C-523E78C5B5E3",
     "instance": "crm_teste_2025"
   }
   
   Recebe Entrada: ✅ Sim
   Envia Saída: ✅ Sim
   
   Destinos: ["crm", "n8n"]
   ```
4. **Salvar**

Pronto! O webhook duplo já está funcionando automaticamente.

---

## 🔧 Como Funciona Por Dentro

### Quando uma mensagem chega:

```
1. Evolution API recebe mensagem do WhatsApp
   ↓
2. Evolution envia POST para /webhook/evolution/
   ↓
3. evolution_webhook() processa:
   a) Salva no CRM (Contato + Conversa + Interacao) ✅
   b) Envia em paralelo para /translator/incoming/ ✅
   ↓
4. Translator processa:
   a) Converte para LoomieMessage
   b) Cria MensagemLog
   c) Roteia para destinos configurados:
      - CRM (cria outra Interacao) ⚠️ DUPLICAÇÃO!
      - n8n
      - Webhooks customizados
```

### ⚠️ ATENÇÃO: Duplicação de Interações!

Como o CRM já salva a Interação em `/webhook/evolution/`, e o Translator também pode salvar (se "crm" estiver nos destinos), você pode ter **duplicação**.

**Solução**:
- **Opção A**: Remover "crm" dos destinos do canal Translator (só usar n8n e webhooks custom)
- **Opção B**: Modificar `enviar_para_crm()` para checar se Interação já existe pelo `whatsapp_id`

**Recomendação**: Use Opção A por enquanto:

```json
// Destinos do canal (SEM crm)
["n8n"]  // Só n8n e webhooks customizados
```

---

## 🎯 Resumo para Você

### O que você precisa fazer:

**NADA!** 🎉

O webhook duplo **já está implementado** e funciona automaticamente. Continue usando o mesmo comando curl que você sempre usou:

```bash
curl -X POST https://evo.loomiecrm.com/webhook/set/crm_teste_2025 \
  -H "apikey: 9EBCBE3B764B-487C-856C-523E78C5B5E3" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://backend.loomiecrm.com/webhook/evolution/",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

### O que acontece agora:

1. ✅ CRM continua funcionando normalmente (Painel de Atendimento)
2. ✅ Translator recebe as mensagens em paralelo
3. ✅ Translator distribui para n8n e webhooks customizados
4. ✅ Você pode configurar canais e webhooks pelo frontend (vou criar agora)

---

## 📱 Testando Sem Evolution API

Enquanto a Evolution está fora, você pode testar o Translator diretamente:

### Teste 1: Simular mensagem de entrada

```bash
curl -X POST http://backend.localhost/translator/incoming/ \
  -H "Content-Type: application/json" \
  -d '{
    "canal_tipo": "whatsapp",
    "payload": {
      "data": {
        "key": {
          "remoteJid": "5511999999999@s.whatsapp.net",
          "fromMe": false,
          "id": "TEST123"
        },
        "message": {
          "conversation": "Teste do Message Translator"
        },
        "messageTimestamp": 1700000000,
        "pushName": "Teste User"
      }
    }
  }'
```

### Teste 2: Simular mensagem de saída

```bash
curl -X POST http://backend.localhost/translator/outgoing/ \
  -H "Content-Type: application/json" \
  -d '{
    "canal_tipo": "whatsapp",
    "destinatario": "5511999999999",
    "texto": "Resposta automática"
  }'
```

### Teste 3: Ver logs no Admin

```
http://backend.localhost/admin/message_translator/mensagemlog/
```

---

**Agora vou criar o frontend completo! 🚀**
