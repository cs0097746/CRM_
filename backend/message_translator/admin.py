from django.contrib import admin
from .models import CanalConfig, MensagemLog, RegrasRoteamento, WebhookCustomizado


@admin.register(CanalConfig)
class CanalConfigAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo', 'ativo', 'prioridade', 'recebe_entrada', 'envia_saida', 'criado_por', 'criado_em']
    list_filter = ['tipo', 'ativo', 'recebe_entrada', 'envia_saida', 'criado_por']
    search_fields = ['nome', 'criado_por__username']
    ordering = ['prioridade', 'nome']
    readonly_fields = ['criado_por', 'atualizado_por', 'criado_em', 'atualizado_em']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'tipo', 'ativo', 'prioridade')
        }),
        ('Configurações de Roteamento', {
            'fields': ('recebe_entrada', 'envia_saida', 'destinos')
        }),
        ('Credenciais e APIs', {
            'fields': ('credenciais',),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('criado_por', 'criado_em', 'atualizado_por', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Auto-preencher criado_por/atualizado_por ao salvar via admin"""
        if not change:  # Novo objeto
            obj.criado_por = request.user
        obj.atualizado_por = request.user
        super().save_model(request, obj, form, change)


@admin.register(MensagemLog)
class MensagemLogAdmin(admin.ModelAdmin):
    list_display = ['message_id', 'direcao', 'status', 'canal_origem', 'canal_destino', 'remetente', 'processado_por', 'criado_em', 'tempo_processamento']
    list_filter = ['direcao', 'status', 'canal_origem', 'canal_destino', 'processado_por', 'criado_em']
    search_fields = ['message_id', 'remetente', 'destinatario', 'processado_por__username']
    readonly_fields = ['processado_por', 'criado_em', 'processado_em']
    date_hierarchy = 'criado_em'
    
    fieldsets = (
        ('Identificação', {
            'fields': ('message_id', 'direcao', 'status')
        }),
        ('Canais', {
            'fields': ('canal_origem', 'canal_destino')
        }),
        ('Participantes', {
            'fields': ('remetente', 'destinatario')
        }),
        ('Payloads', {
            'fields': ('payload_original', 'payload_loomie'),
            'classes': ('collapse',)
        }),
        ('Processamento', {
            'fields': ('tempo_processamento', 'erro_mensagem', 'processado_por', 'criado_em', 'processado_em')
        }),
    )


@admin.register(RegrasRoteamento)
class RegrasRoteamentoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'ativo', 'prioridade', 'criado_por', 'criado_em']
    list_filter = ['ativo', 'criado_por']
    search_fields = ['nome', 'criado_por__username']
    ordering = ['prioridade', 'nome']
    readonly_fields = ['criado_por', 'atualizado_por', 'criado_em', 'atualizado_em']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'ativo', 'prioridade')
        }),
        ('Condições', {
            'fields': ('condicoes',)
        }),
        ('Ações', {
            'fields': ('acoes',)
        }),
        ('Auditoria', {
            'fields': ('criado_por', 'criado_em', 'atualizado_por', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Auto-preencher criado_por/atualizado_por ao salvar via admin"""
        if not change:
            obj.criado_por = request.user
        obj.atualizado_por = request.user
        super().save_model(request, obj, form, change)


@admin.register(WebhookCustomizado)
class WebhookCustomizadoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'url_resumida', 'ativo', 'filtro_canal', 'filtro_direcao', 'total_enviados', 'total_erros', 'criado_por', 'ultima_execucao']
    list_filter = ['ativo', 'filtro_canal', 'filtro_direcao', 'metodo_http', 'criado_por']
    search_fields = ['nome', 'url', 'criado_por__username']
    readonly_fields = ['total_enviados', 'total_erros', 'ultima_execucao', 'criado_por', 'atualizado_por', 'criado_em', 'atualizado_em']
    ordering = ['-ativo', 'nome']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'url', 'ativo')
        }),
        ('Filtros', {
            'fields': ('filtro_canal', 'filtro_direcao'),
            'description': 'Defina quando este webhook deve ser acionado'
        }),
        ('Configurações HTTP', {
            'fields': ('metodo_http', 'headers', 'timeout'),
            'classes': ('collapse',)
        }),
        ('Retry e Confiabilidade', {
            'fields': ('retry_em_falha', 'max_tentativas'),
            'classes': ('collapse',)
        }),
        ('Estatísticas', {
            'fields': ('total_enviados', 'total_erros', 'ultima_execucao', 'criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('criado_por', 'atualizado_por'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Auto-preencher criado_por/atualizado_por ao salvar via admin"""
        if not change:
            obj.criado_por = request.user
        obj.atualizado_por = request.user
        super().save_model(request, obj, form, change)
    
    def url_resumida(self, obj):
        """Mostra URL truncada para melhor visualização"""
        if len(obj.url) > 50:
            return f"{obj.url[:47]}..."
        return obj.url
    url_resumida.short_description = 'URL'
    
    actions = ['testar_webhook']
    
    def testar_webhook(self, request, queryset):
        """Ação para testar webhook com payload de exemplo"""
        from .router import enviar_para_webhook_customizado
        from .schemas import LoomieMessage
        from datetime import datetime
        
        # Criar mensagem de teste
        mensagem_teste = LoomieMessage(
            sender="whatsapp:5511999999999",
            recipient="system:test",
            channel_type="whatsapp",
            content_type="text",
            text="🧪 Mensagem de teste do Message Translator"
        )
        
        total_sucesso = 0
        total_erro = 0
        
        for webhook in queryset:
            if webhook.ativo:
                sucesso = enviar_para_webhook_customizado(webhook, mensagem_teste.to_dict())
                if sucesso:
                    total_sucesso += 1
                else:
                    total_erro += 1
        
        self.message_user(
            request,
            f"✅ {total_sucesso} webhook(s) testado(s) com sucesso. ❌ {total_erro} erro(s)."
        )
    
    testar_webhook.short_description = "🧪 Testar webhook(s) selecionado(s)"
