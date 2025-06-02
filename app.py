from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv
from google.cloud import storage
import uuid
from sqlalchemy.sql import text
from datetime import timedelta

load_dotenv()

app = Flask(__name__)

# --- Configurações da Aplicação ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
if not app.config['SECRET_KEY']:
    raise ValueError("Não foi encontrada SECRET_KEY nas variáveis de ambiente.")

DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

# Variáveis específicas para cada ambiente
INSTANCE_CONNECTION_NAME = os.environ.get('INSTANCE_CONNECTION_NAME') # Para Cloud Run (ex: 'seu-projeto:regiao:instancia')
DB_HOST = os.environ.get('DB_HOST') # Para desenvolvimento local via proxy TCP
DB_PORT = os.environ.get('DB_PORT') # Para desenvolvimento local via proxy TCP

# Determinar se estamos no Cloud Run (K_SERVICE é uma variável de ambiente definida pelo Cloud Run)
IS_RUNNING_ON_CLOUD_RUN = os.environ.get('K_SERVICE') is not None

if IS_RUNNING_ON_CLOUD_RUN:
    # Configuração para Cloud Run (usando Unix Socket)
    if not all([DB_USER, DB_PASSWORD, DB_NAME, INSTANCE_CONNECTION_NAME]):
        raise ValueError("Variáveis de ambiente do banco de dados incompletas para Cloud Run (DB_USER, DB_PASSWORD, DB_NAME, INSTANCE_CONNECTION_NAME).")
    
    unix_socket_path = f"/cloudsql/{INSTANCE_CONNECTION_NAME}"
    db_uri = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?host={unix_socket_path}"
    print(f"APP.PY: A usar conexão Cloud SQL via Unix socket: {unix_socket_path}")
else:
    # Configuração para Desenvolvimento Local (usando TCP Host/Port via Proxy)
    if not all([DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT]):
        raise ValueError("Variáveis de ambiente do banco de dados incompletas para desenvolvimento local (DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT).")

    db_uri = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"APP.PY: A usar conexão Cloud SQL via TCP: {DB_HOST}:{DB_PORT}")

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

TRASH_PREFIX = "trash/"

@app.context_processor
def inject_global_vars():
    return dict(TRASH_PREFIX=TRASH_PREFIX)

# Outras variáveis que você usa e obtém de os.environ (como GCP_PROJECT_ID) devem ser obtidas da mesma forma.
GCP_PROJECT_ID = os.environ.get('GCP_PROJECT_ID')
if not GCP_PROJECT_ID and IS_RUNNING_ON_CLOUD_RUN: # Pode ser necessário no Cloud Run para o storage client
     # Se não estiver definido, tenta obter do metadata server (comum em ambientes GCP)
    try:
        import requests
        metadata_server_url = "http://metadata.google.internal/computeMetadata/v1/project/project-id"
        headers = {"Metadata-Flavor": "Google"}
        response = requests.get(metadata_server_url, headers=headers, timeout=0.1) # Timeout curto
        response.raise_for_status()
        GCP_PROJECT_ID = response.text
        print(f"APP.PY: GCP_PROJECT_ID obtido do metadata server: {GCP_PROJECT_ID}")
    except Exception as e:
        print(f"APP.PY: Aviso - Não foi possível obter GCP_PROJECT_ID do metadata server: {e}. Certifique-se que está definido como variável de ambiente no Cloud Run se for necessário.")
elif not GCP_PROJECT_ID and not IS_RUNNING_ON_CLOUD_RUN:
    print("APP.PY: Aviso - GCP_PROJECT_ID não definido para desenvolvimento local. Certifique-se que está no seu .env se for necessário.")


# --- Configuração do Flask-Login ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login_page'  # Nome da sua função de rota de login
login_manager.login_message = "Por favor, faça login para aceder a esta página." # Mensagem opcional
login_manager.login_message_category = "info" # Categoria da mensagem flash (opcional)

# --- Modelos do Banco de Dados ---
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    gcs_bucket_name = db.Column(db.String(255), unique=True, nullable=True)

    def __repr__(self):
        return f'<User {self.email}>'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def format_file_size(size_bytes):
    if size_bytes is None:
        return "N/A"
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024.0
        i += 1
    s = "%.2f" % size_bytes
    return "%s %s" % (s.rstrip('0').rstrip('.'), size_name[i])

