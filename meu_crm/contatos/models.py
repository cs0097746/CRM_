from django.db import models
from django.contrib.auth.models import User 



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
    # MUDANÇA AQUI: Trocamos o ForeignKey de Contato para Conversa
    conversa = models.ForeignKey(Conversa, related_name='interacoes', on_delete=models.CASCADE) 
    mensagem = models.TextField()
    remetente = models.CharField(max_length=20)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mensagem para '{self.conversa}'"
    

class Estagio(models.Model):
    nome = models.CharField(max_length=100)
    ordem = models.PositiveIntegerField(default=0, help_text="Define a ordem das colunas no Kanban")

    class Meta:
        ordering = ['ordem'] # Garante que os estágios sempre apareçam na ordem correta

    def __str__(self):
        return self.nome

class Negocio(models.Model):
    titulo = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    contato = models.ForeignKey(Contato, related_name='negocios', on_delete=models.CASCADE)
    estagio = models.ForeignKey(Estagio, related_name='negocios', on_delete=models.PROTECT)
    # on_delete=models.PROTECT impede que um estágio seja deletado se houver negócios nele
    criado_em = models.DateTimeField(auto_now_add=True)
    # Adicionaremos um ForeignKey para Operador no futuro

    def __str__(self):
        return self.titulo
    