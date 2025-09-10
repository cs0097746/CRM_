from rest_framework import serializers
from .models import Negocio
from contato.serializers import ContatoSerializer, OperadorSerializer
from kanban.serializers import EstagioSerializer
# ===== SERIALIZERS DE CRM =====

class NegocioSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    estagio = EstagioSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    valor_formatado = serializers.ReadOnlyField()

    contato_id = serializers.IntegerField(write_only=True)
    estagio_id = serializers.IntegerField(write_only=True)
    operador_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Negocio
        fields = [
            'id', 'titulo', 'descricao', 'valor', 'valor_formatado',
            'contato', 'contato_id', 'estagio', 'estagio_id',
            'operador', 'operador_id', 'origem', 'probabilidade',
            'data_prevista', 'criado_em', 'atualizado_em'
        ]