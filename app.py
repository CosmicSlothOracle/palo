from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, make_response, redirect
from flask_cors import CORS
import bcrypt
import os
import json
import jwt
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from cms import ContentManager
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Configure CORS more explicitly
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:8000",
            "http://localhost:8080",
            "https://kosge-frontend.onrender.com",
            "https://kosge-frontend-kqxo.onrender.com",
            "https://kos-frontend.onrender.com",
            "https://kos-frontend-kqxo.onrender.com",
            "https://kos-2.onrender.com"
        ],
        "methods": ["GET", "POST", "DELETE", "OPTIONS", "PUT"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize CMS
content_manager = ContentManager(
    os.path.join(os.path.dirname(__file__), 'content'))

# Get the absolute path of the current directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
PARTICIPANTS_FILE = os.path.join(BASE_DIR, 'participants.json')

# --- New Events file constant ---
EVENTS_FILE = os.path.join(BASE_DIR, 'events.json')

logger.info(f'Base directory: {BASE_DIR}')
logger.info(f'Upload folder: {UPLOAD_FOLDER}')

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    logger.info(f'Creating upload directory: {UPLOAD_FOLDER}')
    os.makedirs(UPLOAD_FOLDER)
    logger.info('Upload directory created successfully')

# Create empty participants file if it doesn't exist
if not os.path.exists(PARTICIPANTS_FILE):
    with open(PARTICIPANTS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

# Ensure events file exists
if not os.path.exists(EVENTS_FILE):
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)


# Add debug logging for participants file
logger.info(f'Participants file path: {PARTICIPANTS_FILE}')
if os.path.exists(PARTICIPANTS_FILE):
    logger.info('Participants file exists')
    with open(PARTICIPANTS_FILE, 'r', encoding='utf-8') as f:
        try:
            participants = json.load(f)
            logger.info(f'Number of participants: {len(participants)}')
        except json.JSONDecodeError as e:
            logger.error(f'Error reading participants file: {e}')
else:
    logger.warning('Participants file does not exist')

# -------------------- Security configuration --------------------

# Allowed origins for CORS (comma-separated). If not provided, default to same list as Flask-CORS init
_default_origins = "http://localhost:8000,http://localhost:8080,https://kosge-frontend.onrender.com,https://kosge-frontend-kqxo.onrender.com,https://kos-frontend.onrender.com,https://kos-frontend-kqxo.onrender.com,https://kos-2.onrender.com"
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

# Admin credentials – require env override in production
# Stored as string in env → convert to bytes for bcrypt
_default_pw_hash = '$2b$12$ZCgWXzUdmVX.PnIfj4oeJOkX69Tu1rVZ51zGYe3kSloANnwMaTlBW'

if os.environ.get("FLASK_ENV") == "production" and os.environ.get("ADMIN_PASSWORD_HASH") is None:
    raise RuntimeError(
        "ADMIN_PASSWORD_HASH env variable is required in production")

# ---------------------------------------------------------------

# Admin credentials are now loaded from environment variables so they can be
# changed without modifying the source code.
#
# To set them locally, create a `.env` file (see `.env.example`) or define
# system environment variables:
#   ADMIN_USERNAME=<your-user>
#   ADMIN_PASSWORD_HASH=<bcrypt-hash>  ─ use `python -c "import bcrypt,sys; print(bcrypt.hashpw(b'NEWPASS', bcrypt.gensalt()).decode())"`
#
# If not set, sensible defaults are used (matching the previous hard-coded user).


ADMIN_USERNAME: str = os.environ.get('ADMIN_USERNAME', 'admin')

# Stored as string in env → convert to bytes for bcrypt
ADMIN_PASSWORD_HASH: bytes = os.environ.get(
    'ADMIN_PASSWORD_HASH', _default_pw_hash).encode('utf-8')

# JWT configuration
JWT_SECRET: str = os.environ.get('JWT_SECRET')
# Fail fast if secret is missing to avoid running with an insecure default
if not JWT_SECRET:
    raise RuntimeError(
        'JWT_SECRET environment variable is required for secure token generation')
JWT_ALGO = 'HS256'
JWT_EXP_HOURS = 8


def generate_token(username: str) -> str:
    """Return a signed JWT token."""
    payload = {
        'sub': username,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload.get('sub')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def auth_required(f):
    """Decorator to protect endpoints with JWT token in Authorization header."""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        token = auth_header[7:]
        user = verify_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        # You could attach user to request context here if needed
        return f(*args, **kwargs)

    return decorated


ALLOWED_EXTENSIONS = {'png'}


def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin and (origin in ALLOWED_ORIGINS):
        response.headers['Access-Control-Allow-Origin'] = origin
    # For non-browser/script calls where Origin is absent, do not set header.
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS, PUT'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


@app.after_request
def after_request(response):
    return add_cors_headers(response)


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        origin = request.headers.get('Origin')
        if origin and origin in ALLOWED_ORIGINS:
            response.headers.add("Access-Control-Allow-Origin", origin)
        response.headers.add("Access-Control-Allow-Methods",
                             "GET, POST, DELETE, OPTIONS, PUT")
        response.headers.add("Access-Control-Allow-Headers",
                             "Content-Type, Authorization")
        return response


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def load_participants():
    if not os.path.exists(PARTICIPANTS_FILE):
        return []
    with open(PARTICIPANTS_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []


def save_participants(participants):
    with open(PARTICIPANTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(participants, f, ensure_ascii=False, indent=2)


# -------------------- Helper functions for events --------------------

def load_events():
    if not os.path.exists(EVENTS_FILE):
        return []
    with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []


def save_events(events):
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)


def get_next_event_id(events):
    if not events:
        return 1
    return max(event.get('id', 0) for event in events) + 1


# -------------------- Event Endpoints --------------------

@app.route('/api/events', methods=['GET'])
def list_events():
    """Public endpoint: return list of events."""
    events = load_events()
    return jsonify({'events': events}), 200


@app.route('/api/events', methods=['POST'])
@auth_required
def create_event():
    """Admin: create a new event. Expected JSON: {title, banner_url}"""
    data = request.get_json()
    title = data.get('title')
    banner_url = data.get('banner_url')

    if not title or not banner_url:
        return jsonify({'error': 'title and banner_url are required'}), 400

    events = load_events()
    event_id = get_next_event_id(events)
    new_event = {
        'id': event_id,
        'title': title,
        'banner_url': banner_url,
        'created_at': datetime.utcnow().isoformat(),
        'participants': []
    }
    events.append(new_event)
    save_events(events)
    return jsonify({'event': new_event}), 201


@app.route('/api/events/<int:event_id>', methods=['PUT'])
@auth_required
def update_event(event_id):
    """Admin: update title or banner of an event."""
    events = load_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    title = data.get('title')
    banner_url = data.get('banner_url')
    if title:
        event['title'] = title
    if banner_url:
        event['banner_url'] = banner_url
    event['updated_at'] = datetime.utcnow().isoformat()
    save_events(events)
    return jsonify({'event': event}), 200


@app.route('/api/events/<int:event_id>', methods=['DELETE'])
@auth_required
def delete_event(event_id):
    events = load_events()
    new_events = [e for e in events if e.get('id') != event_id]
    if len(new_events) == len(events):
        return jsonify({'error': 'Event not found'}), 404
    save_events(new_events)
    return jsonify({'success': True}), 200


# -------------------- Participant per Event --------------------

@app.route('/api/events/<int:event_id>/participants', methods=['POST'])
def add_event_participant(event_id):
    events = load_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not all([name, email]):
        return jsonify({'error': 'name and email are required'}), 400

    participant = {
        'name': name,
        'email': email,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    event.setdefault('participants', []).append(participant)
    save_events(events)
    return jsonify({'success': True, 'participant': participant}), 201


@app.route('/api/events/<int:event_id>/participants', methods=['GET'])
@auth_required
def list_event_participants(event_id):
    events = load_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    return jsonify({'participants': event.get('participants', [])}), 200


# -------------------- Export Endpoint --------------------

@app.route('/api/events/<int:event_id>/export')
@auth_required
def export_event(event_id):
    fmt = request.args.get('fmt', 'json').lower()
    events = load_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    participants = event.get('participants', [])

    if fmt == 'csv':
        # Generate CSV data
        import csv
        from io import StringIO
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow(['Event ID', 'Title', 'Name',
                        'Email', 'Message', 'Timestamp'])
        for p in participants:
            writer.writerow([event_id, event['title'], p['name'],
                            p['email'], p.get('message', ''), p['timestamp']])
        output = si.getvalue()
        response = make_response(output)
        response.headers['Content-Disposition'] = f'attachment; filename=event_{event_id}.csv'
        response.headers['Content-Type'] = 'text/csv'
        return response
    else:
        # Default JSON output
        return jsonify({'event_id': event_id, 'title': event['title'], 'participants': participants}), 200


@app.route('/api/health', methods=['GET'])
def health():
    try:
        # Check if we can read participants file
        participants = load_participants()
        # Check if uploads directory exists
        uploads_exist = os.path.exists(UPLOAD_FOLDER)

        return jsonify({
            'status': 'healthy',
            'participants_count': len(participants),
            'uploads_directory': uploads_exist,
            'base_dir': BASE_DIR,
            'python_version': os.environ.get('PYTHON_VERSION', '3.11.11'),
            'environment': os.environ.get('FLASK_ENV', 'production')
        }), 200
    except Exception as e:
        logger.error(f'Health check failed: {str(e)}')
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username == ADMIN_USERNAME and bcrypt.checkpw(password.encode(), ADMIN_PASSWORD_HASH):
        return jsonify({'token': generate_token(username), 'user': username}), 200
    return jsonify({'error': 'Invalid credentials'}), 401


# -------------------- Banner endpoints --------------------


@app.route('/api/banners', methods=['POST'])
@auth_required
def upload_banner():
    if 'file' not in request.files:
        logger.error('No file part in request')
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        logger.error('No selected file')
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        logger.info(f'Saving file to: {save_path}')
        try:
            file.save(save_path)
            logger.info(f'File saved successfully: {save_path}')
            # Verify file exists after saving
            if os.path.exists(save_path):
                logger.info(f'File exists at: {save_path}')
                logger.info(f'File size: {os.path.getsize(save_path)} bytes')
            else:
                logger.error(f'File not found after saving: {save_path}')
            url = f'/api/uploads/{filename}'
            return jsonify({'url': url, 'filename': filename}), 201
        except Exception as e:
            logger.error(f'Error saving file: {str(e)}')
            return jsonify({'error': f'Failed to save file: {str(e)}'}), 500
    logger.error('Invalid file type')
    return jsonify({'error': 'Invalid file type. Only PNG allowed.'}), 400


@app.route('/api/banners', methods=['GET'])
@auth_required
def list_banners():
    files = [f for f in os.listdir(UPLOAD_FOLDER) if allowed_file(f)]
    urls = [f'/api/uploads/{f}' for f in files]
    return jsonify({'banners': urls}), 200


@app.route('/api/banners/<filename>', methods=['DELETE'])
@auth_required
def delete_banner(filename):
    filename = secure_filename(filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not allowed_file(filename):
        return jsonify({'error': 'Invalid file type.'}), 400
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({'success': True, 'filename': filename}), 200
    else:
        return jsonify({'error': 'File not found.'}), 404


@app.route('/api/uploads/<filename>')
def uploaded_file(filename):
    logger.info(f'Attempting to serve file: {filename}')
    logger.info(f'Upload folder: {UPLOAD_FOLDER}')
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    logger.info(f'Full file path: {file_path}')

    if not os.path.exists(file_path):
        logger.error(f'File not found: {file_path}')
        return jsonify({'error': 'File not found'}), 404

    try:
        logger.info(f'File exists, size: {os.path.getsize(file_path)} bytes')
        response = send_from_directory(UPLOAD_FOLDER, filename)

        # Add CORS headers with restricted origin
        response = add_cors_headers(response)

        # Set content type for PNG files
        if filename.lower().endswith('.png'):
            response.headers['Content-Type'] = 'image/png'

        return response
    except Exception as e:
        logger.error(f'Error serving file {filename}: {str(e)}')
        return jsonify({'error': f'Error serving file: {str(e)}'}), 500


@app.route('/api/participants', methods=['POST'])
def add_participant():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')
    banner = data.get('banner')
    if not name:
        return jsonify({'error': 'Name ist erforderlich.'}), 400
    participant = {
        'name': name,
        'email': email,
        'message': message,
        'banner': banner
    }
    participants = load_participants()
    participants.append(participant)
    save_participants(participants)
    return jsonify({'success': True, 'participant': participant}), 201


@app.route('/api/participants', methods=['GET'])
@auth_required
def get_participants():
    try:
        participants = load_participants()
        response = jsonify({'participants': participants})
        # Add CORS headers
        response = add_cors_headers(response)
        response.headers.add('Content-Type', 'application/json')
        return response, 200
    except Exception as e:
        logger.error(f'Error getting participants: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/participants', methods=['OPTIONS'])
def participants_options():
    response = make_response()
    response = add_cors_headers(response)
    return response


# CMS Routes
@app.route('/api/cms/content/<section>', methods=['GET'])
def get_content(section):
    language = request.args.get('language')
    content = content_manager.get_content(section, language)
    if content:
        return jsonify(content), 200
    return jsonify({'error': 'Content not found'}), 404


@app.route('/api/cms/content/<section>', methods=['POST'])
@auth_required
def create_content(section):
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    metadata = data.get('metadata', {})

    if not all([title, content]):
        return jsonify({'error': 'Title and content are required'}), 400

    success = content_manager.create_content(section, title, content, metadata)
    if success:
        return jsonify({'success': True, 'section': section}), 201
    return jsonify({'error': 'Failed to create content'}), 500


@app.route('/api/cms/content/<section>', methods=['PUT'])
@auth_required
def update_content(section):
    data = request.get_json()
    content = data.get('content')
    metadata = data.get('metadata', {})
    language = data.get('language')

    if not content:
        return jsonify({'error': 'Content is required'}), 400

    success = content_manager.update_content(
        section, content, metadata, language)
    if success:
        return jsonify({'success': True, 'section': section}), 200
    return jsonify({'error': 'Failed to update content'}), 404


@app.route('/api/cms/content/<section>/translate/<target_language>', methods=['POST'])
@auth_required
def translate_content(section, target_language):
    success = content_manager.translate_content(section, target_language)
    if success:
        return jsonify({'success': True, 'section': section, 'language': target_language}), 200
    return jsonify({'error': 'Translation failed'}), 400


@app.route('/api/cms/sections', methods=['GET'])
def list_sections():
    language = request.args.get('language')
    sections = content_manager.list_sections(language)
    return jsonify({'sections': sections}), 200


@app.route('/api/cms/content/<section>', methods=['DELETE'])
@auth_required
def delete_content(section):
    language = request.args.get('language')
    success = content_manager.delete_content(section, language)
    if success:
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Content not found'}), 404


# Add a root route that redirects to frontend or shows API status
@app.route('/')
def index():
    # Check if this is a browser request (has Accept header with text/html)
    if 'text/html' in request.headers.get('Accept', ''):
        # Redirect to frontend
        return redirect('https://kosge-frontend.onrender.com')
    # Otherwise return API status as JSON
    return jsonify({
        'status': 'online',
        'message': 'KOSGE API Server',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'login': '/api/login',
            'banners': '/api/banners',
            'participants': '/api/participants',
            'cms': '/api/cms/content/<section>'
        }
    }), 200


# Add a route for favicon.ico to prevent 404 errors
@app.route('/favicon.ico')
def favicon():
    return '', 204  # Return no content status


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
