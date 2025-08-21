# contatos/urls.py

from django.urls import path
from .views import EvolutionWebhookView, NegocioListCreateView, NegocioDetailView 

urlpatterns = [
    # A URL agora pode ser mais específica, como 'webhook/evolution/'
    path('webhook/evolution/', EvolutionWebhookView.as_view(), name='webhook-evolution'),

    # URL para listar todos os negócios e criar um novo
    # Ex: GET /api/negocios/  ou POST /api/negocios/
    path('negocios/', NegocioListCreateView.as_view(), name='lista-cria-negocio'),
    
    # URL para ver ou atualizar um negócio específico pelo seu ID (pk = Primary Key)
    # Ex: GET /api/negocios/1/ ou PATCH /api/negocios/1/
    path('negocios/<int:pk>/', NegocioDetailView.as_view(), name='detalhe-negocio'),
]