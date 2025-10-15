from django.db import models
from django.db.models import TextChoices
from datetime import datetime

class TypeChoices(TextChoices):
    BOOLEAN = ('boolean', 'Boolean')
    INTEGER = ('integer', 'Integer')
    FLOAT = ('float', 'Float')
    STRING = ('string', 'String')
    DATE = ('date', 'Date')
    DATETIME = ('datetime', 'DateTime')
    TIME = ('time', 'Time')
    TEXT = ('text', 'Text')
    FILE = ('file', 'File')


class AtributoPersonalizavel(models.Model):
    label = models.CharField(max_length=100)
    valor = models.TextField(blank=True, null=True)
    arquivo = models.FileField(
        upload_to='atributos/',
        blank=True,
        null=True
    )
    type = models.CharField(
        max_length=20,
        choices=TypeChoices.choices,
        default=TypeChoices.STRING
    )

    def __str__(self):
        return f"{self.label}: {self.valor or self.arquivo or ''} ({self.type})"

    def get_valor_formatado(self):
        try:
            if self.type == TypeChoices.FILE:
                return self.arquivo.url if self.arquivo else None
            elif self.type == TypeChoices.BOOLEAN:
                return self.valor.lower() in ('true', '1', 'yes', 'sim', 'verdadeiro')
            elif self.type == TypeChoices.INTEGER:
                return int(self.valor)
            elif self.type == TypeChoices.FLOAT:
                return float(self.valor)
            elif self.type in (TypeChoices.STRING, TypeChoices.TEXT):
                return str(self.valor)
            elif self.type == TypeChoices.DATE:
                return datetime.strptime(self.valor, "%Y-%m-%d").date()
            elif self.type == TypeChoices.DATETIME:
                return datetime.strptime(self.valor, "%Y-%m-%d %H:%M:%S")
            elif self.type == TypeChoices.TIME:
                return datetime.strptime(self.valor, "%H:%M:%S").time()
            return None
        except Exception:
            return self.valor

class PresetAtributos(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True, null=True)
    atributos = models.ManyToManyField(AtributoPersonalizavel, related_name='presets', blank=True)

    def __str__(self):
        return self.nome