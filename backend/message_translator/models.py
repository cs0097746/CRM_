from django.db import models
from django.utils import timezone


class CanalConfig(models.Model):
    """
    Configuração de canais de comunicação (WhatsApp, Telegram, etc)
    """
    TIPOS_CANAL = [
        ('whatsapp', 'WhatsApp'),
        ('telegram', 'Telegram'),
        ('instagram', 'Instagram'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('evo', 'Evolution API'),
        ('n8n', 'n8n Webhook'),
        ('outro', 'Outro'),
    ]
    
    nome = models.CharField(max_length=100, help_text="Nome do canal (ex: WhatsApp Principal)")
    tipo = models.CharField(max_length=20, choices=TIPOS_CANAL)
    ativo = models.BooleanField(default=True, help_text="Canal ativo/inativo")
    prioridade = models.IntegerField(default=1, help_text="Prioridade de envio (1=maior)")
    
    # Credenciais e configurações (JSON flexível)
    credenciais = models.JSONField(
        default=dict,
        blank=True,
        help_text="API keys, tokens, URLs, etc. Exemplo: {'api_key': 'xxx', 'base_url': 'https://...'}"
    )
    
    # Configurações de roteamento
    recebe_entrada = models.BooleanField(default=True, help_text="Recebe mensagens de entrada")
    envia_saida = models.BooleanField(default=True, help_text="Envia mensagens de saída")
    
    # Destinos para onde enviar (ao receber mensagem deste canal)
    destinos = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de destinos: ['crm', 'n8n', 'outro_canal']"
    )
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Canal de Comunicação"
        verbose_name_plural = "Canais de Comunicação"
        ordering = ['prioridade', 'nome']
    
    def __str__(self):
        status = "✅" if self.ativo else "❌"
        return f"{status} {self.nome} ({self.get_tipo_display()})"


class MensagemLog(models.Model):
    """
    Log de todas as mensagens processadas pelo Tradutor
    """
    DIRECOES = [
        ('entrada', 'Entrada (Canal → Sistema)'),
        ('saida', 'Saída (Sistema → Canal)'),
    ]
    
    STATUS_CHOICES = [
        ('recebida', 'Recebida'),
        ('processando', 'Processando'),
        ('enviada', 'Enviada'),
        ('erro', 'Erro'),
        ('falha', 'Falha'),
    ]
    
    # Identificação
    message_id = models.CharField(max_length=255, unique=True, help_text="ID único da mensagem")
    direcao = models.CharField(max_length=10, choices=DIRECOES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='recebida')
    
    # Canal origem/destino
    canal_origem = models.ForeignKey(
        CanalConfig, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='mensagens_origem'
    )
    canal_destino = models.ForeignKey(
        CanalConfig, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='mensagens_destino'
    )
    
    # Conteúdo original (formato do canal)
    payload_original = models.JSONField(help_text="Payload original recebido do canal")
    
    # Conteúdo formatado (formato Loomie)
    payload_loomie = models.JSONField(
        null=True, 
        blank=True,
        help_text="Mensagem no formato padrão Loomie"
    )
    
    # Rastreamento
    remetente = models.CharField(max_length=255, blank=True)
    destinatario = models.CharField(max_length=255, blank=True)
    
    # Metadados
    erro_mensagem = models.TextField(blank=True, help_text="Mensagem de erro, se houver")
    tempo_processamento = models.FloatField(null=True, blank=True, help_text="Tempo em segundos")
    
    criado_em = models.DateTimeField(auto_now_add=True)
    processado_em = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Log de Mensagem"
        verbose_name_plural = "Logs de Mensagens"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['message_id']),
            models.Index(fields=['status']),
            models.Index(fields=['criado_em']),
        ]
    
    def __str__(self):
        return f"{self.direcao} - {self.message_id} ({self.status})"


class RegrasRoteamento(models.Model):
    """
    Regras de roteamento dinâmico de mensagens
    """
    nome = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True)
    prioridade = models.IntegerField(default=1)
    
    # Condições (JSON com lógica)
    condicoes = models.JSONField(
        default=dict,
        help_text="""
        Exemplo: {
            "canal_tipo": "whatsapp",
            "remetente_contem": "@c.us",
            "horario_entre": ["08:00", "18:00"]
        }
        """
    )
    
    # Ações quando a regra é satisfeita
    acoes = models.JSONField(
        default=dict,
        help_text="""
        Exemplo: {
            "enviar_para": ["crm", "n8n"],
            "adicionar_tag": "urgente",
            "notificar_operador": true
        }
        """
    )
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Regra de Roteamento"
        verbose_name_plural = "Regras de Roteamento"
        ordering = ['prioridade', 'nome']
    
    def __str__(self):
        status = "✅" if self.ativo else "❌"
        return f"{status} {self.nome}"
