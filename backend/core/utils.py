from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json
from django.db import transaction
from django.contrib.auth.models import User

def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None

def get_ids_visiveis(user):

    subordinados = User.objects.filter(criado_por=user)

    colegas = User.objects.filter(criado_por=user.criado_por) if user.criado_por else User.objects.none()

    chefe = [user.criado_por.id] if user.criado_por else []

    ids_visiveis = (
            list(subordinados.values_list("id", flat=True)) +
            list(colegas.values_list("id", flat=True)) +
            chefe +
            [user.id]
    )

    ids_visiveis = list(set(ids_visiveis))

    return ids_visiveis