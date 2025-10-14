from tarefas.models import Tarefa
from tarefas.tasks import enviar_email_task, enviar_whatsapp_task, enviar_webhook_task


def executar_acao_gatilho(gatilho, negocio):
    try:
        if gatilho.acao == "criar_tarefa":
            _acao_criar_tarefa(gatilho, negocio)
        else:
            print(f"[Gatilho {gatilho.id}] ⚠️ Ação desconhecida: {gatilho.acao}")
    except Exception as e:
        print(f"❌ Erro ao executar gatilho {gatilho.id} ({gatilho.nome}): {e}")


def _acao_criar_tarefa(gatilho, negocio):
    nota = gatilho.nota or f"Tarefa automática: {negocio}"
    tipo = gatilho.tarefa_relacionada
    codigo = negocio.id
    contato = negocio.contato

    email = contato.email if contato and contato.email else None
    telefone = contato.telefone if contato and contato.telefone else None

    if tipo == "email" and email:
        enviar_email_task.delay(email, f"Tarefa do gatilho: {gatilho.nome}", nota, "", True, codigo)
        print(f"[Gatilho {gatilho.id}] ✉️ E-mail enviado para {email}.")

    elif tipo == "whatsapp" and telefone:
        enviar_whatsapp_task.delay(telefone, nota, "", True, codigo)
        print(f"[Gatilho {gatilho.id}] 📱 WhatsApp enviado para {telefone}.")

    elif tipo == "webhook":
        destinatario = email or "Sistema"
        enviar_webhook_task.delay(destinatario, nota, gatilho.url_n8n or '', codigo)
        print(f"[Gatilho {gatilho.id}] 🌐 Webhook enviado com nota para {destinatario}.")

    else:
        Tarefa.objects.create(
            tipo=tipo or "email",
            destinatario=email or "admin@sistema.com",
            assunto=f"Tarefa automática - {negocio}",
            descricao=nota,
            precisar_enviar=True,
        )
        print(f"[Gatilho {gatilho.id}] 🗂️ Tarefa interna criada para {email or 'admin@sistema.com'}.")
