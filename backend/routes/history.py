from flask import Blueprint, jsonify, request
from services.db_service import DatabaseService

history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
def get_history():
    try:
        db_service = DatabaseService()
        history = db_service.get_all_analyses()
        return jsonify(history), 200
    except Exception as e:
        print(f"Error fetching history: {str(e)}")
        return jsonify({'error': f'Failed to fetch history: {str(e)}'}), 500

@history_bp.route('/history/<id>', methods=['DELETE'])
def delete_history(id):
    try:
        db_service = DatabaseService()
        success = db_service.delete_analysis(id)
        if success:
            return jsonify({'message': 'Analysis deleted successfully'}), 200
        else:
            return jsonify({'error': 'Analysis not found'}), 404
    except Exception as e:
        print(f"Error deleting history: {str(e)}")
        return jsonify({'error': f'Failed to delete history: {str(e)}'}), 500

