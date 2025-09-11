from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views

# ===== CONFIGURAÇÃO DO ROUTER =====
router = DefaultRouter()

# ===== URLS PRINCIPAIS =====
urlpatterns = [
    # ===== AUTENTICAÇÃO =====
    path('auth/token/', views.obter_token_auth, name='obter_token'),
    path('auth/register/', views.criar_usuario_teste, name='criar_usuario'),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    
    # ===== DASHBOARD & STATS =====
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('health/', views.health_check, name='health_check'),
    
    # ===== CONTATOS =====
    path('contatos/', views.ContatoListCreateView.as_view(), name='contato_list_create'),
    path('contatos/<int:pk>/', views.ContatoDetailView.as_view(), name='contato_detail'),
    path('contatos/telefone/', views.api_contato_por_telefone, name='contato_por_telefone'),
    
    # ===== OPERADORES =====
    path('operadores/', views.api_operadores_list, name='operadores_list'),
    
    # ===== CONVERSAS =====
    path('conversas/', views.ConversaListView.as_view(), name='conversa_list'),
    path('conversas/<int:pk>/', views.ConversaDetailView.as_view(), name='conversa_detail'),
    
    # ===== INTERAÇÕES/MENSAGENS =====
    path('conversas/<int:conversa_pk>/interacoes/', views.InteracaoCreateView.as_view(), name='interacao_create'),
    
    # ===== CRM/KANBAN =====
    path('estagios/<int:kanban_id>/', views.EstagioListView.as_view(), name='estagio_list'),
    path('kanbans/', views.KanbanListView.as_view(), name='kanban_list'),
    path('negocios/', views.NegocioListCreateView.as_view(), name='negocio_list_create'),
    path('kanbans/<int:kanban_id>/negocios/', views.NegocioListCreateView.as_view(), name='negocio_list_create'),
    path('negocios/<int:pk>/', views.NegocioDetailView.as_view(), name='negocio_detail'),
    path('funil/stats/', views.FunilStatsView.as_view(), name='funil_stats'),
    
    # ===== RESPOSTAS RÁPIDAS =====
    path('respostas-rapidas/', views.RespostasRapidasListView.as_view(), name='respostas_rapidas_list'),
    
    # ===== NOTAS DE ATENDIMENTO =====
    path('notas/', views.NotaAtendimentoListCreateView.as_view(), name='nota_list_create'),
    path('notas/<int:pk>/', views.NotaAtendimentoDetailView.as_view(), name='nota_detail'),
    path('conversas/<int:conversa_pk>/notas/', views.NotaAtendimentoListCreateView.as_view(), name='conversa_notas'),
    
    # ===== TAREFAS =====
    path('tarefas/', views.TarefaAtendimentoListCreateView.as_view(), name='tarefa_list_create'),
    path('tarefas/<int:pk>/', views.TarefaAtendimentoDetailView.as_view(), name='tarefa_detail'),
    path('tarefas/minhas/', views.MinhasTarefasView.as_view(), name='minhas_tarefas'),
    path('tarefas/stats/', views.TarefasStatsView.as_view(), name='tarefas_stats'),
    path('tarefas/<int:task_id>/status/', views.update_task_status, name='update_task_status'),
    
    # ===== QUICK ACTIONS =====
    path('quick/nota/', views.quick_note_create, name='quick_note_create'),
    path('quick/tarefa/', views.quick_task_create, name='quick_task_create'),
    
    # ===== WHATSAPP INTEGRATION =====
    path('whatsapp/dashboard/', views.whatsapp_dashboard, name='whatsapp_dashboard'),
    path('whatsapp/status/', views.whatsapp_status, name='whatsapp_status'),
    path('whatsapp/qr-code/', views.whatsapp_qr_code, name='whatsapp_qr_code'),
    path('whatsapp/restart/', views.whatsapp_restart, name='whatsapp_restart'),
    path('whatsapp/disconnect/', views.whatsapp_disconnect, name='whatsapp_disconnect'),
    path('whatsapp/enviar/', views.enviar_mensagem_view, name='enviar_mensagem'),
    path('whatsapp/presenca/', views.enviar_presenca_view, name='enviar_presenca'),
    path('whatsapp/restart-debug/', views.whatsapp_restart_debug, name='whatsapp_restart_debug'),  # ✅ ADICIONAR
    # ===== WEBHOOKS =====
    path('webhook/evolution/', views.evolution_webhook, name='evolution_webhook'),
    path('webhook/n8n/lead/', views.webhook_n8n_lead, name='webhook_n8n_lead'),
    
    # ===== ESTATÍSTICAS AVANÇADAS =====
    path('stats/tempo-resposta/', views.TempoRespostaStatsView.as_view(), name='tempo_resposta_stats'),
    
    # ===== ROUTER URLS =====
    path('', include(router.urls)),
]

# ===== URL PATTERNS COM NAMESPACING =====
app_name = 'contatos'