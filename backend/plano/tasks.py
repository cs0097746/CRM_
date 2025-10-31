from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Pagamento
from usuario.models import PlanoUsuario
from notificacao.models import Notificacao

@shared_task
def cancelar_planos_expirados():
    agora = timezone.now()

    expirados = Pagamento.objects.filter(
        status="PAID",
        expires_at__isnull=False,
        expires_at__lte=agora
    )

    for pagamento in expirados:
        user = pagamento.user
        plano = pagamento.plano

        pagamento.status = "CANCELLED"
        pagamento.save(update_fields=["status"])

        plano_usuario = PlanoUsuario.objects.filter(usuario=user).first()
        if plano_usuario:
            plano_usuario.plano = Plano.objects.get(nome='Free')
            plano_usuario.save()
            Notificacao.objects.create(
                usuario=user,
                texto='Temos uma má notícia.... seu pagamento não foi realizado com sucesso. Com isso, você está sem plano ativo no momento',
                tipo='erro'
            )

        print(f"[Task] Plano expirado e cancelado: {user.username} - {plano.nome}")

    return f"{expirados.count()} planos cancelados"

@shared_task
def verificar_planos_expirados():
    agora = timezone.now()
    hoje = agora.date()

    planos_expirados = PlanoUsuario.objects.filter(vence_em__date__lte=hoje)

    for plano_usuario in planos_expirados:
        user = plano_usuario.usuario
        plano_atual = plano_usuario.plano

        plano_free = Plano.objects.filter(nome__iexact="Free").first()
        if not plano_free:
            plano_free = Plano.objects.create(
                nome="Free",
                preco=0,
                usuarios_inclusos=1,
                contatos_inclusos=10,
                pipelines_inclusos=1,
            )

        plano_usuario.plano = plano_free
        plano_usuario.adquirido_em = agora
        plano_usuario.vence_em = agora
        plano_usuario.save(update_fields=["plano", "adquirido_em", "vence_em"])

        if user.email:
            send_mail(
                subject="Seu plano expirou e foi alterado para o plano Free",
                message=(
                    f"Olá, {user.username}!\n\n"
                    f"Seu plano '{plano_atual.nome}' venceu hoje ({hoje.strftime('%d/%m/%Y')}) "
                    f"e foi automaticamente alterado para o plano gratuito.\n"
                    f"Você pode renovar ou escolher outro plano a qualquer momento."
                ),
                from_email="contatoloomie@gmail.com",
                recipient_list=[user.email],
                fail_silently=True,
            )

        print(f"[Task] Plano expirado e alterado para Free: {user.username}")
        Notificacao.objects.create(
            usuario=user,
            texto='Temos uma má notícia.... seu plano venceu hoje! Reative-o para voltar a usar seu fluxo completamente.',
            tipo='alerta'
        )
    return f"{planos_expirados.count()} planos alterados para Free"