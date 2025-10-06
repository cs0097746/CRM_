from django.db import models


class Conversa(models.Model):
    STATUS_CHOICES = [
        ('entrada', 'Entrada'),
        ('atendimento', 'Em Atendimento'),
        ('pendente', 'Pendente'),
        ('finalizada', 'Finalizada'),
        ('perdida', 'Perdida'),
    ]

    ORIGEM_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('email', 'E-mail'),
        ('telefone', 'Telefone'),
        ('site', 'Site'),
        ('presencial', 'Presencial'),
        ('redes_sociais', 'Redes Sociais'),
    ]

    PRIORIDADE_CHOICES = [
        ('baixa', 'Baixa'),
        ('media', 'Média'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]

    contato = models.ForeignKey('contato.Contato', on_delete=models.CASCADE, related_name='conversas')
    operador = models.ForeignKey('contato.Operador', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversas')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='entrada')
    assunto = models.CharField(max_length=200, blank=True, null=True)
    origem = models.CharField(max_length=20, choices=ORIGEM_CHOICES, default='whatsapp')
    prioridade = models.CharField(max_length=10, choices=PRIORIDADE_CHOICES, default='media')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    finalizada_em = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Conversa com {self.contato.nome} - {self.get_status_display()}"

    @property
    def total_mensagens(self):
        return self.interacoes.count()

    @property
    def ultima_interacao(self):
        return self.interacoes.order_by('-criado_em').first()

    class Meta:
        verbose_name = "Conversa"
        verbose_name_plural = "Conversas"
        ordering = ['-atualizado_em']


class Interacao(models.Model):
    TIPO_CHOICES = [
        ('texto', 'Texto'),
        ('imagem', 'Imagem'),
        ('audio', 'Áudio'),
        ('video', 'Vídeo'),
        ('documento', 'Documento'),
        ('sticker', 'Figurinha'),
        ('localizacao', 'Localização'),
        ('contato', 'Contato'),
        ('outros', 'Outros'),
    ]
    
    conversa = models.ForeignKey(Conversa, on_delete=models.CASCADE, related_name='interacoes')
    mensagem = models.TextField()
    remetente = models.CharField(max_length=20)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='texto')
    operador = models.ForeignKey('contato.Operador', on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    whatsapp_id = models.CharField(max_length=100, blank=True, null=True)
    media_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL da mídia da Evolution API")
    media_filename = models.CharField(max_length=255, blank=True, null=True)
    media_size = models.PositiveIntegerField(blank=True, null=True, help_text="Tamanho em bytes")
    media_mimetype = models.CharField(max_length=100, blank=True, null=True)
    media_duration = models.PositiveIntegerField(blank=True, null=True, help_text="Duração em segundos para áudio/vídeo")
    
    def __str__(self):
        return f"{self.remetente}: {self.mensagem[:50]}... ({self.tipo})"
    
    class Meta:
        verbose_name = "Interação"
        verbose_name_plural = "Interações"
        ordering = ['criado_em']


class RespostasRapidas(models.Model):
    atalho = models.CharField(max_length=20, unique=True)
    titulo = models.CharField(max_length=100)
    texto = models.TextField()
    operador = models.ForeignKey('contato.Operador', on_delete=models.CASCADE, related_name='respostas_rapidas')
    ativo = models.BooleanField(default=True)
    total_usos = models.PositiveIntegerField(default=0)
    ultima_utilizacao = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.atalho} - {self.titulo}"

    class Meta:
        verbose_name = "Resposta Rápida"
        verbose_name_plural = "Respostas Rápidas"
        ordering = ['atalho']


class NotaAtendimento(models.Model):
    TIPO_CHOICES = [
        ('info', 'Informação'),
        ('importante', 'Importante'),
        ('urgente', 'Urgente'),
        ('followup', 'Follow-up'),
        ('problema', 'Problema'),
        ('solucao', 'Solução'),
    ]

    titulo = models.CharField(max_length=200)
    conteudo = models.TextField()
    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES, default='info')
    privada = models.BooleanField(default=False)
    tags = models.CharField(max_length=200, blank=True, null=True, help_text="Tags separadas por vírgula")
    ativa = models.BooleanField(default=True)
    operador = models.ForeignKey('contato.Operador', on_delete=models.CASCADE, related_name='notas')
    conversa = models.ForeignKey('atendimento.Conversa', on_delete=models.CASCADE, null=True, blank=True, related_name='notas')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo

    @property
    def tipo_display_classe(self):
        classes = {
            'info': 'info',
            'importante': 'warning',
            'urgente': 'danger',
            'followup': 'primary',
            'problema': 'danger',
            'solucao': 'success',
        }
        return classes.get(self.tipo, 'info')

    class Meta:
        verbose_name = "Nota de Atendimento"
        verbose_name_plural = "Notas de Atendimento"
        ordering = ['-criado_em']


