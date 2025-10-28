from django.db import models
from django.contrib.auth.models import User

class Plano(models.Model):
    nome = models.CharField(max_length=100)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    usuarios_inclusos = models.PositiveSmallIntegerField()
    contatos_inclusos = models.IntegerField()
    pipelines_inclusos = models.PositiveSmallIntegerField()

    id_plano_abacate = models.IntegerField(unique=True, blank=True, null=True)

    def __str__(self):
        return f"{self.nome} - R${self.preco}"

class Pagamento(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pendente"),
        ("PAID", "Pago"),
        ("CANCELLED", "Cancelado"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plano = models.ForeignKey(Plano, on_delete=models.CASCADE)
    external_id = models.CharField(max_length=100, unique=True)  # o mesmo enviado à AbacatePay
    billing_id = models.CharField(max_length=100, unique=True, blank=True, null=True)  # id da AbacatePay
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    amount = models.PositiveIntegerField()
    paid_amount = models.PositiveIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.user} - {self.plano} - {self.status}"