# My Cloud

Bem-vindo ao My Cloud! Esta é uma aplicação web desenvolvida em Python com Flask que permite aos utilizadores registarem-se, fazerem login e armazenarem ficheiros leves na Google Cloud Platform (GCP). Cada utilizador tem o seu próprio bucket dedicado no Google Cloud Storage (GCS).

## Funcionalidades Implementadas

* Registo de novos utilizadores.
* Autenticação de utilizadores (Login/Logout).
* Criação automática de um bucket GCS dedicado para cada novo utilizador.
* Upload de ficheiros para o bucket do utilizador.
* Listagem dos ficheiros do utilizador a partir do seu bucket.
* Download de ficheiros.

## Pré-requisitos (para Desenvolvimento Local)

Antes de executar a aplicação localmente, certifique-se de que tem o seguinte instalado e configurado:

1.  **Python 3.9+**
2.  **pip** (gestor de pacotes Python)
3.  **venv** (para criar ambientes virtuais)
4.  **Google Cloud SDK (gcloud CLI):** Instalado e configurado.
    * Autentique-se com as Application Default Credentials:
        ```bash
        gcloud auth application-default login
        ```
    * Configure o seu projeto ativo no gcloud:
        ```bash
        gcloud config set project SEU_PROJECT_ID
        ```
    * Configure o projeto de quota para as ADC (para evitar avisos):
        ```bash
        gcloud auth application-default set-quota-project SEU_PROJECT_ID
        ```
5.  **Cloud SQL Auth Proxy:** Descarregue-o a partir da documentação do Google Cloud.
6.  **Instância Cloud SQL (PostgreSQL):** Uma instância PostgreSQL ativa no GCP.
    * Base de dados criada dentro da instância (ex: `myclouddb`).
    * Utilizador da base de dados criado (ex: `postgres`) com uma senha definida.
7.  **Projeto GCP com APIs Habilitadas:**
    * Cloud SQL Admin API
    * Cloud Storage API
    * IAM Service Account Credentials API
    * Artifact Registry API (para deploy)
    * Cloud Build API (para deploy)
8.  **Ficheiro de Chave da Conta de Serviço (JSON):**
    * Crie uma conta de serviço no GCP com os seguintes papéis a nível de projeto (ou mais granulares, se preferir):
        * `Storage Admin` (para criar buckets e gerir objetos)
        * `Service Account Token Creator` (para assinar URLs de download)
        * (O `Cloud SQL Client` será necessário para a conta de serviço do Cloud Run em produção, mas localmente o proxy usa as suas ADC ou esta chave JSON se configurada para acesso direto ao GCS).
    * Descarregue a chave JSON desta conta de serviço.

## Configuração e Execução Local

1.  **Clone o Repositório (se estiver no Git):**
    ```bash
    # git clone [URL_DO_SEU_REPOSITORIO]
    # cd nome-da-pasta-do-projeto
    ```

2.  **Crie e Ative um Ambiente Virtual:**
    ```bash
    python -m venv venv
    # No Windows (PowerShell):
    .\venv\Scripts\Activate.ps1
    # No macOS/Linux:
    source venv/bin/activate
    ```

3.  **Instale as Dependências:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Crie e Configure o Ficheiro `.env`:**
    Na raiz do projeto, crie um ficheiro chamado `.env` com as seguintes variáveis (substitua pelos seus valores):
    ```dotenv
    FLASK_APP=app.py
    FLASK_DEBUG=1
    SECRET_KEY=SUA_CHAVE_SECRETA_FORTE_E_UNICA_AQUI

    DB_USER=postgres
    DB_PASSWORD=SUA_SENHA_DO_UTILIZADOR_POSTGRES_NO_CLOUD_SQL
    DB_NAME=myclouddb
    DB_HOST=127.0.0.1
    DB_PORT=5432

    GCP_PROJECT_ID=SEU_PROJECT_ID_AQUI 
    # Ex: airy-bit-460116-k8

    # Caminho para o ficheiro de chave da sua conta de serviço (usado localmente para GCS e assinar URLs)
    GOOGLE_APPLICATION_CREDENTIALS="caminho/para/o/seu/ficheiro-chave.json"
    # Ex: airy-bit-460116-k8-xxxxxxxxxxxx.json (se estiver na raiz do projeto)
    ```
    **NÃO adicione o ficheiro `.env` nem o ficheiro de chave JSON ao Git!** Certifique-se de que estão no seu `.gitignore`.

