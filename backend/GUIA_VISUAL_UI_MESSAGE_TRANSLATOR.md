# 🎨 GUIA VISUAL UI - MESSAGE TRANSLATOR

## 📋 Visão Geral

A interface do Message Translator foi completamente redesenhada com **cards visuais** para facilitar a conexão de canais de comunicação. Agora você conecta WhatsApp, Instagram, Telegram e outros canais com apenas alguns cliques!

---

## 🟢 **NOVA INTERFACE: Cards Visuais**

### Layout Principal

```
┌─────────────────────────────────────────────────────────┐
│  Message Translator                     [🔄 Atualizar]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ WhatsApp │  │Instagram │  │ Telegram │  │  Chat   ││
│  │   🟢     │  │   🔴     │  │   🔴     │  │ Widget  ││
│  │ [Conectar│  │ [Em breve│  │ [Em breve│  │[Em breve││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
│                                                         │
│  📊 Gestão Avançada                                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Tabela com canais conectados...                  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **FASE 1: Conectar WhatsApp Evolution API**

### Pré-requisitos

1. **Evolution API rodando** (`https://evo.loomiecrm.com` ou outro domínio)
2. **Instância criada** (ex: `crm_teste_2025`)
3. **QR Code escaneado** (WhatsApp conectado)
4. **API Key gerada** (ex: `B6D711FCDE4D4FD5936544120E713976`)

---

### Passo a Passo

#### 1️⃣ **Acessar Message Translator**

```
http://localhost:3000/message-translator
```

Você verá 4 cards:
- ✅ **WhatsApp** - Habilitado
- ⚠️ **Instagram** - Em breve
- ⚠️ **Telegram** - Em breve
- ⚠️ **Chat Widget** - Em breve

---

#### 2️⃣ **Clicar em "Conectar" no Card WhatsApp**

O modal de configuração abrirá com os seguintes campos:

| Campo         | Exemplo                                  | Obrigatório |
|---------------|------------------------------------------|-------------|
| Nome do Canal | `WhatsApp Atendimento`                   | Não         |
| Base URL      | `https://evo.loomiecrm.com`              | **Sim**     |
| API Key       | `B6D711FCDE4D4FD5936544120E713976`       | **Sim**     |
| Instância     | `crm_teste_2025`                         | **Sim**     |

---

#### 3️⃣ **Preencher Credenciais**

**Exemplo de preenchimento:**

```yaml
Nome do Canal: WhatsApp Principal
Base URL: https://evo.loomiecrm.com
API Key: B6D711FCDE4D4FD5936544120E713976
Instance: crm_teste_2025
```

---

#### 4️⃣ **Clicar em "Conectar WhatsApp"**

O sistema irá:

1. **Validar credenciais** com Evolution API
2. **Verificar estado da conexão** (`state == 'open'`)
3. **Salvar configuração** no banco de dados
4. **Configurar webhook automaticamente** no Evolution API
5. **Exibir mensagem de sucesso**

---

### 🎉 **Resultado Esperado**

Após conexão bem-sucedida:

1. **Card do WhatsApp atualiza**:
   - Status: `🟢 Conectado`
   - Botão: `[Gerenciar]` (antes era "Conectar")

2. **Tabela de Gestão Avançada** exibe o canal:
   ```
   Nome                 | Tipo | Status     | Prioridade
   ---------------------|------|------------|------------
   WhatsApp Principal   | EVO  | 🟢 Ativo   | 100
   ```

3. **Alert verde** no topo:
   ```
   ✅ WhatsApp conectado com sucesso! Canal ID: 1
   ```

---

## 🔴 **Tratamento de Erros**

### 1️⃣ **API Key Inválida**

**Erro:**
```
❌ API Key inválida. Verifique suas credenciais.
```

**Solução:**
- Verifique se a API Key foi copiada corretamente
- Gere uma nova API Key na Evolution API

---

### 2️⃣ **Instância Não Encontrada**

**Erro:**
```
❌ Instância "crm_teste_2025" não encontrada. Verifique o nome da instância.
```

**Solução:**
- Verifique se a instância existe no Evolution API
- Acesse `https://evo.loomiecrm.com/instance/fetchInstances`
- Confirme o nome exato da instância

---

### 3️⃣ **WhatsApp Não Conectado**

**Erro:**
```
❌ WhatsApp não está conectado. Estado atual: close. Por favor, escaneie o QR Code.
```

**Solução:**
1. Acesse Evolution API
2. Vá até sua instância
3. Escaneie o QR Code com WhatsApp
4. Aguarde estado mudar para `open`
5. Tente conectar novamente

---

### 4️⃣ **Timeout na Conexão**

**Erro:**
```
❌ Timeout ao conectar com Evolution API. Verifique a URL.
```

**Solução:**
- Verifique se a URL está correta
- Teste acessar `https://evo.loomiecrm.com` no navegador
- Verifique firewall/VPN

---

### 5️⃣ **Servidor Indisponível**

**Erro:**
```
❌ Não foi possível conectar ao servidor Evolution API. Verifique a URL.
```

**Solução:**
- Confirme que Evolution API está rodando
- Ping/telnet no servidor
- Verifique DNS

---

## 📊 **Status da Conexão**

### Estados Possíveis

| Estado       | Badge             | Ação          |
|--------------|-------------------|---------------|
| Desconectado | 🔴 Desconectado   | [Conectar]    |
| Conectado    | 🟢 Conectado      | [Gerenciar]   |
| Em breve     | ⚠️ Em breve       | [Desabilitado]|

---

## 🔧 **Gestão Avançada**

Abaixo dos cards, há uma **tabela de gestão avançada** para usuários experientes:

### Funcionalidades

