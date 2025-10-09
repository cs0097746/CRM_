from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import AtributoPersonalizavel
from .serializers import AtributoPersonalizavelSerializer
from negocio.models import Negocio
from rest_framework.exceptions import NotFound

class AtributoPersonalizavelCreateView(generics.CreateAPIView):
    queryset = AtributoPersonalizavel.objects.all()
    serializer_class = AtributoPersonalizavelSerializer
    permission_classes = [IsAuthenticated]

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