from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from atendimento import views as atendimento_views

urlpatterns = [
    # ===== ADMIN =====
    path('admin/', admin.site.urls),
    
    # ===== API DOCUMENTATION =====
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # ===== OAUTH2 =====
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('api/oauth/', include('oauth2_integration.urls')),
    
    # ===== MAIN API =====
    path('', include('contato.urls')),
    path('', include('core.urls')),  # Mantém sem prefixo como estava
    path('translator/', include('message_translator.urls')),  # 🔄 Message Translator
]

# ===== STATIC/MEDIA FILES =====
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)