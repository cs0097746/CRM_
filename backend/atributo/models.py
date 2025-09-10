from django.db import models

class AtributoPersonalizavel(models.Model):
    label = models.CharField(max_length=100)
    valor = models.TextField()

    def __str__(self):
        return self.label
