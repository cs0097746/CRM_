from rest_framework import serializers
from .models import AtributoPersonalizavel, TypeChoices

class AtributoPersonalizavelSerializer(serializers.ModelSerializer):

    class Meta:
        model = AtributoPersonalizavel
        fields = ['id', 'label', 'valor', 'type']
        read_only_fields = ['id']

    def validate_type(self, value):
        valid_types = [choice[0] for choice in TypeChoices.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Tipo inválido. Escolha entre: {', '.join(valid_types)}"
            )
        return value
