# contatos/admin.py

from django.contrib import admin
from .models import Contato, Interacao,  Estagio, Negocio, Conversa, Operador, RespostasRapidas
admin.site.register(Contato)
admin.site.register(Interacao)
admin.site.register(Estagio)
admin.site.register(Negocio)
admin.site.register(Conversa) 
admin.site.register(Operador)
admin.site.register(RespostasRapidas)