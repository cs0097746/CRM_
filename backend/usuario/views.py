from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from contato.models import Contato
from core.utils import get_ids_visiveis
from kanban.models import Kanban
from usuario.models import PlanoUsuario, PerfilUsuario

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
    user.save()

    PerfilUsuario.objects.create(
        usuario=user,
        criado_por=criado_por,
    )

    return Response({"success": True, "message": "Usuário criado com sucesso"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usuario_info(request):
    """
    Retorna informações do usuário logado
    
    GET /api/usuario/me/
    
    Returns:
    {
        "id": 1,
        "username": "christian",
        "email": "christian@email.com",
        "first_name": "Christian",
        "last_name": "Schneider",
        "is_chefe": true,
        "criado_por": null,
        "criado_em": "2025-10-01T10:00:00Z"
    }
    """
    try:
        user = request.user
        
        return Response({
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "is_chefe": user.criado_por is None,  # Se não tem criado_por, é chefe
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "criado_por_id": user.criado_por.id if user.criado_por else None,
                "criado_por_username": user.criado_por.username if user.criado_por else None,
                "date_joined": user.date_joined.isoformat() if hasattr(user, 'date_joined') else None
            }
        })
    except Exception as e:
        return Response({
            "success": False,
            "error": f"Erro ao buscar informações do usuário: {str(e)}"
        }, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def uso_plano(request):
    try:
        perfil_usuario = PerfilUsuario.objects.get(
            usuario=request.user,
        )
        if perfil_usuario.criado_por is None:
            plano_user = PlanoUsuario.objects.get(usuario=request.user)
        else:
            plano_user = PlanoUsuario.objects.get(usuario=perfil_usuario.criado_por)

        plano = plano_user.plano

        usuarios_inclusos = User.objects.filter(perfil_usuario__criado_por__id__in=get_ids_visiveis(request.user)).count()
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
        print(e)
        return Response({"error": f"Erro ao consultar uso do plano: {str(e)}"}, status=500)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def usuario_aceitou_termos(request):
    try:
        perfil = PerfilUsuario.objects.get(usuario=request.user)

        if request.method == "GET":
            return Response({"aceitou_termos": perfil.aceitou_termos})

        elif request.method == "POST":
            perfil.aceitou_termos = True
            perfil.aceitou_quando = timezone.now()
            perfil.save(update_fields=["aceitou_termos", "aceitou_quando"])
            return Response({"message": "Termos aceitos com sucesso.", "aceitou_termos": True})

    except PerfilUsuario.DoesNotExist:
        return Response({"error": "Perfil do usuário não encontrado."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
