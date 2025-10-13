import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from negocio.models import Negocio
from gatilho.models import Gatilho
from gatilho.utils import executar_acao_gatilho

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Negocio)
def detectar_troca_estagio(sender, instance, **kwargs):
    if not instance.pk:
        logger.debug(f"[pre_save] Novo negócio (sem PK): {instance}")
        return

    try:
        antigo = Negocio.objects.get(pk=instance.pk)
    except Negocio.DoesNotExist:
        logger.warning(f"[pre_save] Negócio {instance.pk} não encontrado no banco (pode ter sido removido).")
        return

    if antigo.estagio != instance.estagio:
        instance._estagio_trocado = (antigo.estagio, instance.estagio)
        logger.info(
            f"[pre_save] Negócio {instance.pk}: estágio alterado de '{antigo.estagio}' para '{instance.estagio}'."
        )
    else:
        logger.debug(f"[pre_save] Negócio {instance.pk}: estágio não alterado.")


@receiver(post_save, sender=Negocio)
def acionar_gatilhos_negocio(sender, instance, created, **kwargs):
    gatilhos = Gatilho.objects.filter(ativo=True)
    logger.info(
        f"[post_save] Ação em negócio {instance.pk} (criado={created}). "
        f"{gatilhos.count()} gatilhos ativos encontrados."
    )

    for g in gatilhos:
        try:
            logger.debug(f"[post_save] Avaliando gatilho '{g.nome}' (evento={g.evento}).")

            if g.evento == 'negocio_criado' and created:
                logger.info(f"➡️ Executando gatilho '{g.nome}' (negócio criado).")
                executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_criado_em_x_estagio' and created:
                if g.estagio_destino and instance.estagio == g.estagio_destino:
                    logger.info(f"➡️ Executando gatilho '{g.nome}' (criado no estágio {g.estagio_destino}).")
                    executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_estagio_trocado' and hasattr(instance, "_estagio_trocado"):
                origem, destino = instance._estagio_trocado
                logger.info(f"➡️ Executando gatilho '{g.nome}' (estágio trocado de {origem} para {destino}).")
                executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_estagio_trocado_de_x_para_y' and hasattr(instance, "_estagio_trocado"):
                origem, destino = instance._estagio_trocado
                if (
                    g.estagio_origem and g.estagio_destino and
                    origem == g.estagio_origem and destino == g.estagio_destino
                ):
                    logger.info(
                        f"➡️ Executando gatilho '{g.nome}' (de {origem} para {destino})."
                    )
                    executar_acao_gatilho(g, instance)

        except Exception as e:
            logger.exception(f"❌ Erro ao executar gatilho '{g.nome}' para negócio {instance.pk}: {e}")
