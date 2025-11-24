"""
Authentication Routes
Handles registration, login, email verification, password reset
"""
from flask import Blueprint, request, jsonify, make_response, current_app
from flask_limiter.util import get_remote_address
import re
import secrets
from datetime import datetime
# use the helpers from services.auth_service
from services.auth_service import (
    AuthService,
    set_refresh_cookie,
    get_refresh_token_from_request,
    require_auth as require_auth_decorator
)
from services.supabase_service import SupabaseService
from services.email_service import EmailService

auth_bp = Blueprint('auth', __name__)

# Rate limiter will be set from app.py
limiter = None

def set_limiter(limiter_instance):
    """Set rate limiter instance"""
    global limiter
    limiter = limiter_instance

def apply_rate_limit(limit_str):
    """Apply rate limit decorator if limiter is available"""
    if limiter:
        return limiter.limit(limit_str, key_func=get_remote_address)
    return lambda f: f

# Use AuthService instance
auth_service = AuthService()
db_service = SupabaseService()
email_service = EmailService()


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@auth_bp.route('/auth/register', methods=['POST'])
@apply_rate_limit("5 per minute")
def register():
    """Register a new user"""
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        preferred_language = data.get('preferredLanguage') or 'en'
        
        # Validation
        if not name or not email or not password:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Name, email, and password are required'
            }), 400
        
        if not validate_email(email):
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid email format'
            }), 400
        
        is_valid, error_msg = auth_service.validate_password_strength(password)
        if not is_valid:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': error_msg
            }), 400
        
        if preferred_language not in ['en', 'sw']:
            preferred_language = 'en'
        
        # Check if user exists (using optimized helper)
        if db_service.email_exists(email):
            return jsonify({
                'code': 'USER_EXISTS',
                'message': 'Email already registered'
            }), 409
        
        # Hash password
        password_hash = auth_service.hash_password(password)
        
        # Create user profile record
        user = db_service.create_user(
            name=name,
            email=email,
            password_hash=password_hash,
            preferred_language=preferred_language
        )
        
        if not user:
            return jsonify({
                'code': 'REGISTRATION_FAILED',
                'message': 'Failed to create user'
            }), 500
        
        # Automatically mark user as verified (email verification temporarily disabled)
        db_service.update_user(str(user['id']), verified=True)
        user['verified'] = True
        
        # Log audit
        db_service.create_audit_log(
            user_id=str(user['id']),
            action='user_registered',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'message': 'Registration successful. You can now log in.',
            'user': {
                'id': str(user['id']),
                'name': user['name'],
                'email': user['email'],
                'verified': user['verified']
            }
        }), 201
    
    except ValueError as e:
        return jsonify({
            'code': 'VALIDATION_ERROR',
            'message': str(e)
        }), 400
    except Exception as e:
        current_app.logger.exception("Registration error")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Registration failed'
        }), 500


