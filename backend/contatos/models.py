from django.db import models
from django.contrib.auth.models import User


class Contato(models.Model):
    # Informações básicas do contato
    nome = models.CharField(max_length=255)
    email = models.EmailField(unique=True, null=True, blank=True)
    telefone = models.CharField(max_length=20, unique=True)

    # Informações da empresa (pode ser um modelo separado no futuro)
    empresa = models.CharField(max_length=255, blank=True, null=True)
    cargo = models.CharField(max_length=100, blank=True, null=True)

    # Timestamps automáticos
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome


class Operador(models.Model):
    # Link um-para-um com o usuário do Django. Cada usuário é um operador.
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    # Podemos adicionar outros campos depois, como ramal, foto, etc.
    def __str__(self):
        return self.user.username


class Conversa(models.Model):
    STATUS_CHOICES = [
        ('entrada', 'Entrada'),
        ('atendimento', 'Em Atendimento'),
        ('resolvida', 'Resolvida'),
    ]

    contato = models.ForeignKey(Contato, related_name='conversas', on_delete=models.CASCADE)
    operador = models.ForeignKey(Operador, related_name='conversas', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='entrada')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversa com {self.contato.nome or self.contato.telefone} - Status: {self.status}"


class Interacao(models.Model):
    REMETENTE_CHOICES = (
        ('cliente', 'Cliente'),
        ('operador', 'Operador'),
    )
    conversa = models.ForeignKey(Conversa, related_name='interacoes', on_delete=models.CASCADE)
    mensagem = models.TextField()
    remetente = models.CharField(max_length=10, choices=REMETENTE_CHOICES)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mensagem de {self.remetente} em {self.criado_em.strftime('%d/%m/%Y %H:%M')}"


class Estagio(models.Model):
    nome = models.CharField(max_length=100)
    ordem = models.PositiveIntegerField(default=0, help_text="Define a ordem das colunas no Kanban")

    class Meta:
        ordering = ['ordem']

    def __str__(self):
        return self.nome


class Negocio(models.Model):
    titulo = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    contato = models.ForeignKey(Contato, related_name='negocios', on_delete=models.CASCADE)
    estagio = models.ForeignKey(Estagio, related_name='negocios', on_delete=models.PROTECT)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo


class RespostasRapidas(models.Model):
    atalho = models.CharField(max_length=50, help_text="Ex: /saudacao")
    texto = models.TextField()
    operador = models.ForeignKey(Operador, related_name='respostas_rapidas', on_delete=models.CASCADE)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        # Garante que um operador não pode ter dois atalhos com o mesmo nome
        unique_together = ('operador', 'atalho')
        ordering = ['atalho']

    def __str__(self):
        return f"{self.atalho} ({self.operador.user.username})"

