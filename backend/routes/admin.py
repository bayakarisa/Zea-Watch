"""
Admin Routes
Handles admin-only operations: user management, predictions view, stats
"""
from flask import Blueprint, request, jsonify
from services.supabase_service import SupabaseService
from services.auth_service import require_admin
import csv
from io import StringIO

admin_bp = Blueprint('admin', __name__)
db_service = SupabaseService()


@admin_bp.route('/admin/users', methods=['GET'])
@require_admin
def get_users():
    """Get all users with filters"""
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        filters = {}
        if request.args.get('email'):
            filters['email'] = request.args.get('email')
        if request.args.get('verified'):
            filters['verified'] = request.args.get('verified').lower() == 'true'
        if request.args.get('subscription_tier'):
            filters['subscription_tier'] = request.args.get('subscription_tier')
        
        users = db_service.get_all_users(limit=limit, offset=offset, filters=filters)
        
        # Log audit
        db_service.create_audit_log(
            user_id=request.current_user['user_id'],
            action='admin_view_users',
            details={'filters': filters},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'users': users,
            'count': len(users)
        }), 200
    
    except Exception as e:
        print(f"Admin get users error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to fetch users'
        }), 500


@admin_bp.route('/admin/predictions', methods=['GET'])
@require_admin
def get_predictions():
    """Get all predictions with filters"""
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        filters = {}
        if request.args.get('user_id'):
            filters['user_id'] = request.args.get('user_id')
        if request.args.get('label'):
            filters['label'] = request.args.get('label')
        
        predictions = db_service.get_all_predictions(limit=limit, offset=offset, filters=filters)
        
        # Log audit
        db_service.create_audit_log(
            user_id=request.current_user['user_id'],
            action='admin_view_predictions',
            details={'filters': filters},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'predictions': predictions,
            'count': len(predictions)
        }), 200
    
    except Exception as e:
        print(f"Admin get predictions error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to fetch predictions'
        }), 500


@admin_bp.route('/admin/predictions/export', methods=['GET'])
@require_admin
def export_predictions():
    """Export predictions as CSV"""
    try:
        filters = {}
        if request.args.get('user_id'):
            filters['user_id'] = request.args.get('user_id')
        if request.args.get('label'):
            filters['label'] = request.args.get('label')
        
        predictions = db_service.get_all_predictions(limit=10000, offset=0, filters=filters)
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['ID', 'User ID', 'Label', 'Confidence', 'Model Version', 'Created At', 'Image URL'])
        
        # Data
        for pred in predictions:
            writer.writerow([
                pred.get('id'),
                pred.get('user_id'),
                pred.get('label'),
                pred.get('confidence'),
                pred.get('model_version'),
                pred.get('created_at'),
                pred.get('image_url')
            ])
        
        # Log audit
        db_service.create_audit_log(
            user_id=request.current_user['user_id'],
            action='admin_export_predictions',
            details={'count': len(predictions)},
            ip_address=request.remote_addr
        )
        
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=predictions.csv'}
        )
    
    except Exception as e:
        print(f"Admin export predictions error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to export predictions'
        }), 500


@admin_bp.route('/admin/stats', methods=['GET'])
@require_admin
def get_stats():
    """Get admin statistics"""
    try:
        stats = db_service.get_admin_stats()
        
        # Log audit
        db_service.create_audit_log(
            user_id=request.current_user['user_id'],
            action='admin_view_stats',
            ip_address=request.remote_addr
        )
        
        return jsonify(stats), 200
    
    except Exception as e:
        print(f"Admin get stats error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to fetch stats'
        }), 500


@admin_bp.route('/admin/users/<user_id>/subscription', methods=['POST'])
@require_admin
def update_user_subscription(user_id):
    """Update user subscription (admin)"""
    try:
        data = request.get_json()
        tier = data.get('tier')
        
        if tier not in ['free', 'premium1', 'premium2']:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid subscription tier'
            }), 400
        
        # Update user subscription
        user = db_service.update_user(user_id, subscription_tier=tier)
        
        if not user:
            return jsonify({
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }), 404
        
        # Log audit
        db_service.create_audit_log(
            user_id=request.current_user['user_id'],
            action='admin_update_subscription',
            details={'target_user_id': user_id, 'tier': tier},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': 'Subscription updated',
            'user': {
                'id': str(user['id']),
                'subscription_tier': user['subscription_tier']
            }
        }), 200
    
    except Exception as e:
        print(f"Admin update subscription error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to update subscription'
        }), 500


@admin_bp.route('/admin/impersonate/<user_id>', methods=['POST'])
@require_admin
def impersonate_user(user_id):
    """Impersonate user for debugging (optional)"""
    try:
        user = db_service.get_user_by_id(user_id)
        
        if not user:
            return jsonify({
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }), 404
        
        # Log audit
        db_service.create_audit_log(
            user_id=request.current_user['user_id'],
            action='admin_impersonate',
            details={'target_user_id': user_id},
            ip_address=request.remote_addr
        )
        
        # Generate token for impersonated user
        from services.auth_service import AuthService
        auth_service = AuthService()
        access_token = auth_service.generate_access_token(
            str(user['id']),
            user['email'],
            user['role']
        )
        
        return jsonify({
            'message': 'Impersonation token generated',
            'access_token': access_token,
            'user': {
                'id': str(user['id']),
                'name': user['name'],
                'email': user['email']
            }
        }), 200
    
    except Exception as e:
        print(f"Admin impersonate error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to impersonate user'
        }), 500