5.  **Inicie o Cloud SQL Auth Proxy:**
    Abra um novo terminal e execute (substitua pelo nome de conexão da sua instância e a porta, se diferente):
    ```bash
    # No Windows (PowerShell), se o proxy estiver na pasta atual:
    .\cloud_sql_proxy.exe SEU_PROJECT_ID:SUA_REGIAO:NOME_DA_SUA_INSTANCIA_SQL --port 5432
    # Ex: .\cloud_sql_proxy.exe airy-bit-460116-k8:europe-west1:my-cloud-instance-db --port 5432
    ```

6.  **Execute a Aplicação Flask:**
    No terminal onde o ambiente virtual está ativo e você está na raiz do projeto:
    ```bash
    python app.py
    ```
    A aplicação deverá iniciar e o `db.create_all()` criará as tabelas na base de dados na primeira execução.

7.  **Aceda à Aplicação:**
    Abra o seu navegador e vá para `http://127.0.0.1:5000`.

## Variáveis de Ambiente Necessárias

As seguintes variáveis de ambiente são usadas pela aplicação (configure no `.env` para local, ou no serviço Cloud Run para deploy):

* `SECRET_KEY`: Chave secreta para o Flask (sessões, etc.).
* `DB_USER`: Utilizador da base de dados PostgreSQL.
* `DB_PASSWORD`: Senha do utilizador da base de dados.
* `DB_NAME`: Nome da base de dados.
* `GCP_PROJECT_ID`: ID do seu projeto Google Cloud.
* **Para Desenvolvimento Local (via Cloud SQL Proxy TCP):**
    * `DB_HOST`: Geralmente `127.0.0.1`.
    * `DB_PORT`: Geralmente `5432`.
    * `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para o ficheiro JSON da chave da conta de serviço (usado pelo `google-cloud-storage` e para assinar URLs se as ADC não forem suficientes para a assinatura).
* **Para Deploy no Cloud Run:**
    * `INSTANCE_CONNECTION_NAME`: Nome de conexão da instância Cloud SQL (ex: `projeto:regiao:instancia`).
    * `FLASK_DEBUG=0` (para desativar o modo debug em produção).

## Deploy (Cloud Run)

Esta aplicação está configurada para ser "deployada" no Google Cloud Run usando Docker. Os passos principais são:

1.  **Construir a Imagem Docker:**
    Use o `Dockerfile` fornecido e o Google Cloud Build para construir a imagem e enviá-la para o Google Artifact Registry.
    ```bash
    # (Defina as variáveis de ambiente PROJECT_ID, REGION, REPO_NAME, IMAGE_NAME, IMAGE_TAG antes)
    gcloud builds submit . --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"
    ```
2.  **Fazer Deploy no Cloud Run:**
    Use o comando `gcloud run deploy` especificando a imagem, a conexão Cloud SQL (`--add-cloudsql-instances`) e todas as variáveis de ambiente necessárias (`--set-env-vars`).
    ```bash
    # Exemplo (substitua os placeholders)
    gcloud run deploy [NOME_DO_SERVICO] \
        --image [URL_DA_IMAGEM] \
        --platform managed \
        --region [SUA_REGIAO] \
        --allow-unauthenticated \
        --add-cloudsql-instances "[SEU_INSTANCE_CONNECTION_NAME]" \
        --set-env-vars "DB_USER=...,DB_PASSWORD=...,DB_NAME=...,INSTANCE_CONNECTION_NAME=...,SECRET_KEY=...,GCP_PROJECT_ID=...,FLASK_DEBUG=0"
    ```