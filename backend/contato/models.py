from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import re

class Operador(models.Model):
    NIVEL_CHOICES = [
        ('operador', 'Operador'),
        ('supervisor', 'Supervisor'),
        ('admin', 'Administrador'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    ativo = models.BooleanField(default=True)
    ramal = models.CharField(max_length=10, blank=True, null=True)
    setor = models.CharField(max_length=50, blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}" if self.user.first_name else self.user.username
    
    @property
    def nome_display(self):
        return self.__str__()
    
    class Meta:
        verbose_name = "Operador"
        verbose_name_plural = "Operadores"

class Contato(models.Model):
    nome = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    whatsapp_id = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        unique=True,
        help_text="ID do WhatsApp (número + @s.whatsapp.net)"
    )
    empresa = models.CharField(max_length=100, blank=True, null=True)
    cargo = models.CharField(max_length=50, blank=True, null=True)
    endereco = models.TextField(blank=True, null=True)
    cidade = models.CharField(max_length=50, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)
    cep = models.CharField(max_length=10, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    
    def save(self, *args, **kwargs):
        """
        Normalizar telefone antes de salvar para evitar duplicatas
        """
        if self.telefone:
            # Remover tudo que não é número
            telefone_limpo = re.sub(r'\D', '', self.telefone)
            
            # Se começar com 55 e tiver 12 ou 13 dígitos, já tem código do país
            if telefone_limpo.startswith('55') and len(telefone_limpo) in [12, 13]:
                self.telefone = telefone_limpo
            # Se não tem código do país (10 ou 11 dígitos), adicionar
            elif len(telefone_limpo) in [10, 11]:
                self.telefone = f"55{telefone_limpo}"
            else:
                # Manter como está se não for válido (será rejeitado pela validação)
                self.telefone = telefone_limpo
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = "Contato"
        verbose_name_plural = "Contatos"
        ordering = ['nome']
        constraints = [
            models.UniqueConstraint(
                fields=['criado_por', 'whatsapp_id'],
                name='unique_contato_por_usuario'
            )
        ]