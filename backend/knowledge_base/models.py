from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User

class KnowledgeBaseSet(models.Model):
    """
    Representa uma 'tabela' criada pelo cliente.
    """
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="kb_sets")
    name = models.CharField(max_length=255)  # nome da base (imovel ex)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Conjunto de Conhecimento"
        verbose_name_plural = "Conjuntos de Conhecimento"

    def __str__(self):
        return f"{self.client.username} - {self.name}"


class KnowledgeBaseField(models.Model):
    """
    Representa uma 'coluna' dentro de um KnowledgeBaseSet.
    """
    FIELD_TYPES = (
        ("TEXT", "Texto"),
        ("NUMBER", "Número"),
        ("BOOLEAN", "Sim/Não"),
        ("DATE", "Data"),
        ("URL", "URL"),
        ("JSON", "JSON"),
    )

    kb_set = models.ForeignKey(KnowledgeBaseSet, on_delete=models.CASCADE, related_name="fields")
    name = models.CharField(max_length=255)  # Nome da coluna, ex: "Endereço"
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)  # Se o campo é obrigatório
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Campo"
        verbose_name_plural = "Campos"

    def __str__(self):
        return f"{self.kb_set.name} - {self.name}"

class KnowledgeBaseEntry(models.Model):
    """
    Representa uma 'linha' de dados dentro de um KnowledgeBaseSet.
    """
    kb_set = models.ForeignKey(KnowledgeBaseSet, on_delete=models.CASCADE, related_name="entries")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Entrada"
        verbose_name_plural = "Entradas"

    def __str__(self):
        return f"Entrada {self.id} - {self.kb_set.name}"

class KnowledgeBaseValue(models.Model):
    """
    Representa o valor de um campo específico em uma entrada.
    """
    entry = models.ForeignKey(KnowledgeBaseEntry, on_delete=models.CASCADE, related_name="values")
    field = models.ForeignKey(KnowledgeBaseField, on_delete=models.CASCADE)
    value_text = models.TextField(blank=True, null=True)
    value_number = models.FloatField(blank=True, null=True)
    value_boolean = models.BooleanField(blank=True, null=True)
    value_date = models.DateField(blank=True, null=True)
    value_url = models.URLField(blank=True, null=True)
    value_json = models.JSONField(blank=True, null=True)

    class Meta:
        verbose_name = "Valor"
        verbose_name_plural = "Valores"
        unique_together = ("entry", "field")  # Evita duplicidade de valores para o mesmo campo

    def __str__(self):
        return f"{self.field.name} -> {self.get_value_display()}"

    def get_value_display(self):
        """
        Retorna o valor correto baseado no tipo de campo.
        """
        field_type = self.field.field_type
        if field_type == "TEXT":
            return self.value_text
        elif field_type == "NUMBER":
            return self.value_number
        elif field_type == "BOOLEAN":
            return self.value_boolean
        elif field_type == "DATE":
            return self.value_date
        elif field_type == "URL":
            return self.value_url
        elif field_type == "JSON":
            return self.value_json
        return None
