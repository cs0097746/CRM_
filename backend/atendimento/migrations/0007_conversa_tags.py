# Generated migration for adding tags field to Conversa model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('atendimento', '0006_alter_interacao_media_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversa',
            name='tags',
            field=models.CharField(blank=True, help_text='Tags separadas por vírgula', max_length=200, null=True),
        ),
    ]
