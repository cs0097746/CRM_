from django.db import models

# Create your models here.
# contatos/models.py

from django.db import models

class Contato(models.Model):
    # Informações básicas do contato
    nome = models.CharField(max_length=255)
    email = models.EmailField(unique=True) # Garante que não hajam emails duplicados
    telefone = models.CharField(max_length=20, blank=True, null=True, unique=True) # unique=True é bom aqui

    # Informações da empresa (pode ser um modelo separado no futuro)
    empresa = models.CharField(max_length=255, blank=True, null=True)
    cargo = models.CharField(max_length=100, blank=True, null=True)

    # Timestamps automáticos
    criado_em = models.DateTimeField(auto_now_add=True) # Data de criação
    atualizado_em = models.DateTimeField(auto_now=True) # Data da última atualização

    def __str__(self):
        return self.nome
    
class Interacao(models.Model):
    contato = models.ForeignKey(Contato, related_name='interacoes', on_delete=models.CASCADE)
    mensagem = models.TextField()
    remetente = models.CharField(max_length=20) # 'cliente' ou 'empresa'
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mensagem de {self.contato.nome} em {self.criado_em.strftime('%d/%m/%Y %H:%M')}"