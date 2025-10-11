from django.contrib import admin
from django import forms
from django.utils import timezone
from datetime import timedelta
import secrets
from oauth2_provider.models import Application, AccessToken
from .models import CrmApplication, ApiUsageLog
from oauthlib.common import generate_token

try:
    admin.site.unregister(AccessToken)
except admin.sites.NotRegistered:
    pass

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

class AccessTokenForm(forms.ModelForm):
    EXPIRE_CHOICES = (
        ('1h', '1 hora'),
        ('1y', '1 ano'),
        ('custom', 'Personalizado'),
    )

    expires_in_choice = forms.ChoiceField(
        choices=EXPIRE_CHOICES,
        required=False,
        label="Validade do Token",
        help_text="Escolha a validade do token; 'Personalizado' mantém o campo expires manual"
    )

    class Meta:
        model = AccessToken
        fields = ('user', 'application', 'token', 'scope', 'expires')

    def save(self, commit=True):
        token = super().save(commit=False)

        if not token.token:
            token.token = generate_token()

        choice = self.cleaned_data.get('expires_in_choice')
        if choice == '1h':
            token.expires = timezone.now() + timedelta(hours=1)
        elif choice == '1y':
            token.expires = timezone.now() + timedelta(days=365)

        if commit:
            token.save()
        return token


@admin.register(AccessToken)
class AccessTokenAdmin(admin.ModelAdmin):
    form = AccessTokenForm
    list_display = ('user', 'token', 'application', 'expires', 'scope')
    search_fields = ('user__username', 'token')
    readonly_fields = ('token',)
    fields = ('user', 'application', 'token', 'scope', 'expires', 'expires_in_choice')
