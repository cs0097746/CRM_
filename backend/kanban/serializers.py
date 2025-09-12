from rest_framework import serializers
from .models import Estagio, Kanban

class EstagioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estagio
        fields = ['id', 'nome', 'descricao', 'ordem', 'cor', 'ativo', 'kanban']

class KanbanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kanban
        fields = '__all__'