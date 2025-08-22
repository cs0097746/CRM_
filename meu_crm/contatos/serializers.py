# contatos/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contato, Interacao, Estagio, Negocio, Conversa, Operador, RespostasRapidas

# --- SERIALIZERS BÁSICOS ---

class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        fields = ['id', 'nome', 'email', 'telefone', 'empresa', 'cargo', 'criado_em']

class EstagioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estagio
        fields = ['id', 'nome', 'ordem']

# --- SERIALIZERS DE USUÁRIOS E OPERADORES ---

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class OperadorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Operador
        fields = ['id', 'user']

# --- SERIALIZERS DE CRM (KANBAN) ---

class NegocioSerializer(serializers.ModelSerializer):
    # Para a leitura (GET), mostramos os detalhes do contato e do estágio
    contato = ContatoSerializer(read_only=True)
    estagio = EstagioSerializer(read_only=True)

    class Meta:
        model = Negocio
        # Nos campos, incluímos apenas os nomes dos relacionamentos
        fields = ['id', 'titulo', 'valor', 'contato', 'estagio', 'criado_em']
        
# Serializer para listar as mensagens DENTRO de uma conversa
class InteracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interacao
        fields = ['id', 'mensagem', 'remetente', 'criado_em']
        # AVISO PARA O "RECEPCIONISTA": O campo 'remetente' é apenas para leitura.
        # Não o exija na entrada de dados, nós o preencheremos no servidor.
        read_only_fields = ['remetente']

class ConversaListSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True) # <-- Corrigido
    
    class Meta:
        model = Conversa
        fields = ['id', 'contato', 'operador', 'status', 'atualizado_em']

class ConversaDetailSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True) # <-- Corrigido
    interacoes = InteracaoSerializer(many=True, read_only=True)

    class Meta:
        model = Conversa
        fields = ['id', 'contato', 'operador', 'status', 'criado_em', 'atualizado_em', 'interacoes']

class RespostasRapidasSerializer(serializers.ModelSerializer):
    class Meta:
        model = RespostasRapidas
        fields = ['id', 'atalho', 'texto', 'operador']

