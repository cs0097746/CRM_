# crm_project/urls.py

from django.contrib import admin
from django.urls import path, include # Adicione 'include'

urlpatterns = [
    path('admin/', admin.site.urls),
    # Inclua as URLs do nosso app 'contatos' no caminho 'api/'
    path('api/', include('contatos.urls')),
    
]