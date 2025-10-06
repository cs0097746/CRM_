from celery import shared_task

@shared_task
def teste_celery():
    print("Celery está funcionando!")

from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json

# Criando uma schedule que roda todo dia às 9h
# schedule, created = CrontabSchedule.objects.get_or_create(
#     minute='0',
#     hour='9',
#     day_of_week='*',
#     day_of_month='*',
#     month_of_year='*',
# )
#
# # Criando a periodic task
# PeriodicTask.objects.create(
#     crontab=schedule,
#     name='Enviar email diário',
#     task='backend.tasks.send_email_task',
#     args=json.dumps(["Assunto teste", "Mensagem teste", ["user@example.com"]])
# )

# TAREFA UNICA
# from datetime import datetime, timedelta
#
# # data escolhida pelo usuário
# send_time = datetime(2025, 10, 7, 14, 30)
#
# send_email_task.apply_async(
#     args=["Assunto", "Mensagem", ["user@example.com"]],
#     eta=send_time
# )


# A CADA X
# from django_celery_beat.models import PeriodicTask, IntervalSchedule
# import json
#
# # Cria o intervalo (a cada 3 horas)
# schedule, created = IntervalSchedule.objects.get_or_create(
#     every=3,
#     period=IntervalSchedule.HOURS,  # Pode ser SECONDS, MINUTES, HOURS, DAYS
# )
#
# # Cria a task periódica
# PeriodicTask.objects.create(
#     interval=schedule,  # usa o intervalo criado
#     name='Enviar e-mail a cada 3 horas',
#     task='backend.tasks.send_email_task',
#     args=json.dumps(["Assunto teste", "Mensagem teste", ["user@example.com"]])
# )

# DAQUI X
# from datetime import timedelta
# from backend.tasks import send_email_task
#
# # Roda daqui a 5 horas
# send_email_task.apply_async(
#     args=["Assunto teste", "Mensagem teste", ["user@example.com"]],
#     countdown=5*3600  # 5 horas em segundos
# )
