from django.shortcuts import render
from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Sum, Q
from django.shortcuts import get_object_or_404
from contato.models import Contato
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

    def get_object(self):
        try:
            return super().get_object()
        except self.queryset.model.DoesNotExist:
            return None

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response({}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_negocio_por_telefone(request):
    """
    Buscar negócios pelo telefone ou whatsapp_id do contato,
    com opção de filtrar por kanban_id e/ou estagio_id.
    """
    telefone = request.GET.get('telefone')
    kanban_id = request.GET.get('kanban_id')
    estagio_id = request.GET.get('estagio_id')

    if not telefone:
        return Response({'error': 'Informe o parâmetro telefone.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Buscar contato correspondente
        contato = Contato.objects.filter(
            Q(telefone=telefone) | Q(whatsapp_id=telefone)
        ).first()

        if not contato:
            return Response({'error': 'Contato não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # Buscar negócios relacionados
        negocios = Negocio.objects.filter(contato=contato)

        # Filtros opcionais
        if kanban_id:
            negocios = negocios.filter(estagio__kanban_id=kanban_id)

        if estagio_id:
            negocios = negocios.filter(estagio_id=estagio_id)

        if not negocios.exists():
            return Response([], status=status.HTTP_200_OK)

        serializer = NegocioSerializer(negocios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)