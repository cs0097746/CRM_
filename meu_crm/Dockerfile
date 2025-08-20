# Usamos uma imagem oficial do Python como base
FROM python:3.11-slim

# Definimos variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Criamos um diretório de trabalho dentro do contêiner
WORKDIR /app

# Copiamos o arquivo de dependências primeiro
# (isso aproveita o cache do Docker)
COPY requirements.txt /app/

# Instalamos as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos todo o resto do nosso projeto para dentro do contêiner
COPY . /app/

# Expomos a porta 8000 (a mesma que o Gunicorn vai usar)
EXPOSE 8000

# Comando para iniciar a aplicação (será sobrescrito pelo docker-compose, mas é uma boa prática)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "crm_project.wsgi:application"]