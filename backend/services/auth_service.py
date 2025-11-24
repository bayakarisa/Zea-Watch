"""
Authentication Service
Handles JWT tokens, password hashing, and authentication helpers
"""
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from flask import request, jsonify, current_app
from functools import wraps


# ---------------------------------------------------------------------
# AUTH SERVICE CLASS
# ---------------------------------------------------------------------
class AuthService:
    """Service for authentication operations"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception:
            return False

    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, str]:
        """Validate password meets strength requirements"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        if not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        if not any(c.isdigit() for c in password):
            return False, "Password must contain at least one number"
        return True, ""

    @staticmethod
    def generate_access_token(user_id: str, email: str, role: str = 'user') -> str:
        """Generate JWT access token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'role': role,
            'type': 'access',
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    @staticmethod
    def generate_refresh_token(user_id: str) -> str:
        """Generate JWT refresh token"""
        payload = {
            'user_id': user_id,
            'type': 'refresh',
            'exp': datetime.utcnow() + timedelta(days=30),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    @staticmethod
    def verify_token(token: str, expected_type: str = 'access') -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )

            if expected_type and payload.get('type') != expected_type:
                return None

            return payload

        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None


# ---------------------------------------------------------------------
# HELPER FUNCTIONS (COOKIE + AUTH DECORATORS)
# ---------------------------------------------------------------------
def set_refresh_cookie(response, refresh_token: str):
    """Set refresh token as HTTP-only cookie"""
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=current_app.config.get('SESSION_COOKIE_SECURE', False),
        samesite='Lax',
        max_age=30 * 24 * 60 * 60  # 30 days
    )


def get_refresh_token_from_request() -> Optional[str]:
    """Get refresh token from cookie or Authorization header"""
    token = request.cookies.get('refresh_token')
    if token:
        return token

    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]

    return None


# ---------------------------------------------------------------------
# AUTH REQUIRED DECORATOR
# ---------------------------------------------------------------------
def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'code': 'NO_TOKEN',
                'message': 'Authorization token required'
            }), 401

        token = auth_header.split(' ')[1]

        auth_service = AuthService()
        payload = auth_service.verify_token(token, expected_type='access')

        if not payload:
            return jsonify({
                'code': 'INVALID_TOKEN',
                'message': 'Invalid or expired token'
            }), 401

        request.current_user = payload

        return f(*args, **kwargs)

    return decorated_function


# ---------------------------------------------------------------------
# ADMIN REQUIRED
# ---------------------------------------------------------------------
def require_admin(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'code': 'NO_TOKEN',
                'message': 'Authorization token required'
            }), 401

        token = auth_header.split(' ')[1]

        auth_service = AuthService()
        payload = auth_service.verify_token(token, expected_type='access')

        if not payload:
            return jsonify({
                'code': 'INVALID_TOKEN',
                'message': 'Invalid or expired token'
            }), 401

        if payload.get('role') != 'admin':
            return jsonify({
                'code': 'FORBIDDEN',
                'message': 'Admin access required'
            }), 403

        request.current_user = payload

        return f(*args, **kwargs)

    return decorated_function


# ---------------------------------------------------------------------
# PREMIUM SUBSCRIPTION REQUIRED
# ---------------------------------------------------------------------
def require_premium(f):
    """Decorator to require premium subscription"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'code': 'NO_TOKEN',
                'message': 'Authorization token required'
            }), 401

        token = auth_header.split(' ')[1]

        auth_service = AuthService()
        payload = auth_service.verify_token(token, expected_type='access')

        if not payload:
            return jsonify({
                'code': 'INVALID_TOKEN',
                'message': 'Invalid or expired token'
            }), 401

        request.current_user = payload

        return f(*args, **kwargs)

    return decorated_function


# ---------------------------------------------------------------------
# UNIVERSAL TOKEN DECODER (used in your /analyze route)
# ---------------------------------------------------------------------
def decode_token(token: str) -> Optional[Dict]:
    """Decode and validate JWT token (standalone function)"""
    auth_service = AuthService()
    return auth_service.verify_token(token)
