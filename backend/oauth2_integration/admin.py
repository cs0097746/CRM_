from django.contrib import admin

# Register your models here.
from django.contrib import admin
from oauth2_provider.models import Application
from .models import CrmApplication, ApiUsageLog

@admin.register(CrmApplication)
class CrmApplicationAdmin(admin.ModelAdmin):
    list_display = ['name', 'application', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'application__client_id']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(ApiUsageLog)
class ApiUsageLogAdmin(admin.ModelAdmin):
    list_display = ['application', 'endpoint', 'method', 'status_code', 'response_time', 'timestamp']
    list_filter = ['method', 'status_code', 'timestamp']
    search_fields = ['endpoint', 'application__name']
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False  # Não permitir adição manual