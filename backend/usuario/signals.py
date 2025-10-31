from django.db.models.signals import post_save
from django.dispatch import receiver
from usuario.models import User
from plano.models import Plano
from usuario.models import PlanoUsuario, PerfilUsuario
from django.utils import timezone
from datetime import timedelta

@receiver(post_save, sender=User)
def criar_perfil_usuario(sender, instance, created, **kwargs):
    if created:
        PerfilUsuario.objects.get_or_create(usuario=instance)

@receiver(post_save, sender=User)
def criar_plano_free_para_usuario(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.criado_por is None:
        plano_free = Plano.objects.filter(nome__iexact="Free").first()

        if not plano_free:
            plano_free = Plano.objects.create(
                nome="Free",
                preco=0,
                usuarios_inclusos=1,
                contatos_inclusos=10,
                pipelines_inclusos=1,
            )

        if not PlanoUsuario.objects.filter(usuario=instance, plano=plano_free).exists():
            PlanoUsuario.objects.create(
                usuario=instance,
                plano=plano_free,
                adquirido_em=timezone.now(),
                vence_em=timezone.now() + timedelta(days=7),
            )

