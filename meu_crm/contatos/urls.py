# contatos/urls.py

from django.urls import path
from .views import (
    EvolutionWebhookView, 
    NegocioListCreateView, 
    NegocioDetailView,
    ConversaListView,      # <--- Adicionar
    ConversaDetailView,    # <--- Adicionar
    InteracaoCreateView    # <--- Adicionar
)

urlpatterns = [
    # URLs existentes
    path('webhook/evolution/', EvolutionWebhookView.as_view(), name='webhook-evolution'),
    path('negocios/', NegocioListCreateView.as_view(), name='lista-cria-negocio'),
    path('negocios/<int:pk>/', NegocioDetailView.as_view(), name='detalhe-negocio'),

    # --- NOVAS URLS PARA O MÓDULO DE ATENDIMENTO ---

    # Para listar todas as conversas
    # Ex: GET /api/conversas/
    path('conversas/', ConversaListView.as_view(), name='lista-conversas'),

    # Para ver os detalhes e mensagens de uma conversa
    # Ex: GET /api/conversas/1/
    path('conversas/<int:pk>/', ConversaDetailView.as_view(), name='detalhe-conversa'),

    # Para um operador enviar uma mensagem para uma conversa
    # Ex: POST /api/conversas/1/mensagens/
    path('conversas/<int:conversa_pk>/mensagens/', InteracaoCreateView.as_view(), name='cria-interacao'),
]