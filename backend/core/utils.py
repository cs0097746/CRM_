from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json
from django.db import transaction
from django.contrib.auth.models import User

from usuario.models import PerfilUsuario


def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None

def get_ids_visiveis(user):
    try:
        perfil = PerfilUsuario.objects.get(usuario=user)
    except PerfilUsuario.DoesNotExist:
        return [user.id]

    subordinados = PerfilUsuario.objects.filter(criado_por=user)

    if perfil.criado_por:
        colegas = User.objects.filter(perfil_usuario__criado_por=perfil.criado_por)
        chefe = [perfil.criado_por.id]
    else:
        colegas = User.objects.none()
        chefe = []

    ids_visiveis = (
            list(subordinados.values_list("usuario_id", flat=True)) +
            list(colegas.values_list("id", flat=True)) +
            chefe +
            [user.id]
    )

    return list(set(ids_visiveis))