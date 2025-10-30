from django.contrib import admin
from .models import Contato, Operador
from atendimento.models import Conversa, Interacao, RespostasRapidas, NotaAtendimento, AnexoNota, TarefaAtendimento, LogAtividade
from negocio.models import Negocio
from kanban.models import Kanban, Estagio


@admin.register(Contato)
class ContatoAdmin(admin.ModelAdmin):
    list_display = ['id', 'nome', 'telefone', 'email', 'criado_em']
    search_fields = ['nome', 'telefone', 'email']
    list_filter = ['criado_em']
    ordering = ['-criado_em']


@admin.register(Conversa)
class ConversaAdmin(admin.ModelAdmin):
    list_display = ['id', 'contato', 'status', 'operador', 'criado_em', 'atualizado_em']
    search_fields = ['contato__nome', 'contato__telefone', 'id']
    list_filter = ['status', 'criado_em', 'atendimento_humano']
    ordering = ['-atualizado_em']
    raw_id_fields = ['contato', 'operador']


@admin.register(Interacao)
class InteracaoAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversa_id', 'get_contato_nome', 'remetente', 'tipo', 'mensagem_resumo', 'whatsapp_id', 'criado_em']
    search_fields = ['conversa__id', 'conversa__contato__nome', 'mensagem', 'whatsapp_id']
    list_filter = ['remetente', 'tipo', 'criado_em']
    ordering = ['-criado_em']
    raw_id_fields = ['conversa']
    
    def get_contato_nome(self, obj):
        return obj.conversa.contato.nome if obj.conversa and obj.conversa.contato else 'N/A'
    get_contato_nome.short_description = 'Contato'
    
    def conversa_id(self, obj):
        return obj.conversa.id if obj.conversa else 'N/A'
    conversa_id.short_description = 'Conversa ID'
    
    def mensagem_resumo(self, obj):
        return obj.mensagem[:50] + '...' if len(obj.mensagem) > 50 else obj.mensagem
    mensagem_resumo.short_description = 'Mensagem'


admin.site.register(Estagio)
admin.site.register(Kanban)
admin.site.register(Negocio)
admin.site.register(Operador)
admin.site.register(RespostasRapidas)


@admin.register(NotaAtendimento)
class NotaAtendimentoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'operador', 'conversa', 'privada', 'criado_em']
    list_filter = ['tipo', 'privada', 'criado_em']
    search_fields = ['titulo', 'conteudo']

@admin.register(TarefaAtendimento)
class TarefaAtendimentoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'status', 'prioridade', 'responsavel', 'data_vencimento', 'criado_em']
    list_filter = ['status', 'prioridade', 'criado_em']
    search_fields = ['titulo', 'descricao']

admin.site.register(AnexoNota)