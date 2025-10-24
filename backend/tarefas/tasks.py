from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from atendimento.views import enviar_mensagem_whatsapp
import requests
from django.utils import timezone

def chamar_webhook_n8n(link_webhook_n8n, tipo_tarefa, destinatario, codigo, mensagem):
    print("Link n8n", link_webhook_n8n)
    print("Tipo tarefa", tipo_tarefa)
    print("Destinatario", destinatario)
    print("Codigo", codigo)
    print("Mensagem", mensagem)

    if not link_webhook_n8n:
        return

    try:
        payload = {
            "status": "SUCESSO",
            "tipo_tarefa": tipo_tarefa,
            "destinatario": destinatario,
            "codigo": codigo,
            "mensagem": mensagem,
            "timestamp_execucao": timezone.now().isoformat()
        }
        response = requests.post(link_webhook_n8n, json=payload, timeout=5)
        response.raise_for_status()
        print(f"✅ Webhook enviado com sucesso para {link_webhook_n8n} (status {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao chamar webhook {link_webhook_n8n}: {e}")
    except Exception as e:
        print(f"❌ Erro inesperado no webhook: {e}")


@shared_task
def enviar_email_task(destinatario, assunto, mensagem, link_webhook_n8n="", precisar_enviar=True, codigo=None):
    success = False

    if precisar_enviar:
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
    else:
        print(f"⚠️ E-mail NÃO enviado (precisar_enviar=False) para {destinatario}")

    chamar_webhook_n8n(link_webhook_n8n, "email", destinatario, codigo, mensagem)

    return {"success": success}


@shared_task
def enviar_whatsapp_task(destinatario, mensagem, link_webhook_n8n="", precisar_enviar=True, codigo=None):
    success = False

    if precisar_enviar:
        try:
            result = enviar_mensagem_whatsapp(
                numero=destinatario,
                mensagem=mensagem
            )
            print(f"📱 WhatsApp enviado para {destinatario}: {mensagem}")
            success = True
        except Exception as e:
            print(f"❌ Erro ao enviar WhatsApp para {destinatario}: {e}")
    else:
        print(f"⚠️ WhatsApp NÃO enviado (precisar_enviar=False) para {destinatario}")

    chamar_webhook_n8n(link_webhook_n8n, "whatsapp", destinatario, codigo, mensagem)

    return {"success": success}

@shared_task
def enviar_webhook_task(destinatario, assunto, link_webhook_n8n, codigo=None):

    print("NA TASK AINDA")
    print("Destinatario", destinatario)
    print("Link webhook", link_webhook_n8n)
    print("Codigo", codigo)
    print("Assunto", assunto)

    chamar_webhook_n8n(link_webhook_n8n, "webhook", destinatario, codigo, assunto)


@shared_task
def desativar_atendimento_humano(conversa_id):
    """
    Desativa automaticamente o atendimento humano após o timer expirar
    """
    from atendimento.models import Conversa
    
    try:
        conversa = Conversa.objects.get(id=conversa_id)
        
        if conversa.atendimento_humano:
            agora = timezone.now()
            
            if conversa.atendimento_humano_ate and agora >= conversa.atendimento_humano_ate:
                conversa.atendimento_humano = False
                conversa.atendimento_humano_ate = None
                conversa.save()
                
                return {"success": True, "message": "Bot reativado", "conversa_id": conversa_id}
            else:
                tempo_restante = (conversa.atendimento_humano_ate - agora).total_seconds() if conversa.atendimento_humano_ate else 0
                return {"success": False, "message": "Ainda não expirou", "tempo_restante": tempo_restante}
        else:
            return {"success": True, "message": "Já estava desativado", "conversa_id": conversa_id}
            
    except Conversa.DoesNotExist:
        return {"success": False, "error": "Conversa não encontrada"}
    except Exception as e:
        return {"success": False, "error": str(e)}