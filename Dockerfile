# python:3.11-slim é uma boa escolha por ser mais leve.gcloud auth application-default set-quota-project airy-bit-460116-k8
FROM python:3.11-slim

# 2. Definir algumas variáveis de ambiente úteis
ENV PYTHONUNBUFFERED TRUE  # Garante que os outputs do Python (print) vão direto para o terminal/logs
ENV APP_HOME /app          # Define o diretório home da aplicação dentro do container
WORKDIR $APP_HOME          # Define o diretório de trabalho atual para $APP_HOME
ENV PORT 8080              # Porta que o Gunicorn vai usar dentro do container (Cloud Run espera 8080 por defeito)

# 3. Copiar o ficheiro de requisitos e instalar as dependências
# Isto é feito antes de copiar o resto do código para aproveitar o cache do Docker
# se o requirements.txt não mudar.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copiar todo o código da aplicação para o diretório de trabalho no container
COPY . .

# 5. Comando para executar a aplicação quando o container iniciar
# Usamos Gunicorn como servidor WSGI de produção.
# 'app:app' refere-se ao ficheiro app.py e à variável 'app = Flask(__name__)' dentro dele.
# Ajuste o número de workers e threads conforme necessário para a sua aplicação,
# mas para começar, 1 worker e alguns threads são suficientes para o Cloud Run.
# O timeout 0 significa que não há timeout para os workers (útil para Cloud Run que gere timeouts a outro nível).
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 app:app