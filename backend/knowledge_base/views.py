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

WEBHOOK_URL = "https:/n8nurl" #TODO: colocar a url do n8n p prd

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
