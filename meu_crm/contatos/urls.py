# contatos/urls.py

from django.urls import path
from .views import EvolutionWebhookView # Mude a importação

urlpatterns = [
    # A URL agora pode ser mais específica, como 'webhook/evolution/'
    path('webhook/evolution/', EvolutionWebhookView.as_view(), name='webhook-evolution'),
]