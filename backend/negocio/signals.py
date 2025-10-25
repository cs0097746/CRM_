from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from negocio.models import Negocio
from gatilho.models import Gatilho
from gatilho.utils import executar_acao_gatilho
from django.db.models.signals import pre_delete, m2m_changed
from atributo.models import PresetAtributos, AtributoPersonalizavel

@receiver(pre_save, sender=Negocio)
def detectar_troca_estagio(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        antigo = Negocio.objects.get(pk=instance.pk)
    except Negocio.DoesNotExist:
        return

    if antigo.estagio != instance.estagio:
        instance._estagio_trocado = (antigo.estagio, instance.estagio)

@receiver(post_save, sender=Negocio)
def acionar_gatilhos_negocio(sender, instance, created, **kwargs):
    gatilhos = Gatilho.objects.filter(ativo=True)

    for g in gatilhos:
        try:

            if g.evento == 'negocio_criado' and created:
                executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_criado_em_x_estagio' and created:
                if g.estagio_origem and instance.estagio == g.estagio_origem:
                    executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_estagio_trocado' and hasattr(instance, "_estagio_trocado"):
                origem, destino = instance._estagio_trocado
                executar_acao_gatilho(g, instance)

            elif g.evento == 'negocio_estagio_trocado_de_x_para_y' and hasattr(instance, "_estagio_trocado"):
                origem, destino = instance._estagio_trocado
                if (
                    g.estagio_origem and g.estagio_destino and
                    origem == g.estagio_origem and destino == g.estagio_destino
                ):
                    executar_acao_gatilho(g, instance)

        except Exception as e:
            print(f"❌ Erro ao executar gatilho '{g.nome}' para negócio {instance.pk}: {e}")

@receiver(pre_delete, sender=PresetAtributos)
def delete_atributos_on_preset_delete(sender, instance, **kwargs):
    atributos_ids = instance.atributos.values_list('id', flat=True)
    AtributoPersonalizavel.objects.filter(id__in=atributos_ids).delete()

@receiver(pre_delete, sender=Negocio)
def delete_atributos_on_negocio_delete(sender, instance, **kwargs):
    atributos_ids = instance.atributos_personalizados.values_list('id', flat=True)
    AtributoPersonalizavel.objects.filter(id__in=atributos_ids).delete()