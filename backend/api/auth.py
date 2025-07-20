from flask import Blueprint, request, jsonify
import bcrypt
from app import Config, generate_token, logger

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400

        # Check username
        if username != Config.ADMIN_USERNAME:
            logger.warning(f"Login attempt with invalid username: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401

        # Check password
        if not bcrypt.checkpw(password.encode('utf-8'), Config.ADMIN_PASSWORD_HASH.encode('utf-8')):
            logger.warning(
                f"Login attempt with invalid password for user: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401

        # Generate token
        token = generate_token(username)
        logger.info(f"Successful login for user: {username}")

        return jsonify({
            'success': True,
            'token': token,
            'user': username
        }), 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/verify', methods=['GET'])
def verify_token_endpoint():
    """Verify if current token is still valid"""
    from app import verify_token

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing Authorization header'}), 401

    token = auth_header[7:]
    username = verify_token(token)

    if not username:
        return jsonify({'error': 'Invalid or expired token'}), 401

    return jsonify({
        'valid': True,
        'user': username
    }), 200
