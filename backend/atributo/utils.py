from .models import AtributoPersonalizavel

def aplicar_preset_no_negocio(preset, negocio):
    for atributo in preset.atributos.all():
        clone = AtributoPersonalizavel.objects.create(
            label=atributo.label,
            type=atributo.type,
            valor=atributo.valor,
            arquivo=atributo.arquivo
        )
        negocio.atributos_personalizados.add(clone)
