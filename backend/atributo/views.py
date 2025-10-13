from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from .models import AtributoPersonalizavel, PresetAtributos
from .serializers import AtributoPersonalizavelSerializer, PresetAtributosSerializer
from negocio.models import Negocio

class AtributoPersonalizavelCreateView(generics.CreateAPIView):
    queryset = AtributoPersonalizavel.objects.all()
    serializer_class = AtributoPersonalizavelSerializer
    permission_classes = [IsAuthenticated]

    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def perform_create(self, serializer):
        negocio_id = self.kwargs.get('negocio_id')

        if not negocio_id:
            raise NotFound("O ID do negócio deve ser fornecido na URL.")

        try:
            negocio = Negocio.objects.get(pk=negocio_id)
        except Negocio.DoesNotExist:
            raise NotFound(f"Negócio com ID {negocio_id} não encontrado.")

        atributo = serializer.save()

        negocio.atributos_personalizados.add(atributo)
        negocio.save(update_fields=['atualizado_em'])

class PresetAtributosListView(generics.ListCreateAPIView):
    queryset = PresetAtributos.objects.prefetch_related('atributos').all()
    serializer_class = PresetAtributosSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        print("Request d ata", request.data)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preset = serializer.save()
        return Response(
            PresetAtributosSerializer(preset).data,
            status=status.HTTP_201_CREATED
        )

class PresetAtributosDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PresetAtributos.objects.prefetch_related('atributos').all()
    serializer_class = PresetAtributosSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

class AtributoPersonalizavelUpdateView(generics.UpdateAPIView):
    queryset = AtributoPersonalizavel.objects.all()
    serializer_class = AtributoPersonalizavelSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def patch(self, request, *args, **kwargs):
        try:
            atributo = self.get_object()
        except AtributoPersonalizavel.DoesNotExist:
            raise NotFound("Atributo não encontrado.")

        serializer = self.get_serializer(
            atributo,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)