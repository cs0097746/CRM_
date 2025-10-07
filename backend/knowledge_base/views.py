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
        Cria uma base de conhecimento completa:
        {
          "client": 1,
          "name": "Imóveis",
          "fields": [
            {"name": "Endereço", "field_type": "TEXT"},
            {"name": "Preço", "field_type": "NUMBER"}
          ]
        }
        """
        client_id = request.data.get("client")
        name = request.data.get("name")
        fields = request.data.get("fields", [])

        if not client_id or not name:
            return Response({"error": "client e name são obrigatórios."}, status=400)

        kb_set = KnowledgeBaseSet.objects.create(client_id=client_id, name=name)

        for f in fields:
            KnowledgeBaseField.objects.create(
                kb_set=kb_set,
                name=f.get("name"),
                field_type=f.get("field_type", "TEXT"),
                required=f.get("required", False)
            )

        serializer = KnowledgeBaseSetSerializer(kb_set)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
