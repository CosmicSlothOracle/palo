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


# -------------------- Helper functions for static events --------------------

def load_static_events():
    """Load static events data - always returns exactly 4 events"""
    if not os.path.exists(EVENTS_FILE):
        # Initialize with 4 default events with placeholder images
        default_events = [
            {
                'id': 1,
                'title': 'Event 1',
                'description': 'Beschreibung für Event 1',
                'banner_url': 'https://link.storjshare.io/raw/julpadc66a57pal46igjl4azssja/geko/event0.png',
                'uploaded_image': '',
                'participants': [],
                'created_at': datetime.utcnow().isoformat()
            },
            {
                'id': 2,
                'title': 'Event 2',
                'description': 'Beschreibung für Event 2',
                'banner_url': 'https://link.storjshare.io/raw/jvknoz7bbo5l45f5kp4d62fhwt4a/geko/Event1.png',
                'uploaded_image': '',
                'participants': [],
                'created_at': datetime.utcnow().isoformat()
            },
            {
                'id': 3,
                'title': 'Event 3',
                'description': 'Beschreibung für Event 3',
                'banner_url': 'https://link.storjshare.io/raw/jwtanqrv3dqklcksophmccbgrora/geko/event2.jpg',
                'uploaded_image': '',
                'participants': [],
                'created_at': datetime.utcnow().isoformat()
            },
            {
                'id': 4,
                'title': 'Event 4',
                'description': 'Beschreibung für Event 4',
                'banner_url': 'https://link.storjshare.io/raw/juj6yfbpheluxs5uzwkfholsamrq/geko/Logo.png',
                'uploaded_image': '',
                'participants': [],
                'created_at': datetime.utcnow().isoformat()
            }
        ]
        save_static_events(default_events)
        return default_events

    with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
        try:
            events = json.load(f)
            # Ensure we always have exactly 4 events
            while len(events) < 4:
                next_id = len(events) + 1
                # Default placeholder URLs for each event
                placeholder_urls = [
                    'https://link.storjshare.io/raw/julpadc66a57pal46igjl4azssja/geko/event0.png',
                    'https://link.storjshare.io/raw/jvknoz7bbo5l45f5kp4d62fhwt4a/geko/Event1.png',
                    'https://link.storjshare.io/raw/jwtanqrv3dqklcksophmccbgrora/geko/event2.jpg',
                    'https://link.storjshare.io/raw/juj6yfbpheluxs5uzwkfholsamrq/geko/Logo.png'
                ]
                events.append({
                    'id': next_id,
                    'title': f'Event {next_id}',
                    'description': f'Beschreibung für Event {next_id}',
                    'banner_url': placeholder_urls[next_id - 1] if next_id <= 4 else '',
                    'uploaded_image': '',
                    'participants': [],
                    'created_at': datetime.utcnow().isoformat()
                })
            # Limit to exactly 4 events
            events = events[:4]
            return events
        except Exception:
            return load_static_events()  # Recursively load defaults if file is corrupted


def save_static_events(events):
    """Save static events data"""
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)


def get_event_image_url(event):
    """Get the image URL for an event, prioritizing uploaded image over banner_url"""
    if event.get('uploaded_image') and os.path.exists(os.path.join(UPLOAD_FOLDER, event['uploaded_image'])):
        return f'/uploads/{event["uploaded_image"]}'
    elif event.get('banner_url'):
        return event['banner_url']
    else:
        return '/uploads/placeholder.png'  # Default placeholder


# -------------------- File Upload Routes --------------------

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(UPLOAD_FOLDER, filename)

# -------------------- Event Endpoints --------------------


@app.route('/api/events', methods=['GET'])
def list_events():
    """Public endpoint: return list of events with proper image URLs."""
    events = load_static_events()
    # Add computed image URLs to each event
    for event in events:
        event['display_image_url'] = get_event_image_url(event)
    return jsonify({'events': events}), 200


