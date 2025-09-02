from django.urls import path
from . import views

urlpatterns = [
    # Informações e testes
    path('info/', views.api_info_endpoint, name='api_info'),
    path('test/', views.test_endpoint, name='test'),
    
    # Endpoints OAuth2 (produção)
    path('contacts/', views.contacts_list_endpoint, name='contacts_list'),
    path('contacts/create/', views.contacts_create_endpoint, name='contacts_create'),
    path('contacts/<int:contact_id>/', views.contact_detail_endpoint, name='contact_detail'),
    
    path('conversations/', views.conversations_list_endpoint, name='conversations_list'),
    path('conversations/send-message/', views.conversations_send_message_endpoint, name='conversations_send_message'),
    path('conversations/<int:conversation_id>/status/', views.conversation_status_endpoint, name='conversation_status'),
    
    path('knowledge/', views.knowledge_endpoint, name='knowledge'),
    
    # Endpoints públicos (desenvolvimento)
    path('public/contacts/', views.contacts_public_endpoint, name='contacts_public'),
    path('public/conversations/', views.conversations_public_endpoint, name='conversations_public'),
]