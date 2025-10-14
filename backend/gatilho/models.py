from django.db import models
from negocio.models import Negocio
from kanban.models import Estagio

class Gatilho(models.Model):
    EVENTO_CHOICES = [
        ('negocio_criado', 'Negócio Criado'),
        ('negocio_criado_em_x_estagio', 'Negócio Criado em Estágio X'),
        ('negocio_estagio_trocado', 'Negócio Trocou de Estágio'),
        ('negocio_estagio_trocado_de_x_para_y', 'Negócio Trocou de Estágio X para Y'),
    ]
    ACAO_CHOICES = [
        ('criar_tarefa', 'Criar Tarefa'),
    ]

    TAREFA_CHOICES = [
        ('email', 'E-mail'),
        ('whatsapp', 'WhatsApp'),
        ('webhook', 'Webhook'),
    ]

    nome = models.CharField(max_length=100)
    evento = models.CharField(max_length=50, choices=EVENTO_CHOICES)
    acao = models.CharField(
        max_length=50,
        choices=ACAO_CHOICES,
    )
    ativo = models.BooleanField(default=True)

    estagio_origem = models.ForeignKey(
        Estagio, null=True, blank=True,
        related_name='gatilhos_origem',
        on_delete=models.SET_NULL,
        help_text="Usado se o evento for 'criado_em_x_estagio' ou 'trocado_de_x_para_y' (origem)"
    )

    estagio_destino = models.ForeignKey(
        Estagio, null=True, blank=True,
        related_name='gatilhos_destino',
        on_delete=models.SET_NULL,
        help_text="Usado se o evento for 'trocado_de_x_para_y' (destino)"
    )

    nota = models.TextField(blank=True, null=True)
    tarefa_relacionada = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        choices=TAREFA_CHOICES,
    )
    url_n8n = models.URLField(
        blank=True,
        null=True,
    )
    def __str__(self):
        return f"{self.nome} ({self.evento})"

    class Meta:
        verbose_name = "Gatilho"
        verbose_name_plural = "Gatilhos"