def get_file_type_from_name(filename):
    if '.' not in filename:
        return "Desconhecido"
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp']:
        return "Imagem"
    elif ext in ['doc', 'docx', 'odt', 'rtf']:
        return "Documento Word"
    elif ext == 'pdf':
        return "PDF"
    elif ext in ['xls', 'xlsx', 'ods', 'csv']:
        return "Folha de Cálculo"
    elif ext in ['ppt', 'pptx', 'odp']:
        return "Apresentação"
    elif ext in ['txt', 'md', 'log']:
        return "Texto"
    elif ext in ['zip', 'rar', 'tar', 'gz']:
        return "Comprimido"
    else:
        return ext.upper()

# --- Rotas ---
@app.route('/')
@login_required
def home():
    files_data = []
    if current_user.gcs_bucket_name:
        try:
            project_id = os.environ.get('GCP_PROJECT_ID', 'airy-bit-460116-k8')
            storage_client = storage.Client(project=project_id)
            blobs = storage_client.list_blobs(current_user.gcs_bucket_name)
            
            for blob in blobs:
                if blob.name.startswith(TRASH_PREFIX):
                    continue

                updated_date = blob.updated.strftime('%H:%M %d-%m-%Y') if blob.updated else "N/A"
                file_type = get_file_type_from_name(blob.name)

                icon_class = 'icon-file-alt'
                if file_type == "PDF":
                    icon_class = 'icon-pdf'
                elif file_type == "Imagem":
                    icon_class = 'icon-img'
                elif file_type in ["Documento Word", "Texto"]:
                    icon_class = 'icon-doc'
                # Adicione mais elif para outros tipos e ícones específicos
                # elif file_type == "Folha de Cálculo":
                #     icon_class = 'icon-excel' # Exemplo
                # elif file_type == "Comprimido":
                #     icon_class = 'icon-zip' # Exemplo

                files_data.append({
                    'name': blob.name,
                    'type': file_type,
                    'size': format_file_size(blob.size),
                    'modified': updated_date,
                    'icon_class': icon_class
                })
            print(f"Ficheiros encontrados para {current_user.email}: {len(files_data)}")
        except Exception as e:
            print(f"Erro ao listar ficheiros do bucket {current_user.gcs_bucket_name}: {e}")
    
    return render_template('index.html', files=files_data)


@app.route('/compartilhados')
@login_required
def compartilhados_page():
    return render_template('compartilhados.html')


@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    if request.method == 'POST':
        email = request.form.get('login-email')
        password = request.form.get('login-password')

        if not email or not password:
            return jsonify({"error": "Email e senha são obrigatórios"}), 400

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user) # Função do Flask-Login para iniciar a sessão
            print(f"Login bem-sucedido para: {email}, sessão iniciada.")
            # O frontend JavaScript ainda pode usar este redirect
            return jsonify({"message": "Login bem-sucedido!", "redirect": url_for('home')}), 200
        else:
            print(f"Falha no login para: {email}")
            return jsonify({"error": "Email ou senha inválidos"}), 401
        
    if request.method == 'GET':
        return render_template('login.html')

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout_page():
    logout_user()
    print("Utilizador deslogado.")
    return redirect(url_for('login_page'))

@app.route('/register', methods=['GET', 'POST'])
def register_page():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        email = request.form.get('register-email')
        password = request.form.get('register-password')

        if not email or not password:
            return jsonify({"error": "Email e senha são obrigatórios"}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "Este email já está registado"}), 409

        new_user = User(email=email)
        new_user.set_password(password)
        
        # Tenta criar o utilizador no banco primeiro
        try:
            db.session.add(new_user)
            db.session.commit() # Commit para obter o ID do new_user, se for usá-lo no nome do bucket
            print(f"Utilizador {email} pré-registado com ID: {new_user.id}")
        except Exception as e:
            db.session.rollback()
            print(f"Erro ao pré-registar utilizador {email} no DB: {e}")
            return jsonify({"error": "Ocorreu um erro ao registar no banco de dados. Tente novamente."}), 500

        # Criação do Bucket no GCP
        try:
            project_id = 'airy-bit-460116-k8'
            storage_client = storage.Client(project=project_id)
            
            bucket_name_prefix = "mycloud-userbucket-"
            bucket_name = f"{bucket_name_prefix}{str(uuid.uuid4())}"

            print(f"A tentar criar bucket com o nome: {bucket_name} no projeto {project_id}")

            bucket = storage_client.create_bucket(bucket_name, location="europe-west1") 
            
            new_user.gcs_bucket_name = bucket.name
            db.session.commit() 

            print(f"Bucket {bucket.name} criado e associado ao utilizador {email}.")

            flash('Registo efetuado com sucesso!', 'success')

            return redirect(url_for('login_page'))
        
        except Exception as e:
            print(f"Erro ao criar bucket GCS para {email} ou ao atualizar utilizador: {e}")

            # Se a criação do bucket falhar, idealmente deveríamos reverter a criação do utilizador
            # ou marcá-lo como "sem bucket" para tentar novamente mais tarde.
            # Por simplicidade agora, vamos apenas apagar o utilizador que foi pré-registado.
            # Numa app real, esta lógica de rollback seria mais robusta.

            db.session.delete(new_user)
            db.session.commit()

            print(f"Utilizador {email} removido devido a falha na criação do bucket.")

            return jsonify({"error": "Ocorreu um erro ao configurar o seu armazenamento. O registo foi cancelado. Tente novamente."}), 500

    return render_template('register.html')


