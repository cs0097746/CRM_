from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Pagamento
from usuario.models import PlanoUsuario

@shared_task
def cancelar_planos_expirados():
    """
    Task diária que desativa planos vencidos e marca pagamentos como CANCELLED.
    """
    agora = timezone.now()

    # Busca pagamentos pagos que já passaram da data de expiração
    expirados = Pagamento.objects.filter(
        status="PAID",
        expires_at__isnull=False,
        expires_at__lte=agora
    )

    for pagamento in expirados:
        user = pagamento.user
        plano = pagamento.plano

        # Cancela o pagamento
        pagamento.status = "CANCELLED"
        pagamento.save(update_fields=["status"])

        # Desativa plano do usuário
        plano_usuario = PlanoUsuario.objects.filter(usuario=user).first()
        if plano_usuario:
            plano_usuario.delete()  # ou marque como inativo, se quiser histórico

        print(f"[Task] Plano expirado e cancelado: {user.username} - {plano.nome}")

    return f"{expirados.count()} planos cancelados"
