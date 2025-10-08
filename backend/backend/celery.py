import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from django.conf import settings

app = Celery('backend',
             broker=settings.CELERY_BROKER_URL,
             backend=settings.CELERY_RESULT_BACKEND)

app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
