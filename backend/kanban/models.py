from django.db import models

class Kanban(models.Model):
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    estagios = models.ManyToManyField('Estagio')

    def __str__(self):
        return self.nome

class Estagio(models.Model):
    nome = models.CharField(max_length=50)
    descricao = models.TextField(blank=True, null=True)
    ordem = models.PositiveIntegerField(default=0)
    cor = models.CharField(max_length=7, default='#007bff')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

    class Meta:
        verbose_name = "Estágio"
        verbose_name_plural = "Estágios"
        ordering = ['ordem', 'nome']
