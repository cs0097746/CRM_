import logging
from django.core.mail import send_mail
from tarefas.models import Tarefa

logger = logging.getLogger(__name__)

def executar_acao_gatilho(gatilho, negocio):
    acao = gatilho.acao
    params = gatilho.parametros or {}

    try:
        if acao == "enviar_email":
            print("Acao enviar email")
            _acao_enviar_email(gatilho, negocio, params)

        elif acao == "criar_tarefa":
            print("Acao criar tarefa")
            _acao_criar_tarefa(gatilho, negocio, params)

        elif acao == "executar_webhook":
            print("Acao executar webhook")
            _acao_executar_webhook(gatilho, negocio, params)

        else:
            print("Acao desconhecida")
            logger.warning(f"[Gatilho {gatilho.id}] Ação desconhecida: {acao}")

    except Exception as e:
        logger.error(f"Erro ao executar gatilho {gatilho.id} ({gatilho.nome}): {e}")


# === Ações individuais ===========================================

def _acao_enviar_email(gatilho, negocio, params):
    assunto = params.get("assunto", f"Gatilho: {gatilho.nome}")
    mensagem = params.get(
        "mensagem",
        f"O negócio '{negocio}' foi atualizado (gatilho: {gatilho.nome})."
    )
    remetente = params.get("remetente", "no-reply@sistema.com")
    destinatarios = params.get("destinatarios", ["admin@sistema.com"])

    send_mail(
        subject=assunto,
        message=mensagem,
        from_email=remetente,
        recipient_list=destinatarios,
        fail_silently=False,
    )

    logger.info(f"[Gatilho {gatilho.id}] E-mail enviado para {destinatarios}.")


def _acao_criar_tarefa(gatilho, negocio, params):
    tipo = params.get("tipo", "email")
    destinatario = params.get("destinatario", "admin@sistema.com")
    assunto = params.get("assunto", f"Tarefa automática - {negocio}")
    descricao = params.get(
        "descricao",
        f"Tarefa gerada automaticamente pelo gatilho '{gatilho.nome}'."
    )
    precisar_enviar = params.get("precisar_enviar", True)

    Tarefa.objects.create(
        tipo=tipo,
        destinatario=destinatario,
        assunto=assunto,
        descricao=descricao,
        precisar_enviar=precisar_enviar,
    )

    logger.info(f"[Gatilho {gatilho.id}] Tarefa criada para {destinatario}.")


def _acao_executar_webhook(gatilho, negocio, params):
    import requests
    url = params.get("url")
    if not url:
        logger.warning(f"[Gatilho {gatilho.id}] Nenhuma URL configurada no webhook.")
        return

    payload = {
        "negocio_id": negocio.id,
        "negocio_nome": str(negocio),
        "evento": gatilho.evento,
        "gatilho": gatilho.nome,
        "estagio_id": getattr(negocio.estagio, "id", None),
        "estagio_nome": getattr(negocio.estagio, "nome", None),
    }

    resp = requests.post(url, json=payload, timeout=5)
    logger.info(f"[Gatilho {gatilho.id}] Webhook enviado para {url} ({resp.status_code}).")
