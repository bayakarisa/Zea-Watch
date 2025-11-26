"""
Recommendations Routes
Manage personalized recommendations for users
"""
from flask import Blueprint, request, jsonify
from services.supabase_service import SupabaseService
from services.auth_service import require_auth, require_admin
import json

recommendations_bp = Blueprint('recommendations', __name__)
db_service = SupabaseService()


def _parse_pagination():
    try:
        limit = min(int(request.args.get('limit', 25)), 100)
    except ValueError:
        limit = 25
    try:
        offset = max(int(request.args.get('offset', 0)), 0)
    except ValueError:
        offset = 0
    return limit, offset


@recommendations_bp.route('', methods=['GET'])
@require_auth
def list_my_recommendations():
    """Get recommendations for current user"""
    user_id = request.current_user['user_id']
    limit, offset = _parse_pagination()
    recs = db_service.get_user_recommendations(user_id, limit=limit, offset=offset)
    return jsonify({'recommendations': recs, 'count': len(recs)}), 200


@recommendations_bp.route('/users/<user_id>/recommendations', methods=['GET'])
@require_auth
def list_user_recommendations(user_id: str):
    """Owner or admin can view recommendations for a user"""
    caller = request.current_user
    if caller.get('role') != 'admin' and caller.get('user_id') != user_id:
        return jsonify({'code': 'FORBIDDEN', 'message': 'Access denied'}), 403

    limit, offset = _parse_pagination()
    recs = db_service.get_user_recommendations(user_id, limit=limit, offset=offset)
    return jsonify({'recommendations': recs, 'count': len(recs)}), 200


@recommendations_bp.route('', methods=['POST'])
@require_admin
def create_recommendation():
    """Admins can create recommendations for any user"""
    data = request.get_json() or {}
    user_id = data.get('user_id')
    recommendation_type = data.get('type')
    content = data.get('content')
    summary = data.get('summary')
    score = data.get('score')

    if not user_id or not recommendation_type:
        return jsonify({'code': 'VALIDATION_ERROR', 'message': 'user_id and type are required'}), 400

    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            content = {'text': content}

    record = db_service.create_recommendation(
        user_id=user_id,
        recommendation_type=recommendation_type,
        content=content,
        summary=summary,
        score=score
    )
    return jsonify({'recommendation': record}), 201


@recommendations_bp.route('/<rec_id>', methods=['DELETE'])
@require_admin
def delete_recommendation(rec_id: str):
    """Delete recommendation (admin only)"""
    if not db_service.delete_recommendation(rec_id):
        return jsonify({'code': 'DELETE_FAILED', 'message': 'Failed to delete recommendation'}), 500
    return jsonify({'message': 'Recommendation deleted'}), 200


@recommendations_bp.route('/admin/recommendations', methods=['GET'])
@require_admin
def admin_list_recommendations():
    """List recommendations for admin diagnostics"""
    limit, offset = _parse_pagination()
    user_id = request.args.get('user_id')
    recs = db_service.get_all_recommendations(limit=limit, offset=offset, user_id=user_id)
    return jsonify({'recommendations': recs, 'count': len(recs)}), 200

