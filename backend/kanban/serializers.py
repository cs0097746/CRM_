from rest_framework import serializers
from .models import Estagio

class EstagioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estagio
        fields = ['id', 'nome', 'descricao', 'ordem', 'cor', 'ativo']
