from django.db import models
from django.contrib.auth.models import User
from oauth2_provider.models import Application

class CrmApplication(models.Model):
    """Extensão do modelo Application do OAuth2"""
    application = models.OneToOneField(Application, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    webhook_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.application.client_id}"

class ApiUsageLog(models.Model):
    """Log de uso da API"""
    application = models.ForeignKey(CrmApplication, on_delete=models.CASCADE)
    endpoint = models.CharField(max_length=200)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField()
    response_time = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField()

    class Meta:
        indexes = [
            models.Index(fields=['timestamp', 'application']),
            models.Index(fields=['endpoint', 'method']),
        ]