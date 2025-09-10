from django.contrib import admin
from .models import Contato, Operador
from atendimento.models import Conversa, Interacao, RespostasRapidas, NotaAtendimento, AnexoNota, TarefaAtendimento, LogAtividade
from negocio.models import Negocio
from kanban.models import Kanban, Estagio

admin.site.register(Contato)
admin.site.register(Estagio)
admin.site.register(Kanban)
admin.site.register(Negocio)
admin.site.register(Conversa)
admin.site.register(Operador)
admin.site.register(Interacao)
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