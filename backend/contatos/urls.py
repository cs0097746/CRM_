from django.urls import path
from .views import (
    # Views de Template (Django)
    # dashboard,
    # lista_contatos,
    # detalhe_contato,
    # lista_conversas,
    # detalhe_conversa,
    
    # Views de API - Contatos
    ContatoListCreateView,
    ContatoDetailView,
    api_operadores_list,
    dashboard_stats,
    
    # Views de API - Conversas e Interações
    ConversaListView,
    ConversaDetailView,
    InteracaoCreateView,
    
    # Views de API - CRM/Kanban
    EstagioListView,
    NegocioListCreateView,
    NegocioDetailView,
    
    # Views de API - Respostas Rápidas
    RespostasRapidasListView,
    
    # Views de API - Notas e Tarefas
    NotaAtendimentoListCreateView,
    NotaAtendimentoDetailView,
    TarefaAtendimentoListCreateView,
    TarefaAtendimentoDetailView,
    MinhasTarefasView,
    TarefasStatsView,
    
    # Quick Actions
    quick_note_create,
    quick_task_create,
    update_task_status,
    
    # Views de Estatísticas
    FunilStatsView,
    TempoRespostaStatsView,
    
    # Webhook
    EvolutionWebhookView,
)

urlpatterns = [
    # ===== VIEWS TRADICIONAIS (HTML) =====
    # path('', lista_contatos, name='lista-contatos'),
    # path('<int:contato_id>/', detalhe_contato, name='detalhe-contato'),
    # path('conversas/', lista_conversas, name='lista-conversas-html'),
    # path('conversas/<int:conversa_id>/', detalhe_conversa, name='detalhe-conversa-html'),
    # path('dashboard/', dashboard, name='dashboard'),
    
    # ===== APIS BÁSICAS =====
    path('api/contatos/', ContatoListCreateView.as_view(), name='api-lista-contatos'),
    path('api/contatos/<int:pk>/', ContatoDetailView.as_view(), name='api-detalhe-contato'),
    path('api/operadores/', api_operadores_list, name='api-operadores'),
    path('api/dashboard-stats/', dashboard_stats, name='api-dashboard-stats'),
    
    # ===== CONVERSAS E INTERAÇÕES =====
    path('api/conversas/', ConversaListView.as_view(), name='lista-conversas'),
    path('api/conversas/<int:pk>/', ConversaDetailView.as_view(), name='detalhe-conversa'),
    path('api/conversas/<int:conversa_pk>/mensagens/', InteracaoCreateView.as_view(), name='criar-interacao'),
    
    # ===== CRM/KANBAN =====
    path('api/estagios/', EstagioListView.as_view(), name='lista-estagios'),
    path('api/negocios/', NegocioListCreateView.as_view(), name='lista-cria-negocio'),
    path('api/negocios/<int:pk>/', NegocioDetailView.as_view(), name='detalhe-negocio'),
    
    # ===== RESPOSTAS RÁPIDAS =====
    path('api/respostas-rapidas/', RespostasRapidasListView.as_view(), name='lista-respostas-rapidas'),
    
    # ===== NOTAS E TAREFAS =====
    path('api/notas/', NotaAtendimentoListCreateView.as_view(), name='lista-cria-notas'),
    path('api/notas/<int:pk>/', NotaAtendimentoDetailView.as_view(), name='detalhe-nota'),
    path('api/conversas/<int:conversa_pk>/notas/', NotaAtendimentoListCreateView.as_view(), name='notas-conversa'),
    
    path('api/tarefas/', TarefaAtendimentoListCreateView.as_view(), name='lista-cria-tarefas'),
    path('api/tarefas/<int:pk>/', TarefaAtendimentoDetailView.as_view(), name='detalhe-tarefa'),
    path('api/minhas-tarefas/', MinhasTarefasView.as_view(), name='minhas-tarefas'),
    path('api/tarefas/stats/', TarefasStatsView.as_view(), name='stats-tarefas'),
    path('api/tarefas/<int:task_id>/status/', update_task_status, name='update-task-status'),
    
    # ===== QUICK ACTIONS =====
    path('api/quick-note/', quick_note_create, name='quick-note'),
    path('api/quick-task/', quick_task_create, name='quick-task'),
    
    # ===== ESTATÍSTICAS =====
    path('api/stats/funil/', FunilStatsView.as_view(), name='stats-funil'),
    path('api/stats/tempo-resposta/', TempoRespostaStatsView.as_view(), name='stats-tempo-resposta'),
    
    # ===== WEBHOOKS =====
    path('webhook/evolution/', EvolutionWebhookView.as_view(), name='webhook-evolution'),
]