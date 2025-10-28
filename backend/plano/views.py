from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Plano, Pagamento
from .serializers import PlanoSerializer
from decouple import config
import requests
import uuid
import json
from datetime import timedelta
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth.models import User
from usuario.models import PlanoUsuario

class PlanoListView(generics.ListAPIView):
    queryset = Plano.objects.all().order_by('-id')
    serializer_class = PlanoSerializer

class IniciarAssinaturaAbacatePayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, plano_id):
        try:

            plano = get_object_or_404(Plano, id=plano_id)
            external_id = str(uuid.uuid4())
            payload = {
                "frequency": "ONE_TIME",
                "methods": ["PIX"], # TODO: colocar card dps q configurar a conta completamente
                "products": [
                    {
                        "externalId": f"plano-{plano.nome}",
                        "name": plano.nome,
                        "description": plano.nome or "",
                        "quantity": 1,
                        "price": int(plano.preco * 100),
                    }
                ],
                "returnUrl": "https://crm.loomiecrm.com/planos",
                "completionUrl": "https://crm.loomiecrm.com/success",
                "allowCoupons": False,
                "coupons": [],
                "externalId": f"{external_id}"
            }

            headers = {
                "Authorization": f"Bearer {config("ABACATE_API_KEY")}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                "https://api.abacatepay.com/v1/billing/create",
                json=payload,
                headers=headers,
                timeout=15,
            )

            if response.status_code >= 400:
                return Response(
                    {"error": "Erro ao criar cobrança", "details": response.text},
                    status=response.status_code,
                )

            data = response.json().get("data", {})

            Pagamento.objects.create(
                user=request.user,
                plano=plano,
                external_id=external_id,
                billing_id=data.get("id"),
                status=data.get("status", "PENDING"),
                amount=data.get("amount", int(plano.preco * 100)),
                url=data.get("url")
            )
            return Response(response.json(), status=status.HTTP_201_CREATED)

        except Exception as e:
            print("Erro", e)
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@csrf_exempt
def webhook_pagamento(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método não permitido"}, status=405)

    try:
        payload = json.loads(request.body)
        event = payload.get("event")
        data = payload.get("data", {})
        billing = data.get("billing", {})
        payment = data.get("payment", {})
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)

    if event != "billing.paid" or billing.get("status") != "PAID":
        return JsonResponse({"message": "Evento ignorado"}, status=200)

    try:
        billing_id = billing["id"]
        amount = billing["amount"]
        paid_amount = billing.get("paidAmount")
        external_id = billing["products"][0]["externalId"]
        customer_data = billing["customer"]["metadata"]
        email = customer_data.get("email")

        user = User.objects.filter(email=email).first()
        if not user:
            return JsonResponse({"error": "Usuário não encontrado"}, status=404)

        external_id = external_id.replace("plano-", "")

        plano = Plano.objects.filter(
            nome=external_id.strip()
        ).first()

        if not plano:
            return JsonResponse({"error": "Plano não encontrado"}, status=404)

        pagamento, created = Pagamento.objects.update_or_create(
            billing_id=billing_id,
            defaults={
                "user": user,
                "plano": plano,
                "status": "PAID",
                "amount": amount,
                "paid_amount": paid_amount,
                "activated_at": timezone.now(),
                "expires_at": timezone.now() + timedelta(days=30),
            },
        )

        plano_usuario, created = PlanoUsuario.objects.update_or_create(
            usuario=user,
            defaults={
                "plano": plano,
                "adquirido_em": timezone.now(),
                "vence_em": timezone.now() + timedelta(days=30),
            },
        )

        return JsonResponse({
            "message": "Pagamento confirmado e plano ativado com sucesso.",
            "user": user.username,
            "plano": plano.nome,
            "pagamento_id": pagamento.id,
        })

    except Exception as e:
        print("Erro", e)
        return JsonResponse({"error": str(e)}, status=500)