from django.db import models
from django.db.models import TextChoices
from datetime import datetime, date, time

class TypeChoices(TextChoices):
    BOOLEAN = ('boolean', 'Boolean')
    INTEGER = ('integer', 'Integer')
    FLOAT = ('float', 'Float')
    STRING = ('string', 'String')
    DATE = ('date', 'Date')
    DATETIME = ('datetime', 'DateTime')
    TIME = ('time', 'Time')
    TEXT = ('text', 'Text')


class AtributoPersonalizavel(models.Model):
    label = models.CharField(max_length=100)
    valor = models.TextField()
    type = models.CharField(
        max_length=20,
        choices=TypeChoices.choices,
        default=TypeChoices.STRING
    )

    def __str__(self):
        return f"{self.label}: {self.valor} ({self.type})"

    def get_valor_formatado(self):
        try:
            if self.type == TypeChoices.BOOLEAN:
                return self.valor.lower() in ('true', '1', 'yes', 'sim', 'verdadeiro')
            elif self.type == TypeChoices.INTEGER:
                return int(self.valor)
            elif self.type == TypeChoices.FLOAT:
                return float(self.valor)
            elif self.type == TypeChoices.STRING or self.type == TypeChoices.TEXT:
                return str(self.valor)
            elif self.type == TypeChoices.DATE:
                return datetime.strptime(self.valor, "%Y-%m-%d").date()
            elif self.type == TypeChoices.DATETIME:
                return datetime.strptime(self.valor, "%Y-%m-%d %H:%M:%S")
            elif self.type == TypeChoices.TIME:
                return datetime.strptime(self.valor, "%H:%M:%S").time()
            return None
        except Exception as e:
            return self.valor
