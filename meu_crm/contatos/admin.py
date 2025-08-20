# contatos/admin.py

from django.contrib import admin
from .models import Contato, Interacao # Adicione Interacao

admin.site.register(Contato)
admin.site.register(Interacao) # Adicione esta linha