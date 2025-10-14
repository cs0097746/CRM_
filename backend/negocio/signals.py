from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from negocio.models import Negocio
from gatilho.models import Gatilho
from gatilho.utils import executar_acao_gatilho


@receiver(pre_save, sender=Negocio)
def detectar_troca_estagio(sender, instance, **kwargs):
    if not instance.pk:
        print(f"[pre_save] Novo negócio (sem PK): {instance}")
        return

    try:
        antigo = Negocio.objects.get(pk=instance.pk)
    except Negocio.DoesNotExist:
        print(f"[pre_save] Negócio {instance.pk} não encontrado no banco (pode ter sido removido).")
        return

    if antigo.estagio != instance.estagio:
        instance._estagio_trocado = (antigo.estagio, instance.estagio)
        print(
            f"[pre_save] Negócio {instance.pk}: estágio alterado de '{antigo.estagio}' para '{instance.estagio}'."
        )
    else:
        print(f"[pre_save] Negócio {instance.pk}: estágio não alterado.")


@receiver(post_save, sender=Negocio)
def acionar_gatilhos_negocio(sender, instance, created, **kwargs):
    gatilhos = Gatilho.objects.filter(ativo=True)
    print(
        f"[post_save] Ação em negócio {instance.pk} (criado={created}). "
        f"{gatilhos.count()} gatilhos ativos encontrados."
    )

    for g in gatilhos:
        try:
            print(f"[post_save] Avaliando gatilho '{g.nome}' (evento={g.evento}).")

            if g.evento == 'negocio_criado' and created:
                print(f"➡️ Executando gatilho '{g.nome}' (negócio criado).")
                executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_criado_em_x_estagio' and created:
                print("Estagio destino: ", g.estagio_origem," Estagio do negócio", instance.estagio)
                if g.estagio_origem and instance.estagio == g.estagio_origem:
                    print(f"➡️ Executando gatilho '{g.nome}' (criado no estágio {g.estagio_origem}).")
                    executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_estagio_trocado' and hasattr(instance, "_estagio_trocado"):
                origem, destino = instance._estagio_trocado
                print(f"➡️ Executando gatilho '{g.nome}' (estágio trocado de {origem} para {destino}).")
                executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_estagio_trocado_de_x_para_y' and hasattr(instance, "_estagio_trocado"):
                origem, destino = instance._estagio_trocado
                if (
                    g.estagio_origem and g.estagio_destino and
                    origem == g.estagio_origem and destino == g.estagio_destino
                ):
                    print(
                        f"➡️ Executando gatilho '{g.nome}' (de {origem} para {destino})."
                    )
                    executar_acao_gatilho(g, instance)

        except Exception as e:
            print(f"❌ Erro ao executar gatilho '{g.nome}' para negócio {instance.pk}: {e}")
