from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from .models import AtributoPersonalizavel, PresetAtributos
from .serializers import AtributoPersonalizavelSerializer, PresetAtributosSerializer
from negocio.models import Negocio
from core.utils import get_ids_visiveis

class AtributoPersonalizavelDeleteView(generics.DestroyAPIView):
    serializer_class = AtributoPersonalizavelSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)
        return AtributoPersonalizavel.objects.filter(criado_por__id__in=ids_visiveis)

    def get_object(self):
        try:
            return super().get_object()
        except AtributoPersonalizavel.DoesNotExist:
            raise NotFound("AtributoPersonalizavel não encontrado.")

class AtributoPersonalizavelCreateView(generics.CreateAPIView):
    serializer_class = AtributoPersonalizavelSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)
        return AtributoPersonalizavel.objects.filter(criado_por__id__in=ids_visiveis)

    def perform_create(self, serializer):
        negocio_id = self.kwargs.get('negocio_id')

        if not negocio_id:
            raise NotFound("O ID do negócio deve ser fornecido na URL.")

        try:
            negocio = Negocio.objects.get(pk=negocio_id)
        except Negocio.DoesNotExist:
            raise NotFound(f"Negócio com ID {negocio_id} não encontrado.")

        atributo = serializer.save(criado_por=self.request.user)
        negocio.atributos_personalizados.add(atributo)
        negocio.save(update_fields=['atualizado_em'])

class PresetAtributosListView(generics.ListCreateAPIView):
    serializer_class = PresetAtributosSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)
        return PresetAtributos.objects.prefetch_related('atributos').filter(criado_por__id__in=ids_visiveis)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preset = serializer.save(criado_por=request.user)
        for atributo in preset.atributos.all():
            if not atributo.criado_por:
                atributo.criado_por = request.user
                atributo.save(update_fields=['criado_por'])
        return Response(
            PresetAtributosSerializer(preset).data,
            status=status.HTTP_201_CREATED
        )

class PresetAtributosDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PresetAtributosSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)
        return PresetAtributos.objects.prefetch_related('atributos').filter(criado_por__id__in=ids_visiveis)

class AtributoPersonalizavelUpdateView(generics.UpdateAPIView):
    serializer_class = AtributoPersonalizavelSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        ids_visiveis = get_ids_visiveis(self.request.user)
        return AtributoPersonalizavel.objects.filter(criado_por__id__in=ids_visiveis)

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