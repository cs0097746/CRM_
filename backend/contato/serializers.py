from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth.models import User
from .models import Contato, Operador
# from atendimento.models import Conversa, Interacao, RespostasRapidas, NotaAtendimento, AnexoNota, TarefaAtendimento, LogAtividade
# from negocio.models import Negocio
# from kanban.models import Kanban, Estagio

# ===== SERIALIZERS BÁSICOS =====

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class OperadorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    nome_display = serializers.ReadOnlyField()

    class Meta:
        model = Operador
        fields = ['id', 'user', 'ativo', 'ramal', 'setor', 'nome_display']

class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        fields = [
            'id', 'nome', 'email', 'telefone', 'empresa', 'cargo',
            'endereco', 'cidade', 'estado', 'cep', 'data_nascimento',
            'observacoes', 'criado_em', 'atualizado_em'
        ]