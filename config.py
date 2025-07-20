import os


class Config:
    # CORS Origins - Environment variable or default
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS',
                                  'http://localhost:3000,https://kosge.netlify.app,https://kosge-frontend.netlify.app'
                                  ).split(',')

    # Admin credentials
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH',
                                         '$2b$12$ZCgWXzUdmVX.PnIfj4oeJOkX69Tu1rVZ51zGYe3kSloANnwMaTlBW'
                                         )

    # JWT Configuration
    JWT_SECRET = os.environ.get('JWT_SECRET')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '8'))

    # File upload settings
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', '16777216'))  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    # Data files
    EVENTS_FILE = os.environ.get('EVENTS_FILE', 'data/events.json')
    PARTICIPANTS_FILE = os.environ.get(
        'PARTICIPANTS_FILE', 'data/participants.json')
