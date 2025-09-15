from rest_framework import generics
from .models import AtributoPersonalizavel
from .serializers import AtributoPersonalizavelSerializer

class AtributoPersonalizavelListView(generics.ListAPIView):
    """
    Esta view retorna uma lista de todos os atributos personalizáveis disponíveis.
    """
    queryset = AtributoPersonalizavel.objects.all()
    serializer_class = AtributoPersonalizavelSerializer
    # Se você tiver permissões, adicione aqui. Ex: permission_classes = [IsAuthenticated]