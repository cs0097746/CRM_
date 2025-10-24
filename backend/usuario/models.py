from django.db import models
from django.utils import timezone
from datetime import timedelta
from plano.models import Plano
from django.contrib.auth.models import User

User.add_to_class(
    "criado_por",
    models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usuarios_criados"
    )
)
# User.add_to_class(
#     "is_chefe",
#     models.BooleanField(default=False)
# )

def default_vencimento():
    return timezone.now() + timedelta(days=30)

class PlanoUsuario(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    plano = models.OneToOneField(Plano, on_delete=models.CASCADE)

    adquirido_em = models.DateTimeField(default=timezone.now)
    vence_em = models.DateTimeField(default=default_vencimento)

    def __str__(self):
        return f"{self.usuario.username} - {self.plano.nome}"

    @property
    def chefe(self):
        return self.usuario.criado_por