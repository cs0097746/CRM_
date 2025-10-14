from kanban.serializers import EstagioSerializer
from rest_framework import serializers
from .models import Gatilho
from kanban.models import Estagio

class GatilhoSerializer(serializers.ModelSerializer):
    estagio_origem = EstagioSerializer(read_only=True)
    estagio_destino = EstagioSerializer(read_only=True)

    estagio_origem_id = serializers.PrimaryKeyRelatedField(
        queryset=Estagio.objects.all(), source='estagio_origem', write_only=True, required=False, allow_null=True
    )
    estagio_destino_id = serializers.PrimaryKeyRelatedField(
        queryset=Estagio.objects.all(), source='estagio_destino', write_only=True, required=False, allow_null=True
    )

    tarefa_relacionada = serializers.ChoiceField(
        choices=Gatilho.TAREFA_CHOICES,
        required=True,
        allow_null=True
    )

    dados_adicionais_tarefa = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Gatilho
        fields = [
            'id',
            'nome',
            'evento',
            'acao',
            'ativo',
            'nota',
            'estagio_origem',
            'estagio_destino',
            'estagio_origem_id',
            'estagio_destino_id',
            'tarefa_relacionada',
            'dados_adicionais_tarefa',
            'url_n8n'
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.estagio_origem:
            representation['estagio_origem'] = EstagioSerializer(instance.estagio_origem).data
        if instance.estagio_destino:
            representation['estagio_destino'] = EstagioSerializer(instance.estagio_destino).data
        return representation

    def create(self, validated_data):
        dados_adicionais_tarefa = validated_data.pop('dados_adicionais_tarefa', {})

        url_n8n = dados_adicionais_tarefa.get('url_n8n')

        if url_n8n:
            validated_data['url_n8n'] = url_n8n

        return super().create(validated_data)