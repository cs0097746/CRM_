from .models import AtributoPersonalizavel

def aplicar_preset_no_negocio(preset, negocio):
    for atributo in preset.atributos.all():
        clone = AtributoPersonalizavel.objects.create(
            label=atributo.label,
            type=atributo.type,
            valor=atributo.valor,
            arquivo=atributo.arquivo,
            criado_por=preset.criado_por
        )
        negocio.atributos_personalizados.add(clone)
