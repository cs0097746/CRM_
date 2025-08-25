# crm/crm_project/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # ADICIONE A LINHA ABAIXO. ESTA É A ROTA CORRETA.
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    
    # Esta linha continua a direcionar o resto das chamadas de API
    path('api/', include('contatos.urls')),
]