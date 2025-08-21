# contatos/admin.py

from django.contrib import admin
from .models import Contato, Interacao,  Estagio, Negocio
admin.site.register(Contato)
admin.site.register(Interacao)
admin.site.register(Estagio)
admin.site.register(Negocio)