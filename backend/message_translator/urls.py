"""
URLs do Message Translator
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'canais', views.CanalConfigViewSet, basename='canal')
router.register(r'logs', views.MensagemLogViewSet, basename='mensagem-log')
router.register(r'regras', views.RegrasRoteamentoViewSet, basename='regra-roteamento')
router.register(r'webhooks-customizados', views.WebhookCustomizadoViewSet, basename='webhook-customizado')

urlpatterns = [
    # Webhooks principais
    path('incoming/', views.webhook_entrada, name='webhook-entrada'),
    path('outgoing/', views.webhook_saida, name='webhook-saida'),
    
    # CRUD
    path('', include(router.urls)),
]
