from django.contrib import admin
from .models import CanalConfig, MensagemLog, RegrasRoteamento


@admin.register(CanalConfig)
class CanalConfigAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo', 'ativo', 'prioridade', 'recebe_entrada', 'envia_saida', 'criado_em']
    list_filter = ['tipo', 'ativo', 'recebe_entrada', 'envia_saida']
    search_fields = ['nome']
    ordering = ['prioridade', 'nome']
    
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
    )


@admin.register(MensagemLog)
class MensagemLogAdmin(admin.ModelAdmin):
    list_display = ['message_id', 'direcao', 'status', 'canal_origem', 'canal_destino', 'remetente', 'criado_em', 'tempo_processamento']
    list_filter = ['direcao', 'status', 'canal_origem', 'canal_destino', 'criado_em']
    search_fields = ['message_id', 'remetente', 'destinatario']
    readonly_fields = ['criado_em', 'processado_em']
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
            'fields': ('tempo_processamento', 'erro_mensagem', 'criado_em', 'processado_em')
        }),
    )


@admin.register(RegrasRoteamento)
class RegrasRoteamentoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'ativo', 'prioridade', 'criado_em']
    list_filter = ['ativo']
    search_fields = ['nome']
    ordering = ['prioridade', 'nome']
