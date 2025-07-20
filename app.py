import os
import json
import jwt
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, List, Optional

from flask import Flask, jsonify, request, send_from_directory, make_response
from flask_cors import CORS
from werkzeug.utils import secure_filename
import bcrypt
from config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app():
    """Application Factory Pattern"""
    app = Flask(__name__)

    # Validate critical environment variables
    if not Config.JWT_SECRET:
        raise RuntimeError('JWT_SECRET environment variable is required')

    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": Config.CORS_ORIGINS,
            "methods": ["GET", "POST", "DELETE", "OPTIONS", "PUT"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Ensure required directories exist
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(os.path.dirname(Config.EVENTS_FILE), exist_ok=True)

    # Initialize data files if they don't exist
    initialize_data_files()

    # Register blueprints AFTER app is created
    from api.events import events_bp
    from api.auth import auth_bp

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(events_bp, url_prefix='/api')

    # Register routes
    @app.route('/health')
    def health_check():
        """Health check endpoint for monitoring"""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0'
        })

    @app.after_request
    def after_request(response):
        """Add CORS headers to all responses"""
        origin = request.headers.get('Origin')
        if origin in Config.CORS_ORIGINS:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    return app


def initialize_data_files():
    """Initialize data files with default content if they don't exist"""

    # Initialize events file
    if not os.path.exists(Config.EVENTS_FILE):
        default_events = [
            {
                "id": 1,
                "title": "Event 1",
                "description": "Beschreibung für Event 1",
                "banner_url": "https://link.storjshare.io/raw/julpadc66a57pal46igjl4azssja/geko/event0.png",
                "default_image_url": "https://link.storjshare.io/raw/julpadc66a57pal46igjl4azssja/geko/event0.png",
                "uploaded_image": "",
                "participants": [],
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": 2,
                "title": "Event 2",
                "description": "Beschreibung für Event 2",
                "banner_url": "https://link.storjshare.io/raw/jvknoz7bbo5l45f5kp4d62fhwt4a/geko/Event1.png",
                "default_image_url": "https://link.storjshare.io/raw/jvknoz7bbo5l45f5kp4d62fhwt4a/geko/Event1.png",
                "uploaded_image": "",
                "participants": [],
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": 3,
                "title": "Event 3",
                "description": "Beschreibung für Event 3",
                "banner_url": "https://link.storjshare.io/raw/jwtanqrv3dqklcksophmccbgrora/geko/event2.jpg",
                "default_image_url": "https://link.storjshare.io/raw/jwtanqrv3dqklcksophmccbgrora/geko/event2.jpg",
                "uploaded_image": "",
                "participants": [],
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": 4,
                "title": "Event 4",
                "description": "Beschreibung für Event 4",
                "banner_url": "https://link.storjshare.io/raw/juj6yfbpheluxs5uzwkfholsamrq/geko/Logo.png",
                "default_image_url": "https://link.storjshare.io/raw/juj6yfbpheluxs5uzwkfholsamrq/geko/Logo.png",
                "uploaded_image": "",
                "participants": [],
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        with open(Config.EVENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_events, f, indent=2, ensure_ascii=False)
        logger.info(f"Initialized events file: {Config.EVENTS_FILE}")

    # Initialize participants file (legacy support)
    if not os.path.exists(Config.PARTICIPANTS_FILE):
        with open(Config.PARTICIPANTS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        logger.info(
            f"Initialized participants file: {Config.PARTICIPANTS_FILE}")


# JWT Helper Functions
def generate_token(username: str) -> str:
    """Generate JWT token for authenticated user"""
    payload = {
        'sub': username,
        'exp': datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return username if valid"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET,
                             algorithms=[Config.JWT_ALGORITHM])
        return payload.get('sub')
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError:
        logger.warning("Invalid token")
        return None


def auth_required(f):
    """Decorator to protect endpoints with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401

        token = auth_header[7:]  # Remove 'Bearer ' prefix
        username = verify_token(token)
        if not username:
            return jsonify({'error': 'Invalid or expired token'}), 401

        request.current_user = username
        return f(*args, **kwargs)

    return decorated


# Data Helper Functions
def load_events() -> List[Dict]:
    """Load events from JSON file"""
    try:
        with open(Config.EVENTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Error loading events: {e}")
        return []


def save_events(events: List[Dict]) -> bool:
    """Save events to JSON file"""
    try:
        with open(Config.EVENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving events: {e}")
        return False


def get_event_image_url(event: Dict) -> str:
    """Get the display image URL for an event"""
    if event.get('uploaded_image'):
        return f"/api/uploads/{event['uploaded_image']}"
    return event.get('banner_url', event.get('default_image_url', ''))


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


# Create the Flask app instance
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
