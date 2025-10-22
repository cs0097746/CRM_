# 🪝 Webhooks Customizados - Message Translator

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Características](#características)
3. [Configuração via Admin](#configuração-via-admin)
4. [Filtros Avançados](#filtros-avançados)
5. [Retry e Confiabilidade](#retry-e-confiabilidade)
6. [Exemplos de Uso](#exemplos-de-uso)
7. [API REST](#api-rest)
8. [Monitoramento](#monitoramento)

---

## 🎯 Visão Geral

Os **Webhooks Customizados** permitem que clientes configurem seus próprios endpoints para receber mensagens do Message Translator em tempo real, sem necessidade de modificar código.

### Arquitetura

```
WhatsApp/Telegram/etc
        ↓
  Evolution API
        ↓
  Message Translator
        ↓
    ┌────────────┬──────────┬──────────────┐
    ↓            ↓          ↓              ↓
   CRM          n8n    Custom Webhook  Custom Webhook
                          (Cliente A)     (Cliente B)
```

---

## ✨ Características

### 1. **Filtros Inteligentes**
- ✅ Filtrar por canal (WhatsApp, Telegram, Instagram, etc)
- ✅ Filtrar por direção (entrada, saída, ou ambas)
- ✅ Suporte a "todos" para receber de qualquer canal

### 2. **Configuração HTTP Flexível**
- 📤 Métodos: POST, PUT, PATCH
- 🔑 Headers customizados (autenticação, content-type, etc)
- ⏱️ Timeout configurável (1-60 segundos)

### 3. **Retry Automático**
- 🔄 Até 10 tentativas automáticas
- 📈 Exponential backoff (2s, 4s, 8s, 16s...)
- 🎛️ Ativação opcional

### 4. **Estatísticas em Tempo Real**
- 📊 Total de mensagens enviadas
- ❌ Total de erros
- 🕐 Última execução
- 📈 Taxa de sucesso

### 5. **Testes Integrados**
- 🧪 Testar webhook direto do Admin Django
- 📝 Payload de exemplo automático
- ✅ Validação antes de ativar

---

## 🛠️ Configuração via Admin

### Passo 1: Acessar Admin Django

```
http://backend.localhost/admin/message_translator/webhookcustomizado/
```

### Passo 2: Criar Novo Webhook

Clique em **"Adicionar Webhook Customizado"**

#### **Informações Básicas**

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Nome** | Identificador do webhook | `Webhook Cliente XYZ` |
| **URL** | Endpoint que receberá as mensagens | `https://api.cliente.com/webhook` |
| **Ativo** | Webhook está ativo? | ✅ Sim |
| **Método HTTP** | POST, PUT ou PATCH | `POST` |

#### **Filtros**

| Campo | Descrição | Valores |
|-------|-----------|---------|
| **Filtro Canal** | Qual canal? | `todos`, `whatsapp`, `telegram`, `instagram`, `evo` |
| **Filtro Direção** | Entrada/Saída? | `ambas`, `entrada`, `saida` |

#### **Configurações HTTP**

```json
// Headers (JSON)
{
  "Authorization": "Bearer seu-token-aqui",
  "X-API-Key": "abc123",
  "X-Client-ID": "cliente-xyz"
}
```

| Campo | Valor Padrão | Range |
|-------|--------------|-------|
| **Timeout** | 10 segundos | 1-60s |

#### **Retry e Confiabilidade**

| Campo | Descrição | Valor Padrão |
|-------|-----------|--------------|
| **Retry em Falha** | Tentar novamente? | ✅ Sim |
| **Max Tentativas** | Quantas vezes? | 3 (1-10) |

---

## 🔍 Filtros Avançados

### Filtro por Canal

```python
# Receber APENAS de WhatsApp
filtro_canal = "whatsapp"

# Receber APENAS de Telegram
filtro_canal = "telegram"

# Receber de TODOS os canais
filtro_canal = "todos"
```

### Filtro por Direção

```python
# Receber APENAS mensagens de ENTRADA (clientes → sistema)
filtro_direcao = "entrada"

# Receber APENAS mensagens de SAÍDA (sistema → clientes)
filtro_direcao = "saida"

# Receber AMBAS as direções
filtro_direcao = "ambas"
```

### Combinações Práticas

| Caso de Uso | Canal | Direção |
|-------------|-------|---------|
| Receber todas as mensagens do WhatsApp | `whatsapp` | `ambas` |
| Receber apenas mensagens recebidas | `todos` | `entrada` |
| Receber apenas mensagens enviadas pelo bot | `todos` | `saida` |
| Monitorar apenas Telegram (entrada + saída) | `telegram` | `ambas` |

---

## 🔄 Retry e Confiabilidade

### Como Funciona

```
Tentativa 1: ⚠️ Erro (timeout)
   ↓
Aguarda 2 segundos
   ↓
Tentativa 2: ⚠️ Erro (500)
   ↓
Aguarda 4 segundos
   ↓
Tentativa 3: ✅ Sucesso!
```

### Exponential Backoff

```python
# Tempo de espera = 2^tentativa segundos
Tentativa 1 → Erro → Espera 2s
Tentativa 2 → Erro → Espera 4s
Tentativa 3 → Erro → Espera 8s
Tentativa 4 → Erro → Espera 16s
Tentativa 5 → Erro → Espera 32s
```

### Configurar Retry

```python
# Desativar retry (falhou 1x = desiste)
retry_em_falha = False
max_tentativas = 1  # Ignorado se retry_em_falha = False

# Retry moderado (3 tentativas)
retry_em_falha = True
max_tentativas = 3

# Retry agressivo (10 tentativas)
retry_em_falha = True
max_tentativas = 10
```

---

## 📚 Exemplos de Uso

### Exemplo 1: Integração com Zapier

```json
{
  "nome": "Zapier Integration",
  "url": "https://hooks.zapier.com/hooks/catch/123456/abcdef",
  "ativo": true,
  "filtro_canal": "todos",
  "filtro_direcao": "entrada",
  "metodo_http": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "timeout": 10,
  "retry_em_falha": true,
  "max_tentativas": 3
}
```

### Exemplo 2: Sistema Interno (Autenticado)

```json
{
  "nome": "Sistema Interno - Cliente ABC",
  "url": "https://api.clienteabc.com/crm/webhook",
  "ativo": true,
  "filtro_canal": "whatsapp",
  "filtro_direcao": "ambas",
  "metodo_http": "POST",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "X-API-Key": "sk_live_abc123xyz",
    "X-Tenant-ID": "cliente-abc"
  },
  "timeout": 15,
  "retry_em_falha": true,
  "max_tentativas": 5
}
```

### Exemplo 3: Make.com (Integromat)

```json
{
  "nome": "Make.com Workflow",
  "url": "https://hook.us1.make.com/abc123def456",
  "ativo": true,
  "filtro_canal": "telegram",
  "filtro_direcao": "entrada",
  "metodo_http": "POST",
  "headers": {},
  "timeout": 10,
  "retry_em_falha": true,
  "max_tentativas": 3
}
```

---

## 🔌 API REST

### Listar Webhooks

```bash
GET http://backend.localhost/api/webhooks-customizados/

# Resposta
[
  {
    "id": 1,
    "nome": "Webhook Cliente XYZ",
    "url": "https://api.cliente.com/webhook",
    "ativo": true,
    "filtro_canal": "whatsapp",
    "filtro_direcao": "entrada",
    "total_enviados": 1250,
    "total_erros": 5,
    "ultima_execucao": "2025-01-21T14:30:00Z"
  }
]
```

### Criar Webhook

```bash
POST http://backend.localhost/api/webhooks-customizados/
Content-Type: application/json

{
  "nome": "Novo Webhook",
  "url": "https://api.exemplo.com/webhook",
  "ativo": true,
  "filtro_canal": "todos",
  "filtro_direcao": "ambas",
  "metodo_http": "POST",
  "headers": {
    "Authorization": "Bearer token123"
  },
  "timeout": 10,
  "retry_em_falha": true,
  "max_tentativas": 3
}
```

### Atualizar Webhook

```bash
PATCH http://backend.localhost/api/webhooks-customizados/1/
Content-Type: application/json

{
  "ativo": false
}
```

### Deletar Webhook

```bash
DELETE http://backend.localhost/api/webhooks-customizados/1/
```

---

## 📊 Monitoramento

### Ver Estatísticas

No Admin Django, você verá em tempo real:

```
┌─────────────────────────────────────────────────┐
│ Nome: Webhook Cliente XYZ                       │
│ URL: https://api.cliente.com/webhook            │
│ Status: ✅ Ativo                                 │
│                                                 │
│ 📊 Estatísticas:                                │
│   • Total Enviados: 1,250                       │
│   • Total Erros: 5                              │
│   • Taxa de Sucesso: 99.6%                      │
│   • Última Execução: 21/01/2025 14:30           │
└─────────────────────────────────────────────────┘
```

### Testar Webhook

1. Acesse o Admin Django
2. Selecione o(s) webhook(s) que deseja testar
3. No dropdown "Ações", escolha **"🧪 Testar webhook(s) selecionado(s)"**
4. Clique em **"Executar"**

O sistema enviará uma mensagem de teste:

```json
{
  "message_id": "loomie_abc123",
  "channel_type": "whatsapp",
  "sender": "whatsapp:5511999999999",
  "recipient": "system:test",
  "content_type": "text",
  "text": "🧪 Mensagem de teste do Message Translator",
  "timestamp": "2025-01-21T14:30:00Z",
  "status": "sent"
}
```

---

## 🔒 Segurança

### Boas Práticas

1. **Use HTTPS**: Sempre use URLs com `https://`
2. **Autenticação**: Configure headers com Bearer tokens ou API keys
3. **Validação**: Valide o payload recebido no seu endpoint
4. **Rate Limiting**: Implemente rate limiting no seu endpoint
5. **Logs**: Mantenha logs de todas as requisições recebidas

### Headers de Segurança Recomendados

```json
{
  "Authorization": "Bearer seu-token-secreto",
  "X-API-Key": "sua-api-key-secreta",
  "X-Webhook-Secret": "webhook-secret-para-validacao",
  "Content-Type": "application/json"
}
```

### Validar Origem

No seu endpoint, você pode validar que a requisição veio do Message Translator:

```python
# Exemplo em Python/Flask
from flask import request, abort

@app.route('/webhook', methods=['POST'])
def webhook():
    # Validar secret
    secret = request.headers.get('X-Webhook-Secret')
    if secret != 'webhook-secret-para-validacao':
        abort(401)
    
    # Processar payload
    payload = request.json
    # ...
```

---

## 🐛 Troubleshooting

### Webhook não está recebendo mensagens

1. ✅ Verifique se o webhook está **Ativo**
2. ✅ Verifique os **filtros** (canal e direção)
3. ✅ Teste manualmente usando a ação "🧪 Testar webhook"
4. ✅ Verifique os logs do Django: `docker-compose logs -f backend`

### Timeout constante

1. ⏱️ Aumente o **timeout** (padrão: 10s)
2. 🚀 Otimize o endpoint (responder rápido, processar depois)
3. 📊 Use processamento assíncrono no seu endpoint

### Erros 401/403

1. 🔑 Verifique os **headers** de autenticação
2. 🔐 Confirme que o token/API key está correto
3. ⏰ Verifique se o token não expirou

### Muitos erros (alta taxa de falha)

1. 📈 Aumente **max_tentativas**
2. 🔍 Verifique logs do seu endpoint
3. 🧪 Teste manualmente o endpoint com curl/Postman

---

## 📝 Logs

### Ver Logs em Tempo Real

```bash
# Ver logs do backend
docker-compose logs -f backend | grep "Webhook Customizado"

# Exemplo de saída
📤 [Webhook Customizado] Enviando para 'Webhook Cliente XYZ' (tentativa 1/3)
📤 [Webhook Customizado] URL: https://api.cliente.com/webhook
📤 [Webhook Customizado] Método: POST
✅ [Webhook Customizado] 'Webhook Cliente XYZ' - Status: 200
```

### Logs de Erro

```bash
❌ [Webhook Customizado] 'Webhook Cliente XYZ' - Erro HTTP: 500
❌ Response body: {"error": "Internal Server Error"}
🔄 [Webhook Customizado] Tentando novamente 'Webhook Cliente XYZ'...
```

---

## 🚀 Próximos Passos

1. ✅ **Configurar primeiro webhook** no Admin Django
2. 🧪 **Testar** usando a ação de teste
3. 📊 **Monitorar estatísticas** por alguns dias
4. 🔄 **Ajustar configurações** (timeout, retry, etc)
5. 🎯 **Integrar com n8n/Zapier/Make** se necessário

---

## 💡 Dicas

- 📝 Use nomes descritivos para os webhooks
- 🎯 Use filtros específicos para evitar mensagens desnecessárias
- ⏱️ Comece com timeout de 10s, ajuste conforme necessário
- 🔄 Ative retry para garantir entrega
- 📊 Monitore as estatísticas regularmente
- 🧪 Sempre teste novos webhooks antes de ativar em produção

---

## 📞 Suporte

Para dúvidas ou problemas:

1. 📖 Consulte a documentação completa
2. 🐛 Verifique os logs: `docker-compose logs -f backend`
3. 🧪 Teste com payload de exemplo
4. 📧 Entre em contato com o suporte técnico

---

**Última Atualização**: 21/01/2025  
**Versão**: 1.0.0
