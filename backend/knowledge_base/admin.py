from django.contrib import admin
from .models import KnowledgeBaseSet, KnowledgeBaseEntry, KnowledgeBaseField, KnowledgeBaseValue

admin.site.register(KnowledgeBaseValue)
admin.site.register(KnowledgeBaseSet)
admin.site.register(KnowledgeBaseEntry)
admin.site.register(KnowledgeBaseField)