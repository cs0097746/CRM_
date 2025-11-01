from rest_framework import serializers
from .models import KnowledgeBaseSet, KnowledgeBaseField, KnowledgeBaseEntry, KnowledgeBaseValue


class KnowledgeBaseFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBaseField
        fields = ["id", "name", "field_type", "required", "created_at", "updated_at", 'kb_set']


class KnowledgeBaseValueSerializer(serializers.ModelSerializer):
    field = KnowledgeBaseFieldSerializer(read_only=True)
    field_id = serializers.PrimaryKeyRelatedField(
        queryset=KnowledgeBaseField.objects.all(),
        source="field",
        write_only=True
    )

    value = serializers.JSONField(required=False)

    class Meta:
        model = KnowledgeBaseValue
        fields = ["id", "field", "field_id", "value"]

    def create(self, validated_data):
        field = validated_data.pop("field")
        value = validated_data.pop("value", None)

        if value is not None:
            if field.field_type == "TEXT":
                validated_data["value_text"] = value
            elif field.field_type == "NUMBER":
                validated_data["value_number"] = value
            elif field.field_type == "BOOLEAN":
                validated_data["value_boolean"] = value
            elif field.field_type == "DATE":
                validated_data["value_date"] = value
            elif field.field_type == "URL":
                validated_data["value_url"] = value
            elif field.field_type == "JSON":
                validated_data["value_json"] = value

        validated_data["field"] = field
        return super().create(validated_data)

    def update(self, instance, validated_data):
        value = validated_data.pop("value", None)
        field = validated_data.get("field", instance.field)

        if value is not None:
            if field.field_type == "TEXT":
                instance.value_text = value
            elif field.field_type == "NUMBER":
                instance.value_number = value
            elif field.field_type == "BOOLEAN":
                instance.value_boolean = value
            elif field.field_type == "DATE":
                instance.value_date = value
            elif field.field_type == "URL":
                instance.value_url = value
            elif field.field_type == "JSON":
                instance.value_json = value

        return super().update(instance, validated_data)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["value"] = instance.get_value_display()
        return rep

class KnowledgeBaseEntrySerializer(serializers.ModelSerializer):
    values = KnowledgeBaseValueSerializer(many=True, required=False)

    class Meta:
        model = KnowledgeBaseEntry
        fields = ["id", "kb_set", "created_at", "updated_at", "values"]

    def create(self, validated_data):
        values_data = validated_data.pop("values", [])
        entry = KnowledgeBaseEntry.objects.create(**validated_data)

        for value_data in values_data:
            field = value_data["field"]
            value = value_data.get("value")

            value_kwargs = {"entry": entry, "field": field}

            if field.field_type == "TEXT":
                value_kwargs["value_text"] = value
            elif field.field_type == "NUMBER":
                value_kwargs["value_number"] = value
            elif field.field_type == "BOOLEAN":
                value_kwargs["value_boolean"] = value
            elif field.field_type == "DATE":
                value_kwargs["value_date"] = value
            elif field.field_type == "URL":
                value_kwargs["value_url"] = value
            elif field.field_type == "JSON":
                value_kwargs["value_json"] = value

            KnowledgeBaseValue.objects.create(**value_kwargs)

        return entry

    def update(self, instance, validated_data):
        values_data = validated_data.pop("values", [])

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        for val in values_data:
            field = val.get("field")
            new_value = val.get("value")
            if not field:
                continue

            value_obj, _ = KnowledgeBaseValue.objects.get_or_create(entry=instance, field=field)

            if field.field_type == "TEXT":
                value_obj.value_text = new_value
            elif field.field_type == "NUMBER":
                value_obj.value_number = new_value
            elif field.field_type == "BOOLEAN":
                value_obj.value_boolean = new_value
            elif field.field_type == "DATE":
                value_obj.value_date = new_value
            elif field.field_type == "URL":
                value_obj.value_url = new_value
            elif field.field_type == "JSON":
                value_obj.value_json = new_value

            value_obj.save()

        return instance


class KnowledgeBaseSetSerializer(serializers.ModelSerializer):
    fields = KnowledgeBaseFieldSerializer(many=True, read_only=True)
    entries = KnowledgeBaseEntrySerializer(many=True, read_only=True)

    class Meta:
        model = KnowledgeBaseSet
        fields = ["id", "client", "name", "created_at", "updated_at", "fields", "entries"]
        extra_kwargs = {
            "client": {"read_only": True}
        }