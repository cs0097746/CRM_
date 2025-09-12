from rest_framework import serializers
from .models import Negocio, Comentario
from contato.serializers import ContatoSerializer, OperadorSerializer
from kanban.serializers import EstagioSerializer
from atributo.models import AtributoPersonalizavel

class ComentarioSerializer(serializers.ModelSerializer):
    criado_por = serializers.SerializerMethodField()

    def get_criado_por(self, obj):
        return obj.criado_por.first_name if obj.criado_por else None

    class Meta:
        model = Comentario
        fields = ['criado_por', 'mensagem', 'criado_em']

class AtributoPersonalizavelSerializer(serializers.ModelSerializer):
    valor_formatado = serializers.SerializerMethodField()

    class Meta:
        model = AtributoPersonalizavel
        fields = ['id', 'label', 'valor', 'type', 'valor_formatado']

    def get_valor_formatado(self, obj):
        return obj.get_valor_formatado()

# ===== SERIALIZERS DE CRM =====

class NegocioSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    estagio = EstagioSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    valor_formatado = serializers.ReadOnlyField()

    atributos_personalizados = AtributoPersonalizavelSerializer(many=True, read_only=True)
    comentarios = ComentarioSerializer(many=True, read_only=True)

    contato_id = serializers.IntegerField(write_only=True)
    estagio_id = serializers.IntegerField(write_only=True)
    operador_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Negocio
        fields = [
            'id', 'titulo', 'descricao', 'valor', 'valor_formatado',
            'contato', 'contato_id', 'estagio', 'estagio_id',
            'operador', 'operador_id', 'origem', 'probabilidade',
            'data_prevista', 'criado_em', 'atualizado_em',
            'atributos_personalizados', 'comentarios',
        ]