@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum ficheiro enviado"}), 400
    
    file_to_upload = request.files['file']

    if file_to_upload.filename == '':
        return jsonify({"error": "Nenhum ficheiro selecionado"}), 400

    if file_to_upload and current_user.gcs_bucket_name:
        try:
            # É uma boa prática usar secure_filename para evitar nomes de ficheiro maliciosos
            filename = secure_filename(file_to_upload.filename)
            
            project_id = os.environ.get('GCP_PROJECT_ID', 'airy-bit-460116-k8') # Obtenha do .env ou defina diretamente
            storage_client = storage.Client(project=project_id)
            bucket = storage_client.bucket(current_user.gcs_bucket_name)
            blob = bucket.blob(filename) # O nome do ficheiro no GCS será o mesmo que o original

            # Pode querer definir o tipo de conteúdo para melhor visualização/download no GCS
            # blob.content_type = file_to_upload.content_type 

            blob.upload_from_file(file_to_upload.stream) # Use .stream para eficiência

            print(f"Ficheiro {filename} enviado para o bucket {current_user.gcs_bucket_name} por {current_user.email}")
            return jsonify({"message": f"Ficheiro '{filename}' enviado com sucesso!"}), 200
        
        except Exception as e:
            print(f"Erro ao enviar ficheiro para GCS: {e}")
            return jsonify({"error": "Ocorreu um erro no servidor ao tentar enviar o ficheiro."}), 500
    else:
        if not current_user.gcs_bucket_name:
            return jsonify({"error": "Utilizador não tem um bucket GCS configurado."}), 400
        return jsonify({"error": "Erro desconhecido no upload."}), 500
    
    
@app.route('/download/<path:filename>')
@login_required
def download_file(filename):
    if not current_user.gcs_bucket_name:
        # flash("Utilizador não tem um bucket configurado.", "danger") # Exemplo com flash messages
        return "Erro: Bucket não configurado para este utilizador.", 400

    try:
        project_id = os.environ.get('GCP_PROJECT_ID', 'airy-bit-460116-k8') # Confirme seu project_id
        storage_client = storage.Client(project=project_id)
        bucket = storage_client.bucket(current_user.gcs_bucket_name)
        blob = bucket.blob(filename)

        if not blob.exists():
            # flash(f"O ficheiro '{filename}' não foi encontrado.", "warning")
            return "Ficheiro não encontrado no seu armazenamento.", 404

        # Gerar uma URL assinada V4 para o blob.
        # A URL expira após 15 minutos (pode ajustar).
        # O método é GET, pois queremos descarregar o ficheiro.
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15), # O ficheiro pode ser descarregado durante os próximos 15 minutos
            method="GET",
            response_disposition=f"attachment; filename={filename}" # Sugere ao navegador para descarregar com este nome
        )
        
        print(f"A gerar URL assinada para download de {filename} do bucket {current_user.gcs_bucket_name}")
        # Redireciona o navegador para a URL assinada, o que iniciará o download
        return redirect(signed_url)

    except Exception as e:
        print(f"Erro ao gerar URL assinada para download de {filename}: {e}")
        # flash("Erro ao tentar descarregar o ficheiro. Tente novamente.", "danger")
        return "Erro ao processar o pedido de download.", 500
    
# --- Rotas da Lixeira ---
@app.route('/lixeira')
@login_required
def lixeira_page():
    trashed_files_data = []
    if current_user.gcs_bucket_name:
        try:
            storage_client = storage.Client(project=GCP_PROJECT_ID)
            blobs_in_trash = storage_client.list_blobs(current_user.gcs_bucket_name, prefix=TRASH_PREFIX)
            for blob in blobs_in_trash:
                if blob.name == TRASH_PREFIX and (blob.size is None or blob.size == 0):
                    continue
                updated_date = blob.updated.strftime('%H:%M %d-%m-%Y') if blob.updated else "N/A"
                original_filename = blob.name.replace(TRASH_PREFIX, '', 1)
                file_type = get_file_type_from_name(original_filename)
                icon_class = 'icon-file-alt'
                if file_type == "PDF": icon_class = 'icon-pdf'
                elif file_type == "Imagem": icon_class = 'icon-img'
                elif file_type in ["Documento Word", "Texto"]: icon_class = 'icon-doc'
                trashed_files_data.append({
                    'name': blob.name, # Nome completo com prefixo para referência
                    'original_name_display': original_filename, # Nome para exibir
                    'type': file_type,
                    'size': format_file_size(blob.size),
                    'modified': updated_date,
                    'icon_class': icon_class
                })
        except Exception as e:
            print(f"Erro ao listar ficheiros da lixeira: {e}")
            flash(f"Não foi possível carregar a lixeira: {str(e)}", "danger")
    return render_template('lixeira.html', trashed_files=trashed_files_data)


