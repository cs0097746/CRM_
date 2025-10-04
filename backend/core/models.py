from django.db import models

# Create your models here.
class ConfiguracaoSistema(models.Model):
    """Configurações gerais da instalação"""
    
    # Informações da empresa
    nome_empresa = models.CharField(max_length=200, default='Minha Empresa')
    logo = models.ImageField(upload_to='configuracao/', null=True, blank=True)
    cor_primaria = models.CharField(max_length=7, default='#1877f2')
    cor_secundaria = models.CharField(max_length=7, default='#42a5f5')
    
    # WhatsApp Configuration
    evolution_api_url = models.URLField(default='https://evolution-api.local')
    evolution_api_key = models.CharField(max_length=200, blank=True)
    whatsapp_instance_name = models.CharField(max_length=100, default='main')
    
    # IA Configuration
    openai_api_key = models.CharField(max_length=200, blank=True)
    elevenlabs_api_key = models.CharField(max_length=200, blank=True)
    
    # Sistema ativo
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"
    
    def save(self, *args, **kwargs):
        # Garantir que só existe um registro
        if not self.pk and ConfiguracaoSistema.objects.exists():
            raise ValueError('Já existe uma configuração do sistema')
        super().save(*args, **kwargs)
