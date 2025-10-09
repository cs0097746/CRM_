#!/bin/sh
# Este script garante que o Postgres e o Redis estejam prontos antes de iniciar o Django/Gunicorn.

# --- 1. Aguarda o PostgreSQL ---
echo "⏳ Aguardando a inicialização do banco de dados (db:5432)..."
while ! nc -z db 5432; do
  sleep 0.5
done
echo "✅ PostgreSQL está pronto!"


# --- 2. Aguarda o Redis ---
# Usamos a porta 6380 conforme definido no seu docker-compose.yml
echo "⏳ Aguardando a inicialização do Redis (redis:6380)..."
while ! nc -z redis 6380; do
  sleep 0.5
done
echo "✅ Redis está pronto!"


# --- 3. Executa as Migrações e Cria Superusuário ---
echo "🛠️ Executando migrações do Django..."
python manage.py migrate --noinput

echo "🛠️ Criando superusuário (se não existir)..."
python manage.py createsuperuser --noinput 2>/dev/null || true

# --- 4. Executa o comando principal (Gunicorn) ---
# O comando de Gunicorn será passado via CMD no Dockerfile
echo "🚀 Iniciando Gunicorn..."
exec "$@"