@app.route('/api/events/<int:event_id>', methods=['POST'])
@auth_required
def update_static_event(event_id):
    """Admin: update a static event (1-4). Expected JSON: {title, description, banner_url}"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    banner_url = data.get('banner_url')

    events = load_static_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    if title:
        event['title'] = title
    if description:
        event['description'] = description
    if banner_url:
        event['banner_url'] = banner_url

    event['updated_at'] = datetime.utcnow().isoformat()
    save_static_events(events)
    return jsonify({'event': event}), 200


@app.route('/api/events/<int:event_id>', methods=['PUT'])
@auth_required
def update_event(event_id):
    """Admin: update title, description or banner of a static event (1-4)."""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    events = load_static_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    banner_url = data.get('banner_url')

    if title:
        event['title'] = title
    if description:
        event['description'] = description
    if banner_url:
        event['banner_url'] = banner_url

    event['updated_at'] = datetime.utcnow().isoformat()
    save_static_events(events)
    return jsonify({'event': event}), 200


# Static events cannot be deleted, only reset
@app.route('/api/events/<int:event_id>/reset', methods=['POST'])
@auth_required
def reset_static_event(event_id):
    """Admin: reset a static event to default values"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    events = load_static_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Reset to default values
    event.update({
        'title': f'Event {event_id}',
        'description': f'Beschreibung für Event {event_id}',
        'banner_url': '',
        'uploaded_image': '',
        'participants': [],
        'updated_at': datetime.utcnow().isoformat()
    })

    save_static_events(events)
    return jsonify({'success': True, 'event': event}), 200


# -------------------- Image Upload Endpoints for Static Events --------------------

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/events/<int:event_id>/upload', methods=['POST'])
@auth_required
def upload_event_image(event_id):
    """Admin: upload an image for a static event (1-4)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        # Generate secure filename with event prefix
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        filename = f'event_{event_id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.{file_extension}'
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        try:
            file.save(filepath)

            # Update event with uploaded image
            events = load_static_events()
            event = next((e for e in events if e.get('id') == event_id), None)
            if not event:
                # Clean up uploaded file if event not found
                os.remove(filepath)
                return jsonify({'error': 'Event not found'}), 404

            # Remove old uploaded image if exists
            if event.get('uploaded_image'):
                old_path = os.path.join(UPLOAD_FOLDER, event['uploaded_image'])
                if os.path.exists(old_path):
                    os.remove(old_path)

            event['uploaded_image'] = filename
            event['updated_at'] = datetime.utcnow().isoformat()
            save_static_events(events)

            return jsonify({
                'success': True,
                'filename': filename,
                'image_url': get_event_image_url(event)
            }), 200

        except Exception as e:
            logger.error(f'Error uploading file: {str(e)}')
            return jsonify({'error': 'Failed to upload file'}), 500

    return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400


@app.route('/api/events/<int:event_id>/remove-image', methods=['POST'])
@auth_required
def remove_event_image(event_id):
    """Admin: remove uploaded image for a static event (1-4)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    events = load_static_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Remove uploaded image file if exists
    if event.get('uploaded_image'):
        old_path = os.path.join(UPLOAD_FOLDER, event['uploaded_image'])
        if os.path.exists(old_path):
            os.remove(old_path)
        event['uploaded_image'] = ''

    event['updated_at'] = datetime.utcnow().isoformat()
    save_static_events(events)

    return jsonify({
        'success': True,
        'image_url': get_event_image_url(event)
    }), 200

# -------------------- Participant per Event --------------------


@app.route('/api/events/<int:event_id>/participants', methods=['POST'])
def add_event_participant(event_id):
    events = load_static_events()
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
    save_static_events(events)
    return jsonify({'success': True, 'participant': participant}), 201


@app.route('/api/events/<int:event_id>/participants', methods=['GET'])
@auth_required
def list_event_participants(event_id):
    events = load_static_events()
    event = next((e for e in events if e.get('id') == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    return jsonify({'participants': event.get('participants', [])}), 200


# -------------------- Export Endpoint --------------------

@app.route('/api/events/<int:event_id>/export')
@auth_required
def export_event(event_id):
    fmt = request.args.get('fmt', 'json').lower()
    events = load_static_events()
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