@auth_bp.route('/auth/verify', methods=['GET'])
def verify_email():
    """Verify email address"""
    token = request.args.get('token')
    
    if not token:
        return jsonify({
            'code': 'MISSING_TOKEN',
            'message': 'Verification token is required'
        }), 400
    
    user_id = db_service.verify_token(token)
    
    if not user_id:
        return jsonify({
            'code': 'INVALID_TOKEN',
            'message': 'Invalid or expired verification token'
        }), 400
    
    # Update user verified status
    user = db_service.update_user(user_id, verified=True)
    
    if user:
        db_service.create_audit_log(
            user_id=user_id,
            action='email_verified',
            ip_address=request.remote_addr
        )
        
        # Return HTML success page
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Email Verified - ZeaWatch</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: green; font-size: 24px; }
            </style>
        </head>
        <body>
            <div class="success">✓ Email verified successfully!</div>
            <p>You can now log in to your account.</p>
            <p><a href="/signin">Go to Login</a></p>
        </body>
        </html>
        """
        return make_response(html, 200)
    
    return jsonify({
        'code': 'VERIFICATION_FAILED',
        'message': 'Failed to verify email'
    }), 500


@auth_bp.route('/auth/login', methods=['POST'])
@apply_rate_limit("10 per minute")
def login():
    """Login user"""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        
        if not email or not password:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Email and password are required'
            }), 400
        
        # Get user (use get_user_for_auth to include password_hash)
        user = db_service.get_user_for_auth(email)
        if not user:
            return jsonify({
                'code': 'INVALID_CREDENTIALS',
                'message': 'Invalid email or password'
            }), 401
        
        # Verify password
        if not auth_service.verify_password(password, user.get('password_hash', '')):
            db_service.create_audit_log(
                user_id=str(user.get('id')),
                action='login_failed',
                details={'reason': 'invalid_password'},
                ip_address=request.remote_addr
            )
            return jsonify({
                'code': 'INVALID_CREDENTIALS',
                'message': 'Invalid email or password'
            }), 401
        
        # Generate tokens
        access_token = auth_service.generate_access_token(
            str(user['id']),
            user['email'],
            user.get('role', 'user')
        )
        refresh_token = auth_service.generate_refresh_token(str(user['id']))
        
        # Update last login (use helper)
        db_service.update_last_login(str(user['id']))
        
        # Log audit
        db_service.create_audit_log(
            user_id=str(user['id']),
            action='login_success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # Create response with HTTP-only cookie for refresh token
        response = jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': str(user['id']),
                'name': user.get('name'),
                'email': user['email'],
                'role': user.get('role', 'user'),
                'verified': user.get('verified', False),
                'preferred_language': user.get('preferred_language'),
                'subscription_tier': user.get('subscription_tier')
            }
        })
        
        # Set refresh token as HTTP-only cookie
        set_refresh_cookie(response, refresh_token)
        
        return response, 200
    
    except Exception as e:
        current_app.logger.exception("Login error")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Login failed'
        }), 500


@auth_bp.route('/auth/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token"""
    try:
        token = get_refresh_token_from_request()
        if not token:
            return jsonify({
                'code': 'NO_TOKEN',
                'message': 'Refresh token required'
            }), 401

        # verify refresh token explicitly
        payload = auth_service.verify_token(token, expected_type='refresh')
        if not payload:
            return jsonify({
                'code': 'INVALID_TOKEN',
                'message': 'Invalid or expired refresh token'
            }), 401

        user_id = payload.get('user_id')
        user = db_service.get_user_by_id(user_id)

        if not user:
            return jsonify({
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }), 404

        # Issue new tokens (rotate)
        new_access = auth_service.generate_access_token(str(user['id']), user['email'], user.get('role', 'user'))
        new_refresh = auth_service.generate_refresh_token(str(user['id']))

        response = jsonify({'access_token': new_access})
        set_refresh_cookie(response, new_refresh)
        return response, 200

    except Exception:
        current_app.logger.exception("Refresh token error")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to refresh token'
        }), 500


@auth_bp.route('/auth/forgot', methods=['POST'])
@apply_rate_limit("3 per hour")
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        
        if not email:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Email is required'
            }), 400
        
        user = db_service.get_user_by_email(email)
        if user:
            # Generate reset token
            token = secrets.token_urlsafe(32)
            db_service.create_password_reset_token(str(user['id']), token)
            
            # Send reset email
            email_service.send_password_reset_email(email, user.get('name'), token)
        
        # Always return success (don't reveal if email exists)
        return jsonify({
            'message': 'If the email exists, a password reset link has been sent'
        }), 200
    
    except Exception as e:
        current_app.logger.exception("Forgot password error")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to process request'
        }), 500


@auth_bp.route('/auth/reset', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json() or {}
        token = data.get('token')
        new_password = data.get('password') or ''
        
        if not token or not new_password:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Token and password are required'
            }), 400
        
        # Validate password strength
        is_valid, error_msg = auth_service.validate_password_strength(new_password)
        if not is_valid:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': error_msg
            }), 400
        
        # Verify token
        user_id = db_service.verify_password_reset_token(token)
        if not user_id:
            return jsonify({
                'code': 'INVALID_TOKEN',
                'message': 'Invalid or expired reset token'
            }), 400
        
        # Update password
        password_hash = auth_service.hash_password(new_password)
        db_service.update_user(user_id, password_hash=password_hash)
        
        # Mark token as used
        db_service.mark_password_reset_token_used(token)
        
        # Log audit
        db_service.create_audit_log(
            user_id=user_id,
            action='password_reset',
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': 'Password reset successful'
        }), 200
    
    except Exception as e:
        current_app.logger.exception("Reset password error")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to reset password'
        }), 500


@auth_bp.route('/auth/me', methods=['GET'])
@require_auth_decorator
def get_current_user():
    """Get current authenticated user"""
    user_id = request.current_user['user_id']
    user = db_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({
            'code': 'USER_NOT_FOUND',
            'message': 'User not found'
        }), 404
    
    # Get subscription
    subscription = db_service.get_user_subscription(user_id)
    
    return jsonify({
        'user': {
            'id': str(user['id']),
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'verified': user['verified'],
            'preferred_language': user['preferred_language'],
            'subscription_tier': user['subscription_tier'],
            'subscription': subscription
        }
    }), 200
