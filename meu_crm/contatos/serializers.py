# contatos/serializers.py

from rest_framework import serializers
from .models import Contato

class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        # Defina quais campos do seu modelo devem ser incluídos na API
        fields = ['id', 'nome', 'email', 'telefone', 'empresa', 'cargo', 'criado_em']