- ✏️ **Editar** - Modificar credenciais
- 🗑️ **Deletar** - Remover canal
- ➕ **Configuração Manual** - Adicionar canal manualmente (avançado)

---

## 🧪 **Testando a Conexão**

### 1️⃣ **Verificar Canal no Banco**

```sql
SELECT id, nome, tipo, ativo, configuracao 
FROM message_translator_canalconfig 
WHERE tipo = 'evo';
```

**Resultado esperado:**
```
id | nome                | tipo | ativo | configuracao
---|---------------------|------|-------|--------------------
1  | WhatsApp Principal  | evo  | true  | {...credenciais...}
```

---

### 2️⃣ **Enviar Mensagem de Teste**

1. Envie um WhatsApp para o número conectado
2. Acesse tab **"Logs de Mensagens"**
3. Verifique se apareceu um novo log:

```
Message ID              | Direção | Status    | Canal Origem
------------------------|---------|-----------|------------------
loomie_abc123...        | Entrada | Sucesso   | WhatsApp Principal
```

---

### 3️⃣ **Verificar no CRM (Atendimento)**

1. Vá para **Atendimento** no menu
2. Procure a conversa com o remetente
3. Confirme que a mensagem apareceu

---

## 🎯 **Próximos Canais (Em Desenvolvimento)**

### 🔵 **Instagram Direct**

**Status:** Em breve  
**Descrição:** Conecte seu Instagram Business para responder Direct Messages  
**Requisitos:**
- Conta Instagram Business
- Token de acesso Meta
- Webhook configurado

---

### 🟣 **Telegram Bot**

**Status:** Em breve  
**Descrição:** Conecte seu bot do Telegram para atender clientes  
**Requisitos:**
- Bot criado no @BotFather
- Token do bot
- Webhook configurado

---

### 🟠 **Chat Widget**

**Status:** Em breve  
**Descrição:** Adicione um chat ao vivo em seu site  
**Requisitos:**
- Domínio configurado
- Script de incorporação
- Customização de cores/logo

---

## 🔐 **Segurança**

### Multi-Tenancy

Todos os canais são isolados por usuário (`criado_por`):

```python
# Backend automático:
canal.criado_por = request.user
canal.atualizado_por = request.user
```

**Resultado:** Cada usuário vê apenas seus próprios canais.

---

### Credenciais Sensíveis

- API Keys são armazenadas no campo `configuracao` (JSON)
- **NÃO** são retornadas em `GET /translator/canais/` por padrão
- Use `write_only=True` no serializer para proteger

---

## 📦 **Arquivos Criados/Modificados**

### Backend

| Arquivo                        | Mudança                       |
|--------------------------------|-------------------------------|
| `views.py`                     | + `conectar_whatsapp()`       |
| `urls.py`                      | + `/conectar-whatsapp/`       |

### Frontend

| Arquivo                        | Mudança                       |
|--------------------------------|-------------------------------|
| `CanalCard.tsx`                | ✨ Novo componente            |
| `WhatsAppDialog.tsx`           | ✨ Novo componente            |
| `MessageTranslator.tsx`        | 🔄 Tab 0 com grid de cards    |

---

## ⚡ **Performance**

- **Tempo de resposta**: ~200-500ms (teste de conexão Evolution API)
- **Timeout padrão**: 10 segundos
- **Retry**: Não configurado (usuário pode tentar novamente manualmente)

---

## 🐛 **Troubleshooting**

### Problema 1: Card não atualiza após conexão

**Solução:**
```typescript
// Forçar reload:
carregarDados();
```

Ou clique no botão **🔄 Atualizar** no header.

---

### Problema 2: Webhook não está sendo configurado

**Log esperado:**
```
✅ Webhook configurado: https://seu-dominio.com/translator/incoming/
```

**Se aparecer:**
```
⚠️ Falha ao configurar webhook: ...
```

**Solução:**
Configure manualmente no Evolution API:
```bash
POST https://evo.loomiecrm.com/webhook/set/crm_teste_2025
{
  "enabled": true,
  "url": "https://seu-dominio.com/translator/incoming/",
  "events": ["MESSAGES_UPSERT"]
}
```

---

### Problema 3: Erro CORS ao conectar

**Sintoma:**
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS
```

**Solução:**
Verifique `backend/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://crm.localhost",
]
```

---

## 📚 **Referências**

- **Evolution API Docs**: https://doc.evolution-api.com
- **Material-UI Cards**: https://mui.com/material-ui/react-card/
- **React Hook Forms**: https://react-hook-form.com

---

## ✅ **Checklist de Validação**

- [ ] Backend endpoint `/conectar-whatsapp/` responde
- [ ] Frontend exibe 4 cards (WhatsApp + 3 "Em breve")
- [ ] Card do WhatsApp mostra status "Desconectado" inicial
- [ ] Modal abre ao clicar "Conectar"
- [ ] Validação de campos obrigatórios funciona
- [ ] Erro aparece se API Key inválida
- [ ] Sucesso exibe alert verde
- [ ] Card atualiza para "Conectado"
- [ ] Botão muda para "Gerenciar"
- [ ] Canal aparece na tabela de gestão
- [ ] Mensagem de teste chega no CRM
- [ ] Log salvo em `message_translator_mensagemlog`

---

## 🎉 **Conclusão**

A nova **UI visual com cards** torna a conexão de canais muito mais intuitiva! 

**Próximos passos:**
1. ✅ WhatsApp Evolution API (CONCLUÍDO)
2. 🔜 Instagram Direct (Em desenvolvimento)
3. 🔜 Telegram Bot (Em desenvolvimento)
4. 🔜 Chat Widget (Em desenvolvimento)

---

**Dúvidas?** Consulte este guia ou os logs do backend:
```bash
docker compose logs backend --tail=50
```
