from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import KnowledgeBaseSet, KnowledgeBaseField, KnowledgeBaseEntry, KnowledgeBaseValue
from .serializers import (
    KnowledgeBaseSetSerializer,
    KnowledgeBaseFieldSerializer,
    KnowledgeBaseEntrySerializer,
    KnowledgeBaseValueSerializer
)
import requests
from rest_framework import status

WEBHOOK_URL = "https:/n8nurl"

def trigger_webhook(event_type, data):
    try:
        requests.post(WEBHOOK_URL, json={"event": event_type, "data": data})
    except Exception as e:
        print(f"Erro ao enviar webhook: {e}")

class KnowledgeBaseSetViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBaseSet.objects.all()
    serializer_class = KnowledgeBaseSetSerializer

    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class KnowledgeBaseFieldViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBaseField.objects.all()
    serializer_class = KnowledgeBaseFieldSerializer

class KnowledgeBaseEntryViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBaseEntry.objects.all()
    serializer_class = KnowledgeBaseEntrySerializer

    def perform_create(self, serializer):
        entry = serializer.save()
        trigger_webhook("entry_created", KnowledgeBaseEntrySerializer(entry).data)

    def perform_update(self, serializer):
        entry = serializer.save()
        trigger_webhook("entry_updated", KnowledgeBaseEntrySerializer(entry).data)

    def perform_destroy(self, instance):
        data = KnowledgeBaseEntrySerializer(instance).data
        instance.delete()
        trigger_webhook("entry_deleted", data)

class KnowledgeBaseSetViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBaseSet.objects.all()
    serializer_class = KnowledgeBaseSetSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    @action(detail=False, methods=["post"])
    def create_full(self, request):
        """
        Cria ou atualiza uma base completa (única por cliente e nome),
        incluindo campos e entries (linhas de dados).

        Exemplo JSON:
        {
          "client": 1,
          "name": "Imóveis",
          "fields": [
            {"name": "Endereço", "field_type": "TEXT"},
            {"name": "Preço", "field_type": "NUMBER"},
            {"name": "Ativo", "field_type": "BOOLEAN"}
          ],
          "entries": [
            {"values": {"Endereço": "Rua das Flores", "Preço": 500000, "Ativo": true}},
            {"values": {"Endereço": "Av. Central", "Preço": 350000, "Ativo": false}}
          ]
        }
        """

        client_id = request.data.get("client")
        name = request.data.get("name")
        fields_data = request.data.get("fields", [])
        entries_data = request.data.get("entries", [])

        if not client_id or not name:
            return Response({"error": "Os campos 'client' e 'name' são obrigatórios."}, status=400)

        # ✅ Garante que só exista uma base por cliente+nome
        kb_set, created = KnowledgeBaseSet.objects.get_or_create(
            client_id=client_id,
            name__iexact=name,
            defaults={"name": name}
        )

        if not created:
            # limpa campos e entries anteriores antes de recriar
            kb_set.fields.all().delete()
            kb_set.entries.all().delete()

        # 🧱 Cria campos
        field_map = {}
        for f in fields_data:
            field = KnowledgeBaseField.objects.create(
                kb_set=kb_set,
                name=f.get("name"),
                field_type=f.get("field_type", "TEXT"),
                required=f.get("required", False)
            )
            field_map[field.name] = field

        # 🧾 Cria entries e valores
        for entry_data in entries_data:
            entry = KnowledgeBaseEntry.objects.create(kb_set=kb_set)
            values_dict = entry_data.get("values", {})
            for field_name, val in values_dict.items():
                field = field_map.get(field_name)
                if not field:
                    continue

                value_kwargs = {"entry": entry, "field": field}

                # Define o valor conforme o tipo
                if field.field_type == "TEXT":
                    value_kwargs["value_text"] = val
                elif field.field_type == "NUMBER":
                    value_kwargs["value_number"] = val
                elif field.field_type == "BOOLEAN":
                    value_kwargs["value_boolean"] = val
                elif field.field_type == "DATE":
                    value_kwargs["value_date"] = val
                elif field.field_type == "URL":
                    value_kwargs["value_url"] = val
                elif field.field_type == "JSON":
                    value_kwargs["value_json"] = val

                KnowledgeBaseValue.objects.create(**value_kwargs)

        # 🔔 Retorna a base criada/atualizada
        serializer = KnowledgeBaseSetSerializer(kb_set)
        trigger_webhook("kb_set_created_or_updated", serializer.data)

        return Response(serializer.data, status=status.HTTP_201_CREATED)