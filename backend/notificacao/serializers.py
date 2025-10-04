from rest_framework import serializers
from .models import Notificacao

class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Notificacao
        fields = ['id', 'texto', 'tipo', 'tipo_display', 'lida', 'criado_em']
        read_only_fields = ['id', 'criado_em']
