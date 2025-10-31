from django.db import models
from django.utils import timezone
from datetime import timedelta
from plano.models import Plano
from django.contrib.auth.models import User

def default_vencimento():
    return timezone.now() + timedelta(days=30)

class PerfilUsuario(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="perfil_usuario")
    aceitou_termos = models.BooleanField(default=False)
    aceitou_quando = models.DateTimeField(null=True, blank=True)
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="usuario_criado_por")

    def __str__(self):
        return f"Perfil de {self.usuario.username}"

    @property
    def chefe(self):
        perfil = getattr(self.usuario, "profile", None)
        if perfil and perfil.criado_por:
            return perfil.criado_por
        return None

class PlanoUsuario(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    plano = models.ForeignKey(Plano, on_delete=models.CASCADE)

    adquirido_em = models.DateTimeField(default=timezone.now)
    vence_em = models.DateTimeField(default=default_vencimento)

    def __str__(self):
        return f"{self.usuario.username} - {self.plano.nome}"

    @property
    def chefe(self):
        return self.usuario.criado_por