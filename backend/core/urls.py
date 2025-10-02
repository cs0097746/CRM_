# backend/core/urls.py - CRIAR OU VERIFICAR:
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard_stats, name='dashboard_stats'),
    
    # ✅ CONFIGURAÇÃO DO SISTEMA - ESTA É A URL QUE FALTA!
    path('api/configuracao-sistema/', views.configuracao_sistema, name='configuracao_sistema'),
    
    # Outras URLs...
    path('api/criar-usuario-teste/', views.criar_usuario_teste, name='criar_usuario_teste'),
]