from django.contrib.auth.models import User
from django.db import models

class Notificacao(models.Model):

    NOTIFICACAO_CHOICES = (
        ('boa', 'Boa'),
        ('alerta', 'Alerta'),
        ('erro', 'Erro'),
        ('info', 'Informação'),
    )

    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    lida = models.BooleanField(default=False)
    texto = models.TextField()
    tipo = models.CharField(max_length=11, choices=NOTIFICACAO_CHOICES)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.usuario.username}: {self.texto[:30]}"

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ['-criado_em']
