# contatos/serializers.py

from rest_framework import serializers
from .models import Contato, Interacao, Estagio, Negocio 

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