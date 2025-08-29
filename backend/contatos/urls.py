# contatos/urls.py

from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .views import (
    EvolutionWebhookView,
    NegocioListCreateView,
    NegocioDetailView,
    ConversaListView,      # <--- Adicionar
    ConversaDetailView,    # <--- Adicionar
    InteracaoCreateView,
    RespostasRapidasListView,
    FunilStatsView,
    TempoRespostaStatsView,
    DashboardStatsView,
    EstagioListView,
)

urlpatterns = [
    # URLs existentes
    path('webhook/evolution/', EvolutionWebhookView.as_view(), name='webhook-evolution'),
    path('negocios/', NegocioListCreateView.as_view(), name='lista-cria-negocio'),
    path('negocios/<int:pk>/', NegocioDetailView.as_view(), name='detalhe-negocio'),

    # --- NOVAS URLS PARA O MÓDULO DE ATENDIMENTO ---

    path('conversas/', ConversaListView.as_view(), name='lista-conversas'),
    path('conversas/<int:pk>/', ConversaDetailView.as_view(), name='detalhe-conversa'),
    path('conversas/<int:conversa_pk>/mensagens/', InteracaoCreateView.as_view(), name='cria-interacao'),

    path('respostas-rapidas/', RespostasRapidasListView.as_view(), name='lista-cria-respostas-rapidas'),
    path('stats/funil/', FunilStatsView.as_view(), name='stats-funil'),
    path('stats/tempo-resposta/', TempoRespostaStatsView.as_view(), name='stats-tempo-resposta'),
    path('estagios/', EstagioListView.as_view(), name='lista-estagios'),

     path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]