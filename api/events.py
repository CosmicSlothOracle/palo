import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from functools import wraps

events_bp = Blueprint('events', __name__)


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


def verify_token(token: str):
    """Import verify_token from app module"""
    from app import verify_token as _verify_token
    return _verify_token(token)


@events_bp.route('/events', methods=['GET'])
def get_events():
    """Get all events (public endpoint)"""
    try:
        events = load_events()

        # Ensure we always return exactly 4 events
        if len(events) < 4:
            current_app.logger.warning(
                f"Only {len(events)} events found, expected 4")

        # Add display_image_url for each event
        for event in events:
            event['display_image_url'] = get_event_image_url(event)

        return jsonify({
            'success': True,
            'events': events[:4]  # Always return max 4 events
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error loading events: {str(e)}")
        return jsonify({'error': 'Failed to load events'}), 500


@events_bp.route('/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """Get a specific event"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        event['display_image_url'] = get_event_image_url(event)

        return jsonify({
            'success': True,
            'event': event
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error loading event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to load event'}), 500


@events_bp.route('/events/<int:event_id>', methods=['PUT'])
@auth_required
def update_event(event_id):
    """Update an event (admin only)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Update allowed fields
        if 'title' in data:
            event['title'] = data['title'].strip()
        if 'description' in data:
            event['description'] = data['description'].strip()
        if 'banner_url' in data:
            event['banner_url'] = data['banner_url'].strip()

        event['updated_at'] = datetime.utcnow().isoformat()

        if save_events(events):
            event['display_image_url'] = get_event_image_url(event)
            current_app.logger.info(
                f"Event {event_id} updated by {request.current_user}")
            return jsonify({
                'success': True,
                'event': event
            }), 200
        else:
            return jsonify({'error': 'Failed to save event'}), 500

    except Exception as e:
        current_app.logger.error(f"Error updating event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to update event'}), 500


@events_bp.route('/events/<int:event_id>/reset', methods=['POST'])
@auth_required
def reset_event(event_id):
    """Reset an event to default state (admin only)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Remove uploaded image file if exists
        if event.get('uploaded_image'):
            old_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'], event['uploaded_image'])
            if os.path.exists(old_path):
                os.remove(old_path)
                current_app.logger.info(f"Removed uploaded image: {old_path}")

        # Reset to default values
        default_image_url = event.get('default_image_url', '')
        event.update({
            'title': f'Event {event_id}',
            'description': f'Beschreibung für Event {event_id}',
            'banner_url': default_image_url,
            'uploaded_image': '',
            'participants': [],
            'updated_at': datetime.utcnow().isoformat()
        })

        if save_events(events):
            event['display_image_url'] = get_event_image_url(event)
            current_app.logger.info(
                f"Event {event_id} reset by {request.current_user}")
            return jsonify({
                'success': True,
                'event': event
            }), 200
        else:
            return jsonify({'error': 'Failed to save event'}), 500

    except Exception as e:
        current_app.logger.error(f"Error resetting event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to reset event'}), 500


@events_bp.route('/events/<int:event_id>/participants', methods=['GET'])
@auth_required
def get_participants(event_id):
    """Get participants for an event (admin only)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        participants = event.get('participants', [])

        return jsonify({
            'success': True,
            'participants': participants,
            'count': len(participants)
        }), 200

    except Exception as e:
        current_app.logger.error(
            f"Error loading participants for event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to load participants'}), 500


@events_bp.route('/events/<int:event_id>/participants', methods=['POST'])
def add_participant(event_id):
    """Add a participant to an event (public endpoint)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()

        if not name or not email:
            return jsonify({'error': 'Name and email are required'}), 400

        # Basic email validation
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email format'}), 400

        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Create participant object
        participant = {
            'name': name,
            'email': email,
            'message': data.get('message', '').strip(),
            'timestamp': datetime.utcnow().isoformat(),
            'event_id': event_id
        }

        # Add to event's participants list
        if 'participants' not in event:
            event['participants'] = []

        event['participants'].append(participant)
        event['updated_at'] = datetime.utcnow().isoformat()

        if save_events(events):
            current_app.logger.info(
                f"New participant {name} added to event {event_id}")
            return jsonify({
                'success': True,
                'participant': participant,
                'message': 'Successfully registered for the event'
            }), 201
        else:
            return jsonify({'error': 'Failed to save participant'}), 500

    except Exception as e:
        current_app.logger.error(
            f"Error adding participant to event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to add participant'}), 500


@events_bp.route('/events/<int:event_id>/export', methods=['GET'])
@auth_required
def export_participants(event_id):
    """Export participants as CSV (admin only)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        participants = event.get('participants', [])

        # Create CSV content
        csv_header = "Event ID,Event Title,Name,Email,Message,Timestamp\n"
        csv_rows = []

        for participant in participants:
            row = [
                str(event_id),
                event.get('title', ''),
                participant.get('name', ''),
                participant.get('email', ''),
                participant.get('message', ''),
                participant.get('timestamp', '')
            ]
            # Escape quotes and wrap in quotes
            escaped_row = []
            for field in row:
                field_str = str(field).replace('"', '""')
                escaped_row.append(f'"{field_str}"')
            csv_rows.append(','.join(escaped_row))

        csv_content = csv_header + '\n'.join(csv_rows)

        # Create response with CSV content
        response = jsonify({
            'success': True,
            'csv_content': csv_content,
            'filename': f'event_{event_id}_participants.csv',
            'count': len(participants)
        })

        return response, 200

    except Exception as e:
        current_app.logger.error(
            f"Error exporting participants for event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to export participants'}), 500


@events_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    try:
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        current_app.logger.error(f"Error serving file {filename}: {str(e)}")
        return jsonify({'error': 'File not found'}), 404


@events_bp.route('/events/<int:event_id>/upload', methods=['POST'])
@auth_required
def upload_event_image(event_id):
    """Upload an image for an event (admin only)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        try:
            # Generate secure filename
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            filename = f'event_{event_id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.{file_extension}'
            filepath = os.path.join(
                current_app.config['UPLOAD_FOLDER'], filename)

            # Save file
            file.save(filepath)

            # Update event
            events = load_events()
            event = next((e for e in events if e.get('id') == event_id), None)

            if not event:
                # Clean up uploaded file if event not found
                os.remove(filepath)
                return jsonify({'error': 'Event not found'}), 404

            # Remove old uploaded image if exists
            if event.get('uploaded_image'):
                old_path = os.path.join(
                    current_app.config['UPLOAD_FOLDER'], event['uploaded_image'])
                if os.path.exists(old_path):
                    os.remove(old_path)
                    current_app.logger.info(f"Removed old image: {old_path}")

            # Update event with new image
            event['uploaded_image'] = filename
            event['updated_at'] = datetime.utcnow().isoformat()

            if save_events(events):
                image_url = get_event_image_url(event)
                current_app.logger.info(
                    f"Image uploaded for event {event_id}: {filename}")
                return jsonify({
                    'success': True,
                    'filename': filename,
                    'image_url': image_url
                }), 200
            else:
                # Clean up if save failed
                os.remove(filepath)
                return jsonify({'error': 'Failed to save event'}), 500

        except Exception as e:
            current_app.logger.error(
                f"Error uploading image for event {event_id}: {str(e)}")
            return jsonify({'error': 'Failed to upload image'}), 500

    allowed_types = ", ".join(current_app.config['ALLOWED_EXTENSIONS'])
    return jsonify({
        'error': f'Invalid file type. Allowed: {allowed_types}'
    }), 400


@events_bp.route('/events/<int:event_id>/remove-image', methods=['POST'])
@auth_required
def remove_event_image(event_id):
    """Remove uploaded image for an event (admin only)"""
    if event_id < 1 or event_id > 4:
        return jsonify({'error': 'Event ID must be between 1 and 4'}), 400

    try:
        events = load_events()
        event = next((e for e in events if e.get('id') == event_id), None)

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Remove uploaded image file if exists
        if event.get('uploaded_image'):
            old_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'], event['uploaded_image'])
            if os.path.exists(old_path):
                os.remove(old_path)
                current_app.logger.info(f"Removed image: {old_path}")
            event['uploaded_image'] = ''

        event['updated_at'] = datetime.utcnow().isoformat()

        if save_events(events):
            event['display_image_url'] = get_event_image_url(event)
            current_app.logger.info(f"Image removed from event {event_id}")
            return jsonify({
                'success': True,
                'event': event
            }), 200
        else:
            return jsonify({'error': 'Failed to save event'}), 500

    except Exception as e:
        current_app.logger.error(
            f"Error removing image from event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to remove image'}), 500


# Helper functions that need to be imported from app
def load_events():
    """Import load_events from app module"""
    from app import load_events as _load_events
    return _load_events()


def save_events(events):
    """Import save_events from app module"""
    from app import save_events as _save_events
    return _save_events(events)


def get_event_image_url(event):
    """Import get_event_image_url from app module"""
    from app import get_event_image_url as _get_event_image_url
    return _get_event_image_url(event)


def allowed_file(filename):
    """Import allowed_file from app module"""
    from app import allowed_file as _allowed_file
    return _allowed_file(filename)
