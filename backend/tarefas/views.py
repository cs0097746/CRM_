from django_celery_beat.models import PeriodicTask, CrontabSchedule, IntervalSchedule, ClockedSchedule
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status, permissions
import json
from .models import Tarefa
from .serializers import TarefaSerializer
import datetime

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def criar_tarefa(request):
    data = request.data

    serializer = TarefaSerializer(data={
        "tipo": data.get("tipo_tarefa"),
        "destinatario": data.get("destinatario"),
        "assunto": data.get("assunto"),
        "mensagem": data.get("mensagem"),
        "link_webhook_n8n": data.get("link_webhook_n8n"),
        "recorrencia_tipo": data["config_recorrencia"]["tipo"],
        "valor1": data["config_recorrencia"]["valor1"],
        "valor2": data["config_recorrencia"].get("valor2"),
        "precisar_enviar": data.get("precisar_enviar"),
        "codigo": data.get("codigo") or None,
        "criado_por": request.user.id,
    })
    serializer.is_valid(raise_exception=True)
    tarefa = serializer.save()

    tipo = data["tipo_tarefa"]
    recorrencia = data["config_recorrencia"]
    task_name = f"{tipo}_{tarefa.id}_{timezone.now().timestamp()}"

    webhook_arg = tarefa.link_webhook_n8n if tarefa.link_webhook_n8n else ""

    if tipo == "email":
        task_args = [
            tarefa.destinatario,
            tarefa.assunto,
            tarefa.mensagem,
            tarefa.link_webhook_n8n or "",
            tarefa.precisar_enviar,
            tarefa.codigo
        ]
    elif tipo =="webhook":
        task_args = [
            tarefa.destinatario,
            tarefa.assunto or tarefa.mensagem,
            tarefa.link_webhook_n8n,
            tarefa.codigo
        ]
    else:
        task_args = [
            tarefa.destinatario,
            tarefa.mensagem,
            tarefa.link_webhook_n8n or "",
            tarefa.precisar_enviar,
            tarefa.codigo
        ]

    task_args_json = json.dumps(task_args)

    if recorrencia["tipo"] == "unica":
        dt = datetime.datetime.fromisoformat(recorrencia["valor1"])
        clocked, _ = ClockedSchedule.objects.get_or_create(clocked_time=dt)
        PeriodicTask.objects.create(
            clocked=clocked,
            one_off=True,
            name=task_name,
            task=f"tarefas.tasks.enviar_{tipo}_task",
            args=task_args_json
        )

    elif recorrencia["tipo"] == "horas":
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=int(recorrencia["valor1"]),
            period=IntervalSchedule.HOURS,
        )
        PeriodicTask.objects.create(
            interval=schedule,
            name=task_name,
            task=f"tarefas.tasks.enviar_{tipo}_task",
            args=task_args_json,
        )

    elif recorrencia["tipo"] == "diaria":
        hora, minuto = map(int, recorrencia["valor1"].split(":"))
        cron, _ = CrontabSchedule.objects.get_or_create(hour=hora, minute=minuto)
        PeriodicTask.objects.create(
            crontab=cron,
            name=task_name,
            task=f"tarefas.tasks.enviar_{tipo}_task",
            args=task_args_json,
        )

    elif recorrencia["tipo"] == "dias":
        dias = int(recorrencia["valor1"])
        hora, minuto = map(int, recorrencia["valor2"].split(":"))
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=dias * 24,  # horas
            period=IntervalSchedule.HOURS,
        )
        PeriodicTask.objects.create(
            interval=schedule,
            name=task_name,
            task=f"tarefas.tasks.enviar_{tipo}_task",
            args=task_args_json,
            start_time=timezone.now().replace(hour=hora, minute=minuto, second=0),
        )

    return Response({"message": "Tarefa criada e agendada com sucesso!"}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def listar_tarefas(request):
    tarefas = Tarefa.objects.filter(criado_por=request.user)
    resultado = []

    for tarefa in tarefas:
        periodic_tasks = PeriodicTask.objects.filter(name__icontains=f"_{tarefa.id}_")
        tasks_info = []
        for pt in periodic_tasks:
            info = {
                "nome_task": pt.name,
                "ativo": pt.enabled,
                "tipo": pt.task,
                "start_time": pt.start_time,
                "args": pt.args,
            }
            # Adicionar info de schedule
            if pt.interval:
                info["recorrencia"] = f"Intervalo: {pt.interval.every} {pt.interval.period}"
            elif pt.crontab:
                info["recorrencia"] = f"Crontab: {pt.crontab}"
            elif pt.clocked:
                info["recorrencia"] = f"Clocked: {pt.clocked.clocked_time}"
            tasks_info.append(info)

        resultado.append({
            "tarefa": TarefaSerializer(tarefa).data,
            "agendamentos": tasks_info
        })

    return Response(resultado, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def excluir_tarefa(request, tarefa_id):
    try:
        tarefa = Tarefa.objects.get(pk=tarefa_id, criado_por=request.user)
    except Tarefa.DoesNotExist:
        return Response({"detail": "Tarefa não encontrada."}, status=status.HTTP_404_NOT_FOUND)

    PeriodicTask.objects.filter(name__icontains=f"_{tarefa.id}_").delete()

    tarefa.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)