from celery import shared_task
from django.core.mail import send_mail
from datetime import datetime

@shared_task
def enviar_email(usuario_email):
    print(f"Enviando e-mail para {usuario_email} às {datetime.now()}")
    # send_mail(
    #     subject="Assunto do E-mail",
    #     message="Mensagem do e-mail",
    #     from_email="contatoloomie@gmail.com",
    #     recipient_list=[usuario_email],
    #     fail_silently=False,
    # )
