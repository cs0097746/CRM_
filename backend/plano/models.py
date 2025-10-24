from django.db import models

class Plano(models.Model):
    nome = models.CharField(max_length=100)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    usuarios_inclusos = models.PositiveSmallIntegerField()
    contatos_inclusos = models.IntegerField()
    pipelines_inclusos = models.PositiveSmallIntegerField()

    def __str__(self):
        return f"{self.nome} - R${self.preco}"