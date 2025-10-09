from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views as contato_views
from core import views as core_views
from negocio import views as negocio_views
from atendimento import views as atendimento_views
from kanban import views as kanban_views
from knowledge_base.views import *
from atributo import views as atributos_views
from notificacao import views as notificacao_views

# ===== CONFIGURAÇÃO DO ROUTER =====
router = DefaultRouter()
router.register(r"sets", KnowledgeBaseSetViewSet)
router.register(r"fields", KnowledgeBaseFieldViewSet)
router.register(r"entries", KnowledgeBaseEntryViewSet)

# ===== URLS PRINCIPAIS =====
urlpatterns = [
    # ===== AUTENTICAÇÃO =====
    path('auth/token/', core_views.obter_token_auth, name='obter_token'),
    path('auth/register/', core_views.criar_usuario_teste, name='criar_usuario'),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    
    # ===== DASHBOARD & STATS =====
    path('dashboard/stats/', core_views.dashboard_stats, name='dashboard_stats'),
    path('health/', core_views.health_check, name='health_check'),
    
    # ===== CONTATOS =====
    path('contatos/', contato_views.ContatoListCreateView.as_view(), name='contato_list_create'),
    path('contatos/<int:pk>/', contato_views.ContatoDetailView.as_view(), name='contato_detail'),
    path('contatos/telefone/', core_views.api_contato_por_telefone, name='contato_por_telefone'),
    
    # ===== OPERADORES =====
    path('operadores/', contato_views.api_operadores_list, name='operadores_list'),
    
    # ===== CONVERSAS =====
    path('conversas/', atendimento_views.ConversaListView.as_view(), name='conversa_list'),
    path('conversas/<int:pk>/', atendimento_views.ConversaDetailView.as_view(), name='conversa_detail'),
    
    # ===== INTERAÇÕES/MENSAGENS =====
    path('conversas/<int:conversa_pk>/interacoes/', atendimento_views.InteracaoCreateView.as_view(), name='interacao_create'),
    
    # ===== CRM/KANBAN =====
    path('estagios/<int:kanban_id>/', kanban_views.EstagioListView.as_view(), name='estagio_list'),
    path('estagios/<int:pk>/', kanban_views.EstagioDetailView.as_view(), name='estagio_detail'),
    path('kanbans/', kanban_views.KanbanListView.as_view(), name='kanban_list'),
    path('kanbans/<int:pk>/', kanban_views.KanbanUpdateDeleteView.as_view(), name='kanban_detail'),
    path('negocios/', negocio_views.NegocioListCreateView.as_view(), name='negocio_list_create'),
    path('kanbans/<int:kanban_id>/negocios/', negocio_views.NegocioListCreateView.as_view(), name='negocio_list_create'),
    path('negocios/<int:pk>/', negocio_views.NegocioDetailView.as_view(), name='negocio_detail'),
    path('funil/stats/', negocio_views.FunilStatsView.as_view(), name='funil_stats'),
    path('kanban/<int:kanban_id>/estagio/<int:estagio_id>/negocios/', kanban_views.NegociosPorEstagioView.as_view(),
         name='negocios-por-estagio'),
    path('buscar-por-telefone/', negocio_views.buscar_negocio_por_telefone, name='buscar_negocio_por_telefone'),
    path('contato-buscar_por_telefone/', contato_views.buscar_contato_por_telefone, name='buscar_contato_por_telefone'),

    # ===== RESPOSTAS RÁPIDAS =====
    path('respostas-rapidas/', atendimento_views.RespostasRapidasListView.as_view(), name='respostas_rapidas_list'),

    # ===== NOTAS DE ATENDIMENTO =====
    path('notas/', atendimento_views.NotaAtendimentoListCreateView.as_view(), name='nota_list_create'),
    path('notas/<int:pk>/', atendimento_views.NotaAtendimentoDetailView.as_view(), name='nota_detail'),
    path('conversas/<int:conversa_pk>/notas/', atendimento_views.NotaAtendimentoListCreateView.as_view(), name='conversa_notas'),

    # ===== TAREFAS =====
    path('tarefas/', atendimento_views.TarefaAtendimentoListCreateView.as_view(), name='tarefa_list_create'),
    path('tarefas/<int:pk>/', atendimento_views.TarefaAtendimentoDetailView.as_view(), name='tarefa_detail'),
    path('tarefas/minhas/', atendimento_views.MinhasTarefasView.as_view(), name='minhas_tarefas'),
    path('tarefas/stats/', atendimento_views.TarefasStatsView.as_view(), name='tarefas_stats'),
    path('tarefas/<int:task_id>/status/', atendimento_views.update_task_status, name='update_task_status'),
    
    # ===== QUICK ACTIONS =====
    path('quick/nota/', atendimento_views.quick_note_create, name='quick_note_create'),
    path('quick/tarefa/', atendimento_views.quick_task_create, name='quick_task_create'),
    
    # ===== WHATSAPP INTEGRATION =====
    path('whatsapp/dashboard/', atendimento_views.whatsapp_dashboard, name='whatsapp_dashboard'),
    path('whatsapp/status/', atendimento_views.whatsapp_status, name='whatsapp_status'),
    path('whatsapp/qr-code/', atendimento_views.whatsapp_qr_code, name='whatsapp_qr_code'),
    path('whatsapp/restart/', atendimento_views.whatsapp_restart, name='whatsapp_restart'),
    path('whatsapp/disconnect/', atendimento_views.whatsapp_disconnect, name='whatsapp_disconnect'),
    path('whatsapp/enviar/', atendimento_views.enviar_mensagem_view, name='enviar_mensagem'),
    path('whatsapp/presenca/', atendimento_views.enviar_presenca_view, name='enviar_presenca'),
    path('whatsapp/restart-debug/', contato_views.whatsapp_restart_debug, name='whatsapp_restart_debug'),
    # ===== WEBHOOKS =====
    path('webhook/evolution/', atendimento_views.evolution_webhook, name='evolution_webhook'),
    path('webhook/n8n/lead/', core_views.webhook_n8n_lead, name='webhook_n8n_lead'),
    
    # ===== ESTATÍSTICAS AVANÇADAS =====
    path('stats/tempo-resposta/', contato_views.TempoRespostaStatsView.as_view(), name='tempo_resposta_stats'),

    # atrib person
    path('atributos-personalizaveis/<int:negocio_id>/', atributos_views.AtributoPersonalizavelCreateView.as_view(), name='atributo-personalizavel-create'),

    # comentarios do negocio
    path('negocios/<int:negocio_id>/comentarios/', negocio_views.ComentarioCreateView.as_view(), name='negocio-comentario-create'),

    # notifs do usuario
    path('notificacoes/', notificacao_views.NotificacaoListView.as_view(), name='notificacoes'),
    path('notificacoes/marcar-todas-lidas/', notificacao_views.MarcarTodasLidasView.as_view(), name='marcar-todas-lidas'),
    path('notificacoes/criar/', notificacao_views.CriarNotificacaoView.as_view(), name='notificacoes'),

    # ===== ROUTER URLS =====
    path("health/", core_views.health),
    path('', include(router.urls)),
]

# ===== URL PATTERNS COM NAMESPACING =====
app_name = 'contatos'