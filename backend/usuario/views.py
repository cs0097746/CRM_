from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from contato.models import Contato
from core.utils import get_ids_visiveis
from kanban.models import Kanban
from usuario.models import PlanoUsuario

@api_view(["POST"])
def register(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    criado_por_id = data.get("criado_por")

    if not username or not password or not email:
        return Response({"success": False, "message": "Todos os campos são obrigatórios"})

    if User.objects.filter(username=username).exists():
        return Response({"success": False, "message": "Usuário já existe"})

    criado_por = None
    if criado_por_id:
        try:
            criado_por = User.objects.get(id=criado_por_id)
        except User.DoesNotExist:
            return Response({"success": False, "message": "Usuário chefe inválido"})

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )
    user.criado_por = criado_por
    user.save()

    return Response({"success": True, "message": "Usuário criado com sucesso"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def uso_plano(request):
    try:
        if request.user.criado_por is None:
            plano_user = PlanoUsuario.objects.get(usuario=request.user)
        else:
            plano_user = PlanoUsuario.objects.get(usuario=request.user.criado_por)

        plano = plano_user.plano

        usuarios_inclusos = User.objects.filter(criado_por__id__in=get_ids_visiveis(request.user)).count()
        limite_usuarios = plano.usuarios_inclusos

        pipelines_inclusos = Kanban.objects.filter(criado_por__id__in=get_ids_visiveis(request.user)).count()
        limite_pipelines = plano.pipelines_inclusos

        contatos_inclusos = Contato.objects.filter(criado_por__id__in=get_ids_visiveis(request.user)).count()
        limite_contatos = plano.contatos_inclusos

        return Response({
            "plano": plano.nome,
            "preco": plano.preco,
            "limite_usuarios": limite_usuarios,
            "usuarios_utilizados": usuarios_inclusos,
            "limite_pipelines": limite_pipelines,
            "limite_contatos": limite_contatos,
            "contatos_utilizados": contatos_inclusos,
            "pipelines_inclusos": pipelines_inclusos,
        })
    except Exception as e:
        return Response({"error": f"Erro ao consultar uso do plano: {str(e)}"}, status=500)
