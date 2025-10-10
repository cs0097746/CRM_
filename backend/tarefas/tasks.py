from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from atendimento.views import enviar_mensagem_whatsapp
import requests
import datetime
# Adicionando um import comum em contextos Django/Celery para melhor timestamp
from django.utils import timezone


def chamar_webhook_n8n(link_webhook_n8n, tipo_tarefa, destinatario):
    """
    Função auxiliar para enviar um POST ao webhook após a execução da tarefa.
    """
    if link_webhook_n8n:
        try:
            payload = {
                "status": "SUCESSO",
                "tipo_tarefa": tipo_tarefa,
                "destinatario": destinatario,
                "timestamp_execucao": timezone.now().isoformat()
            }
            # Envia a requisição POST com um timeout de 5 segundos para evitar travamentos do worker
            response = requests.post(link_webhook_n8n, json=payload, timeout=5)
            response.raise_for_status()  # Levanta exceção para erros HTTP 4xx/5xx
            print(f"✅ Webhook POST enviado com sucesso para: {link_webhook_n8n}. Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro ao chamar webhook {link_webhook_n8n}: {e}")
        except Exception as e:
            print(f"❌ Erro inesperado no webhook: {e}")


@shared_task
def enviar_email_task(destinatario, assunto, mensagem, link_webhook_n8n=""):
    success = False
    try:
        send_mail(
            subject=assunto,
            message=mensagem,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[destinatario],
            fail_silently=False,
        )
        print(f"✅ E-mail enviado para {destinatario}")
        success = True
    except Exception as e:
        print(f"❌ Erro ao enviar e-mail para {destinatario}: {e}")

    if success:
        chamar_webhook_n8n(link_webhook_n8n, "email", destinatario)


@shared_task
def enviar_whatsapp_task(destinatario, mensagem, link_webhook_n8n=""):
    success = False
    try:
        result = enviar_mensagem_whatsapp(
            numero=destinatario,
            mensagem=mensagem
        )
        print(f"📱 Mensagem WhatsApp enviada para {destinatario}: {mensagem}")
        success = True

        if success:
            chamar_webhook_n8n(link_webhook_n8n, "whatsapp", destinatario)

        return result
    except Exception as e:
        print(f"❌ Erro ao enviar WhatsApp para {destinatario}: {e}")
        return {"erro": str(e)}