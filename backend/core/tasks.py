from celery import shared_task

@shared_task
def teste_celery():
    print("Celery está funcionando!")
