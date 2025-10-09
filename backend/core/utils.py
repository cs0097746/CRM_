from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json
from core.tasks import enviar_email
from django.db import transaction

def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None

from django_celery_beat.models import CrontabSchedule, PeriodicTask
import json
from django.db import transaction

def agendar_email_personalizado(email: str):
    try:
        with transaction.atomic():
            schedule, created = CrontabSchedule.objects.get_or_create(
                minute='*/5',  # A cada 5 minutos
                hour='*',
                day_of_week='*',
                day_of_month='*',
                month_of_year='*'
            )
            task_name = f'enviar_email_{email}'
            periodic_task, created = PeriodicTask.objects.get_or_create(
                name=task_name,
                defaults={
                    'task': 'core.tasks.enviar_email',
                    'crontab': schedule,
                    'args': json.dumps([email]),
                    'enabled': True,
                }
            )
            if not created:
                print(f"Tarefa '{task_name}' já existe.")
            else:
                print(f"Tarefa '{task_name}' agendada com sucesso.")
    except Exception as e:
        print(f"Erro ao agendar tarefa: {e}")

#agendar_email_personalizado('teste@exemplo.com')