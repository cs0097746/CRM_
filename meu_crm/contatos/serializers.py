# contatos/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contato, Interacao, Estagio, Negocio, Conversa, Operador # Adicione Conversa e Operador


class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        # Defina quais campos do seu modelo devem ser incluídos na API
        fields = ['id', 'nome', 'email', 'telefone', 'empresa', 'cargo', 'criado_em']

class EstagioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estagio
        fields = ['id', 'nome', 'ordem']

class NegocioSerializer(serializers.ModelSerializer):
    # Para deixar a API mais legível, vamos mostrar o nome do estágio
    # em vez de apenas o seu ID.
    estagio = EstagioSerializer(read_only=True)
    # E vamos permitir que a API receba apenas o ID para atualizações
    estagio_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Negocio
        fields = ['id', 'titulo', 'valor', 'contato', 'estagio', 'estagio_id', 'criado_em']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

# Serializer para listar as mensagens DENTRO de uma conversa
class InteracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interacao
        fields = ['id', 'mensagem', 'remetente', 'criado_em']

# Serializer para mostrar os detalhes completos de UMA conversa
class ConversaDetailSerializer(serializers.ModelSerializer):
    # "Aninhado" - Mostra a lista de interações dentro da conversa
    interacoes = InteracaoSerializer(many=True, read_only=True)
    contato = ContatoSerializer(read_only=True)
    operador = UserSerializer(read_only=True) # Mostra os dados do User do operador

    class Meta:
        model = Conversa
        fields = ['id', 'contato', 'operador', 'status', 'criado_em', 'atualizado_em', 'interacoes']

# Serializer mais simples para a LISTA de conversas
class ConversaListSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    operador = UserSerializer(read_only=True)
    
    class Meta:
        model = Conversa
        fields = ['id', 'contato', 'operador', 'status', 'atualizado_em']