#!/bin/sh

# Espera o DB ficar pronto
echo "Esperando Postgres..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "Postgres não disponível ainda, aguardando..."
  sleep 2
done

# Rodar migrate
echo "Rodando migrate..."
python manage.py migrate

# Criar superuser se não existir
echo "Criando superuser..."
python manage.py createsuperuser --noinput 2>/dev/null || true

# Iniciar gunicorn
echo "Iniciando Gunicorn..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
