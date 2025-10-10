from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json
from django.db import transaction

def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None