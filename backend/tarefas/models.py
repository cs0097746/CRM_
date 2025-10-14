from django.db import models
from django.contrib.auth.models import User

class Tarefa(models.Model):
    TIPO_CHOICES = [
        ('email', 'E-mail'),
        ('whatsapp', 'WhatsApp'),
        ('webhook', 'Webhook'),
    ]

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, blank=False, null=False)
    destinatario = models.CharField(max_length=200)
    assunto = models.CharField(max_length=200, blank=True, null=True)
    mensagem = models.TextField()
    recorrencia_tipo = models.CharField(max_length=20)
    valor1 = models.CharField(max_length=100)
    valor2 = models.CharField(max_length=100, blank=True, null=True)
    criada_em = models.DateTimeField(auto_now_add=True)
    link_webhook_n8n = models.URLField(blank=True, null=True)

    precisar_enviar = models.BooleanField(default=True)
    codigo = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return f"{self.tipo} para {self.destinatario}"
