from django.shortcuts import render
from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .models import Estagio, Kanban
from .serializers import EstagioSerializer, KanbanSerializer
from negocio.models import Negocio
from negocio.serializers import NegocioSerializer
from core.utils import get_ids_visiveis
# ===== CRM/KANBAN =====

class EstagioListView(generics.ListCreateAPIView):
    """API: Lista estágios"""
    serializer_class = EstagioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        kanban_id = self.kwargs.get("kanban_id")
        ids_visiveis = get_ids_visiveis(self.request.user)

        return Estagio.objects.filter(kanban__id=kanban_id, kanban__criado_por__id__in=ids_visiveis)

    def perform_create(self, serializer):
        kanban_id = self.kwargs.get("kanban_id")
        kanban = get_object_or_404(Kanban, id=kanban_id, criado_por=self.request.user)
        serializer.save(kanban=kanban)

class EstagioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalhe, update e delete de estágio"""
    serializer_class = EstagioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)

        return Estagio.objects.filter(kanban__criado_por__id__in=ids_visiveis)

class KanbanListView(generics.ListCreateAPIView):
    """API: Lista kanban"""
    serializer_class = KanbanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)

        return Kanban.objects.filter(criado_por__id__in=ids_visiveis)

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

class KanbanUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalha e atualiza kanban"""
    queryset = Kanban.objects.all()
    serializer_class = KanbanSerializer
    permission_classes = [IsAuthenticated]

class NegociosPorEstagioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, kanban_id, estagio_id):
        try:
            kanban = Kanban.objects.get(id=kanban_id)
        except Kanban.DoesNotExist:
            return Response([], status=200)

        try:
            estagio = Estagio.objects.get(id=estagio_id, kanban=kanban)
        except Estagio.DoesNotExist:
            return Response([], status=200)
        negocios = Negocio.objects.filter(estagio=estagio)
        serializer = NegocioSerializer(negocios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)