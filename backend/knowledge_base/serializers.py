from rest_framework import serializers
from .models import KnowledgeBaseSet, KnowledgeBaseField, KnowledgeBaseEntry, KnowledgeBaseValue


class KnowledgeBaseFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBaseField
        fields = ["id", "name", "field_type", "required", "created_at", "updated_at"]


class KnowledgeBaseValueSerializer(serializers.ModelSerializer):
    field = KnowledgeBaseFieldSerializer(read_only=True)
    field_id = serializers.PrimaryKeyRelatedField(queryset=KnowledgeBaseField.objects.all(), source="field",
                                                  write_only=True)

    value = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeBaseValue
        fields = ["id", "field", "field_id", "value"]

    def get_value(self, obj):
        return obj.get_value_display()


class KnowledgeBaseEntrySerializer(serializers.ModelSerializer):
    values = KnowledgeBaseValueSerializer(many=True, required=False)

    class Meta:
        model = KnowledgeBaseEntry
        fields = ["id", "kb_set", "created_at", "updated_at", "values"]

    def create(self, validated_data):
        values_data = validated_data.pop("values", [])
        entry = KnowledgeBaseEntry.objects.create(**validated_data)
        for val in values_data:
            KnowledgeBaseValue.objects.create(entry=entry, **val)
        return entry

    def update(self, instance, validated_data):
        values_data = validated_data.pop("values", [])
        instance.save()
        for val in values_data:
            field = val.get("field")
            value_obj, created = KnowledgeBaseValue.objects.get_or_create(entry=instance, field=field)
            for key, value in val.items():
                setattr(value_obj, key, value)
            value_obj.save()
        return instance


class KnowledgeBaseSetSerializer(serializers.ModelSerializer):
    fields = KnowledgeBaseFieldSerializer(many=True, read_only=True)
    entries = KnowledgeBaseEntrySerializer(many=True, read_only=True)

    class Meta:
        model = KnowledgeBaseSet
        fields = ["id", "client", "name", "created_at", "updated_at", "fields", "entries"]
