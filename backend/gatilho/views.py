from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Gatilho
from kanban.models import Estagio
from .serializers import GatilhoSerializer, EstagioSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_gatilhos(request):
    """
    Lista todos os gatilhos cadastrados.
    """
    try:
        gatilhos = Gatilho.objects.all().order_by('-id')
        serializer = GatilhoSerializer(gatilhos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_gatilho(request):
    """
    Cria um novo gatilho com base nos dados recebidos do frontend.
    """
    # Renomeia as chaves recebidas do frontend para corresponder ao serializer
    data = request.data.copy()
    if 'estagio_origem' in data:
        data['estagio_origem_id'] = data.pop('estagio_origem')
    if 'estagio_destino' in data:
        data['estagio_destino_id'] = data.pop('estagio_destino')

    serializer = GatilhoSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def excluir_gatilho(request, pk):
    """
    Exclui um gatilho específico pelo seu ID (pk).
    """
    try:
        gatilho = Gatilho.objects.get(pk=pk)
        gatilho.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Gatilho.DoesNotExist:
        return Response({'error': 'Gatilho não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- View Auxiliar para o Formulário ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_estagios(request):
    """
    Endpoint auxiliar para popular os seletores no formulário de criação de gatilhos.
    """
    try:
        estagios = Estagio.objects.all().order_by('ordem')  # Ou qualquer outra ordenação
        serializer = EstagioSerializer(estagios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)