@app.route('/move_to_trash/<path:filename>', methods=['POST'])
@login_required
def move_to_trash(filename):
    if not current_user.gcs_bucket_name:
        flash("Utilizador não tem um bucket configurado.", "danger")
        return redirect(url_for('home'))
    try:
        storage_client = storage.Client(project=GCP_PROJECT_ID)
        bucket = storage_client.bucket(current_user.gcs_bucket_name)
        source_blob = bucket.blob(filename)

        if not source_blob.exists():
            flash(f"O ficheiro '{filename}' não foi encontrado.", "warning")
            return redirect(url_for('home'))

        destination_blob_name = TRASH_PREFIX + filename.lstrip('/')
        
        # Lógica para evitar sobrescrever na lixeira (adiciona sufixo numérico)
        counter = 1
        temp_dest_name = destination_blob_name
        original_name_part_for_rename, ext_part_for_rename = os.path.splitext(filename.lstrip('/'))

        while bucket.blob(temp_dest_name).exists():
            temp_dest_name = f"{TRASH_PREFIX}{original_name_part_for_rename}({counter}){ext_part_for_rename}"
            counter += 1
        destination_blob_name = temp_dest_name
        
        new_blob = bucket.copy_blob(source_blob, bucket, destination_blob_name)
        if new_blob.exists():
            source_blob.delete()
            flash(f"Ficheiro '{filename}' movido para a lixeira.", "success")
        else:
            flash(f"Falha ao mover o ficheiro '{filename}' para a lixeira.", "danger")
    except Exception as e:
        print(f"Erro ao mover ficheiro '{filename}' para a lixeira: {e}")
        flash(f"Erro ao mover ficheiro para a lixeira: {str(e)}", "danger")
    return redirect(url_for('home'))


@app.route('/delete_permanently_from_trash/<path:full_trash_filename>', methods=['POST'])
@login_required
def delete_permanently_from_trash_route(full_trash_filename): # Nome da função alterado
    if not current_user.gcs_bucket_name:
        flash("Utilizador não tem um bucket configurado.", "danger")
        return redirect(url_for('lixeira_page'))
    if not full_trash_filename.startswith(TRASH_PREFIX):
        flash("Operação inválida: O ficheiro não está na lixeira.", "danger")
        return redirect(url_for('lixeira_page'))
    try:
        storage_client = storage.Client(project=GCP_PROJECT_ID)
        bucket = storage_client.bucket(current_user.gcs_bucket_name)
        blob = bucket.blob(full_trash_filename)
        if blob.exists():
            blob.delete()
            display_name = full_trash_filename.replace(TRASH_PREFIX, '', 1)
            flash(f"Ficheiro '{display_name}' apagado permanentemente.", "success")
        else:
            flash(f"Ficheiro não encontrado na lixeira para apagar.", "warning")
    except Exception as e:
        print(f"Erro ao apagar permanentemente '{full_trash_filename}': {e}")
        flash(f"Erro ao apagar permanentemente o ficheiro: {str(e)}", "danger")
    return redirect(url_for('lixeira_page'))

# ------------------------------ UTILIZAÇÃO APENAS EM DEVELOPMENT ------------------------------ #

# Rota de Depuração Temporária
@app.route('/_internal_debug/list_users')
def list_users_debug():
    if not app.debug:
        return "Acesso negado. Esta rota é apenas para modo de depuração.", 403
    try:
        users = User.query.all()
        if not users:
            return "Nenhum utilizador encontrado na base de dados."
        output = "<h1>Utilizadores Registados:</h1><ul>"
        for user in users:
            output += f"<li>ID: {user.id}, Email: {user.email}, Bucket GCS: {user.gcs_bucket_name or 'Não definido'}</li>"
        output += "</ul>"
        return output
    except Exception as e:
        return f"Erro ao aceder à base de dados: {str(e)}"

# --------------------------------------------------------------------------------------------------------

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=os.environ.get('FLASK_DEBUG', '0') == '1')