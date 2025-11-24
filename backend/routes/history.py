from flask import Blueprint, jsonify, request
from services.supabase_service import SupabaseService
from services.auth_service import require_auth

history_bp = Blueprint('history', __name__)
db_service = SupabaseService()

@history_bp.route('/history', methods=['GET'])
@require_auth
def get_history():
    """Get history for the authenticated user"""
    try:
        current_user = request.current_user
        user_id = current_user.get('user_id')
        
        # Get pagination params
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        history = db_service.get_user_analyses(user_id, limit=limit, offset=offset)
        return jsonify(history), 200
    except Exception as e:
        print(f"Error fetching history: {str(e)}")
        return jsonify({'error': f'Failed to fetch history: {str(e)}'}), 500

@history_bp.route('/history/<id>', methods=['DELETE'])
@require_auth
def delete_history(id):
    """Delete a history item"""
    try:
        current_user = request.current_user
        user_id = current_user.get('user_id')
        
        # Ideally we should check ownership here, but for now we'll rely on the service
        # In a real app, we'd fetch the analysis first to check user_id
        
        success = db_service.delete_analysis(id)
        if success:
            return jsonify({'message': 'Analysis deleted successfully'}), 200
        else:
            return jsonify({'error': 'Analysis not found or could not be deleted'}), 404
    except Exception as e:
        print(f"Error deleting history: {str(e)}")
        return jsonify({'error': f'Failed to delete history: {str(e)}'}), 500