class AnexoNota(models.Model):
    nota = models.ForeignKey(NotaAtendimento, on_delete=models.CASCADE, related_name='anexos')
    arquivo = models.FileField(upload_to='anexos_notas/')
    nome_original = models.CharField(max_length=255)
    tamanho = models.PositiveIntegerField()
    tipo_mime = models.CharField(max_length=100)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome_original

    class Meta:
        verbose_name = "Anexo de Nota"
        verbose_name_plural = "Anexos de Notas"


class TarefaAtendimento(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('em_andamento', 'Em Andamento'),
        ('concluida', 'Concluída'),
        ('cancelada', 'Cancelada'),
    ]

    PRIORIDADE_CHOICES = [
        ('baixa', 'Baixa'),
        ('media', 'Média'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]

    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pendente')
    prioridade = models.CharField(max_length=10, choices=PRIORIDADE_CHOICES, default='media')
    criado_por = models.ForeignKey('contato.Operador', on_delete=models.CASCADE, related_name='tarefas_criadas')
    responsavel = models.ForeignKey('contato.Operador', on_delete=models.CASCADE, related_name='tarefas_responsavel')
    conversa = models.ForeignKey('atendimento.Conversa', on_delete=models.CASCADE, null=True, blank=True, related_name='tarefas')
    contato = models.ForeignKey('contato.Contato', on_delete=models.CASCADE, null=True, blank=True, related_name='tarefas')
    data_vencimento = models.DateTimeField(null=True, blank=True)
    data_conclusao = models.DateTimeField(null=True, blank=True)
    data_inicio = models.DateTimeField(null=True, blank=True)
    tempo_estimado = models.PositiveIntegerField(null=True, blank=True, help_text="Tempo estimado em minutos")
    tempo_gasto = models.PositiveIntegerField(null=True, blank=True, help_text="Tempo gasto em minutos")
    lembrete_enviado = models.BooleanField(default=False)
    tags = models.CharField(max_length=200, blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo

    @property
    def esta_vencida(self):
        if self.data_vencimento and self.status not in ['concluida', 'cancelada']:
            return timezone.now() > self.data_vencimento
        return False

    @property
    def vence_hoje(self):
        if self.data_vencimento and self.status not in ['concluida', 'cancelada']:
            return self.data_vencimento.date() == timezone.now().date()
        return False

    @property
    def prazo_status(self):
        if self.esta_vencida:
            return 'vencida'
        elif self.vence_hoje:
            return 'vence_hoje'
        return 'no_prazo'

    @property
    def progresso_percentual(self):
        if self.status == 'concluida':
            return 100
        elif self.status == 'em_andamento':
            if self.tempo_estimado and self.tempo_gasto:
                return min(int((self.tempo_gasto / self.tempo_estimado) * 100), 95)
            return 50
        return 0

    class Meta:
        verbose_name = "Tarefa de Atendimento"
        verbose_name_plural = "Tarefas de Atendimento"
        ordering = ['data_vencimento', '-prioridade', '-criado_em']


class LogAtividade(models.Model):
    ACAO_CHOICES = [
        ('criar', 'Criar'),
        ('editar', 'Editar'),
        ('excluir', 'Excluir'),
        ('visualizar', 'Visualizar'),
        ('responder', 'Responder'),
        ('finalizar', 'Finalizar'),
        ('transferir', 'Transferir'),
    ]

    operador = models.ForeignKey('contato.Operador', on_delete=models.CASCADE, related_name='logs')
    acao = models.CharField(max_length=20, choices=ACAO_CHOICES)
    modelo = models.CharField(max_length=50)
    objeto_id = models.PositiveIntegerField()
    detalhes = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.operador} - {self.get_acao_display()} {self.modelo}"

    class Meta:
        verbose_name = "Log de Atividade"
        verbose_name_plural = "Logs de Atividade"
        ordering = ['-criado_em']