from rest_framework import serializers
from contato.models import Contato
from atendimento.models import Conversa, Interacao

class ContatoOAuthSerializer(serializers.ModelSerializer):
    """Serializer otimizado para OAuth2/n8n"""
    
    class Meta:
        model = Contato
        fields = [
            'id', 'nome', 'email', 'telefone', 'empresa', 'cargo', 
            'endereco', 'cidade', 'estado', 'cep', 'data_nascimento', 
            'observacoes', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']

class InteracaoOAuthSerializer(serializers.ModelSerializer):
    operador_nome = serializers.CharField(source='operador.user.username', read_only=True)
    
    class Meta:
        model = Interacao
        fields = ['id', 'mensagem', 'remetente', 'timestamp', 'operador_nome', 'anexo', 'criado_em']

class ConversaOAuthSerializer(serializers.ModelSerializer):
    contato = ContatoOAuthSerializer(read_only=True)
    interacoes = InteracaoOAuthSerializer(many=True, read_only=True)
    operador_nome = serializers.CharField(source='operador.user.username', read_only=True)
    
    class Meta:
        model = Conversa
        fields = [
            'id', 'contato', 'status', 'operador_nome', 
            'criado_em', 'atualizado_em', 'interacoes'
        ]