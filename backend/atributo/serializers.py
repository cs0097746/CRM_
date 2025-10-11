from rest_framework import serializers
from .models import AtributoPersonalizavel, TypeChoices

class AtributoPersonalizavelSerializer(serializers.ModelSerializer):
    arquivo = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = AtributoPersonalizavel
        fields = ['id', 'label', 'valor', 'type', 'arquivo']
        read_only_fields = ['id']

    def validate_type(self, value):
        valid_types = [choice[0] for choice in TypeChoices.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Tipo inválido. Escolha entre: {', '.join(valid_types)}"
            )
        return value

    def validate(self, data):
        tipo = data.get('type')
        arquivo = data.get('arquivo')

        if tipo == TypeChoices.FILE and not arquivo:
            raise serializers.ValidationError("O campo 'arquivo' é obrigatório quando type='file'.")
        if tipo != TypeChoices.FILE:
            data['arquivo'] = None

        return data
