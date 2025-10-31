from django.contrib import admin
from .models import PlanoUsuario, PerfilUsuario
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

admin.site.unregister(User)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "is_staff", "is_superuser")
    list_filter = ("is_staff", "is_superuser")
    search_fields = ("username", "email")
    ordering = ("username",)

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Informações pessoais", {"fields": ("first_name", "last_name", "email")}),
        ("Permissões", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Datas importantes", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2"),
        }),
    )

admin.site.register(PlanoUsuario)

@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = (
        "usuario",
        "chefe",
        "is_chefe",
        "subordinados_list",
        "colegas_list",
        "aceitou_termos",
    )
    search_fields = ("usuario__username", "usuario__email")
    list_filter = ("aceitou_termos",)

    def chefe(self, obj):
        return obj.criado_por.username if obj.criado_por else "-"
    chefe.short_description = "Chefe"

    def is_chefe(self, obj):
        return PerfilUsuario.objects.filter(criado_por=obj.usuario).exists()
    is_chefe.boolean = True
    is_chefe.short_description = "É chefe?"

    def subordinados_list(self, obj):
        return ", ".join([p.usuario.username for p in PerfilUsuario.objects.filter(criado_por=obj.usuario)])
    subordinados_list.short_description = "Subordinados"

    def colegas_list(self, obj):
        if not obj.criado_por:
            return "-"
        return ", ".join([
            p.usuario.username
            for p in PerfilUsuario.objects.filter(criado_por=obj.criado_por).exclude(usuario=obj.usuario)
        ])
    colegas_list.short_description = "Colegas"