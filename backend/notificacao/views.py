from rest_framework import generics, permissions
from .models import Notificacao
from .serializers import NotificacaoSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class NotificacaoListView(generics.ListAPIView):
    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacao.objects.filter(usuario=self.request.user).order_by('-criado_em')

class MarcarTodasLidasView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        notificacoes = Notificacao.objects.filter(usuario=request.user, lida=False)
        count = notificacoes.update(lida=True)
        return Response(
            {"mensagem": f"{count} notificações marcadas como lidas."},
            status=status.HTTP_200_OK
        )


class CriarNotificacaoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        data['usuario'] = request.user.id

        serializer = NotificacaoSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)