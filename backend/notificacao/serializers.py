from rest_framework import serializers
from .models import Notificacao
from django.contrib.auth.models import User

class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    usuario = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Notificacao
        fields = ['id', 'texto', 'tipo', 'tipo_display', 'lida', 'criado_em', 'usuario']
        read_only_fields = ['id', 'criado_em']
