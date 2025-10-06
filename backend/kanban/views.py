from django.shortcuts import render
from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Estagio, Kanban
from .serializers import EstagioSerializer, KanbanSerializer
from negocio.models import Negocio
# ===== CRM/KANBAN =====

class EstagioListView(generics.ListCreateAPIView):
    """API: Lista estágios"""
    queryset = Estagio.objects.all()
    serializer_class = EstagioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        kanban_id = self.kwargs.get("kanban_id")
        return Estagio.objects.filter(kanban_id=kanban_id)

    def post(self, request, *args, **kwargs):
        kanban_id = self.kwargs.get("kanban_id")
        kanban = get_object_or_404(Kanban, id=kanban_id)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(kanban=kanban)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EstagioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalhe, update e delete de estágio"""
    queryset = Estagio.objects.all()
    serializer_class = EstagioSerializer
    permission_classes = [IsAuthenticated]

class KanbanListView(generics.ListCreateAPIView):
    """API: Lista kanban"""
    queryset = Kanban.objects.all()
    serializer_class = KanbanSerializer
    permission_classes = [IsAuthenticated]

class KanbanUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalha e atualiza kanban"""
    queryset = Kanban.objects.all()
    serializer_class = KanbanSerializer
    permission_classes = [IsAuthenticated]

class NegociosPorEstagioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, kanban_id, estagio_id):
        kanban = get_object_or_404(Kanban, id=kanban_id)
        estagio = get_object_or_404(Estagio, id=estagio_id, kanban=kanban)
        negocios = Negocio.objects.filter(estagio=estagio)
        serializer = NegocioSerializer(negocios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)