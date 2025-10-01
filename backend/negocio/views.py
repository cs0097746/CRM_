from django.shortcuts import render
from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404

from .models import Negocio
from .serializers import NegocioSerializer, ComentarioSerializer

class NegocioListCreateView(generics.ListCreateAPIView):
    """API: Lista e cria negócios"""
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        kanban_id = self.kwargs.get("kanban_id")
        return Negocio.objects.filter(estagio__kanban_id=kanban_id)

    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        estagio_id = data.get("estagio_id")
        contato_id = data.get("contato_id")

        if estagio_id:
            data["estagio"] = estagio_id
        if contato_id:
            data["contato"] = contato_id

        serializer = self.get_serializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NegocioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalha, atualiza e deleta negócio"""
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer
    permission_classes = [IsAuthenticated]


# ===== ESTATÍSTICAS =====

class FunilStatsView(APIView):
    """Estatísticas do funil"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        leads_por_estagio = {}
        for item in Negocio.objects.values('estagio__nome').annotate(count=Count('id')):
            leads_por_estagio[item['estagio__nome']] = item['count']

        stats = {
            'leads_por_estagio': leads_por_estagio,
            'valor_total': Negocio.objects.aggregate(total=Sum('valor'))['total'] or 0,
        }
        return Response(stats)

class ComentarioCreateView(generics.CreateAPIView):
    serializer_class = ComentarioSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        negocio_id = self.kwargs.get('negocio_id')
        negocio = get_object_or_404(Negocio, pk=negocio_id)

        comentario = serializer.save(criado_por=self.request.user)

        negocio.comentarios.add(comentario)

        negocio.save(update_fields=['atualizado_em'])