from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response

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
