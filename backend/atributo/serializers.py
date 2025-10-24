from rest_framework import serializers
from .models import AtributoPersonalizavel, TypeChoices, PresetAtributos

class AtributoPersonalizavelSerializer(serializers.ModelSerializer):
    arquivo = serializers.FileField(required=False, allow_null=True)
    label = serializers.CharField(required=False, allow_blank=True)
    valor = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = AtributoPersonalizavel
        fields = ['id', 'label', 'valor', 'type', 'arquivo', 'criado_por']
        read_only_fields = ['id', 'criado_por']

    def validate_type(self, value):
        valid_types = [choice[0] for choice in TypeChoices.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Tipo inválido. Escolha entre: {', '.join(valid_types)}"
            )
        return value

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        tipo = data.get('type', getattr(instance, 'type', None))
        arquivo = data.get('arquivo', getattr(instance, 'arquivo', None))

        if tipo == TypeChoices.FILE and not arquivo:
            raise serializers.ValidationError("O campo 'arquivo' é obrigatório quando type='file'.")
        if tipo != TypeChoices.FILE:
            data['arquivo'] = None

        return data

    def update(self, instance, validated_data):
        new_label = validated_data.get('label', None)
        if new_label is not None:
            if not new_label or (isinstance(new_label, str) and new_label.strip() == "") or new_label == instance.label:
                validated_data.pop('label', None)

        new_valor = validated_data.get('valor', None)
        if new_valor is not None:
            if not new_valor or (isinstance(new_valor, str) and new_valor.strip() == "") or new_valor == instance.valor:
                validated_data.pop('valor', None)

        return super().update(instance, validated_data)

class PresetAtributosSerializer(serializers.ModelSerializer):
    atributos = AtributoPersonalizavelSerializer(many=True)

    class Meta:
        model = PresetAtributos
        fields = ['id', 'nome', 'descricao', 'atributos', 'criado_por']
        read_only_fields = ['id', 'criado_por']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['atributos'] = sorted(data['atributos'], key=lambda x: x.get('id', ''))
        return data

    def create(self, validated_data):
        atributos_data = validated_data.pop('atributos', [])
        preset = PresetAtributos.objects.create(**validated_data)

        for attr_data in atributos_data:
            atributo = AtributoPersonalizavel.objects.create(**attr_data)
            preset.atributos.add(atributo)

        return preset

    def update(self, instance, validated_data):
        instance.nome = validated_data.get('nome', instance.nome)
        instance.descricao = validated_data.get('descricao', instance.descricao)
        instance.save()

        atributos_data = validated_data.pop('atributos', [])
        atributos_atuais_ids = set(instance.atributos.values_list('id', flat=True))
        atributos_novos_ids = set()

        for attr_data in atributos_data:
            attr_id = attr_data.get('id')

            if attr_id and attr_id in atributos_atuais_ids:
                try:
                    atributo_instance = AtributoPersonalizavel.objects.get(pk=attr_id)
                    atributo_serializer = AtributoPersonalizavelSerializer(
                        instance=atributo_instance,
                        data=attr_data,
                        partial=True
                    )
                    atributo_serializer.is_valid(raise_exception=True)
                    atributo_serializer.save()
                    atributos_novos_ids.add(attr_id)
                except AtributoPersonalizavel.DoesNotExist:
                    pass

            elif not attr_id:
                attr_data.pop('id', None)

                novo_atributo = AtributoPersonalizavel.objects.create(**attr_data)
                instance.atributos.add(novo_atributo)
                atributos_novos_ids.add(novo_atributo.id)

        atributos_para_remover_ids = atributos_atuais_ids - atributos_novos_ids

        instance.atributos.remove(*atributos_para_remover_ids)

        return instance