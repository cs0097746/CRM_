from django.contrib.auth.models import User
from django.db import models
from decimal import Decimal

class Comentario(models.Model):
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE)
    mensagem = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.mensagem

    class Meta:
        ordering = ['-criado_em']

class Negocio(models.Model):
    ORIGEM_CHOICES = [
        ('inbound', 'Inbound'),
        ('outbound', 'Outbound'),
        ('indicacao', 'Indicação'),
        ('evento', 'Evento'),
        ('redes_sociais', 'Redes Sociais'),
    ]

    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True, null=True)
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    contato = models.ForeignKey('contato.Contato', on_delete=models.CASCADE, related_name='negocios')
    estagio = models.ForeignKey('kanban.Estagio', on_delete=models.CASCADE, related_name='negocios')
    operador = models.ForeignKey('contato.Operador', on_delete=models.SET_NULL, null=True, blank=True, related_name='negocios')
    origem = models.CharField(max_length=20, choices=ORIGEM_CHOICES, default='inbound')
    probabilidade = models.PositiveIntegerField(default=50, help_text="Probabilidade de fechamento (0-100%)")
    data_prevista = models.DateField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    comentarios = models.ManyToManyField(Comentario, blank=True)

    atributos_personalizados = models.ManyToManyField('atributo.AtributoPersonalizavel', related_name='negocios', blank=True)

    def __str__(self):
        return f"{self.titulo} - {self.contato.nome}"

    @property
    def valor_formatado(self):
        return f"R$ {self.valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

    class Meta:
        verbose_name = "Negócio"
        verbose_name_plural = "Negócios"
        ordering = ['-criado_em']