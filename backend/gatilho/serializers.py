from kanban.serializers import EstagioSerializer
from rest_framework import serializers
from .models import Gatilho
from kanban.models import Estagio

class GatilhoSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo Gatilho.

    - Na leitura (GET), exibe os detalhes dos estágios aninhados (depth=1).
    - Na escrita (POST), aceita os IDs para estagio_origem e estagio_destino.
    """
    # Para exibir o nome do estágio na listagem (GET) em vez de apenas o ID.
    estagio_origem = EstagioSerializer(read_only=True)
    estagio_destino = EstagioSerializer(read_only=True)

    # Campos para receber os IDs na criação (POST/PUT).
    # O 'source' aponta para o campo do modelo, e 'write_only=True'
    # garante que eles não apareçam na resposta aninhada.
    estagio_origem_id = serializers.PrimaryKeyRelatedField(
        queryset=Estagio.objects.all(), source='estagio_origem', write_only=True, required=False, allow_null=True
    )
    estagio_destino_id = serializers.PrimaryKeyRelatedField(
        queryset=Estagio.objects.all(), source='estagio_destino', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Gatilho
        fields = [
            'id',
            'nome',
            'evento',
            'acao',
            'ativo',
            'parametros',
            'estagio_origem',       # Para leitura (GET)
            'estagio_destino',      # Para leitura (GET)
            'estagio_origem_id',    # Para escrita (POST)
            'estagio_destino_id'    # Para escrita (POST)
        ]
        # O depth=1 é uma alternativa mais simples se você não precisar de campos
        # write_only. A abordagem acima com PrimaryKeyRelatedField é mais explícita e robusta.
        # Se preferir simplicidade para a listagem: depth = 1

    def to_representation(self, instance):
        """
        Garante que os estágios sejam representados como objetos na resposta.
        """
        representation = super().to_representation(instance)
        # Se estagio_origem/destino existir, serializa usando EstagioSerializer
        if instance.estagio_origem:
            representation['estagio_origem'] = EstagioSerializer(instance.estagio_origem).data
        if instance.estagio_destino:
            representation['estagio_destino'] = EstagioSerializer(instance.estagio_destino).data
        return representation