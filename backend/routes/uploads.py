"""
Uploads Routes
Handles user uploads listing/creation/deletion
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.supabase_service import SupabaseService
from services.auth_service import require_auth, require_admin
import os
import uuid
import json

uploads_bp = Blueprint('uploads', __name__)
db_service = SupabaseService()


def _parse_pagination():
    """Utility to parse limit/offset query params with sane defaults"""
    try:
        limit = min(int(request.args.get('limit', 25)), 100)
    except ValueError:
        limit = 25
    try:
        offset = max(int(request.args.get('offset', 0)), 0)
    except ValueError:
        offset = 0
    return limit, offset


@uploads_bp.route('', methods=['GET'])
@require_auth
def list_my_uploads():
    """Return uploads belonging to the authenticated user"""
    current_user = request.current_user
    limit, offset = _parse_pagination()
    uploads = db_service.get_user_uploads(current_user['user_id'], limit=limit, offset=offset)
    return jsonify({'uploads': uploads, 'count': len(uploads)}), 200


@uploads_bp.route('', methods=['POST'])
@require_auth
def create_upload():
    """Upload a file and create metadata record"""
    if 'file' not in request.files:
        return jsonify({'code': 'NO_FILE', 'message': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'code': 'EMPTY_FILENAME', 'message': 'Filename is empty'}), 400

    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({'code': 'INVALID_FILENAME', 'message': 'Invalid filename'}), 400

    try:
        upload_folder = current_app.config.get('UPLOAD_FOLDER', './static/uploads')
        os.makedirs(upload_folder, exist_ok=True)

        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(upload_folder, unique_name)
        file.save(file_path)

        public_path = f"/static/uploads/{unique_name}"
        metadata_raw = request.form.get('metadata')
        metadata = {}
        if metadata_raw:
            try:
                metadata = json.loads(metadata_raw)
            except json.JSONDecodeError:
                return jsonify({'code': 'INVALID_METADATA', 'message': 'Metadata must be valid JSON'}), 400

        record = db_service.create_upload(
            user_id=request.current_user['user_id'],
            filename=filename,
            storage_path=public_path,
            file_size=os.path.getsize(file_path),
            mime_type=file.mimetype,
            metadata=metadata
        )

        return jsonify({'upload': record}), 201
    except Exception as e:
        print(f"Error in create_upload: {e}")
        return jsonify({'code': 'UPLOAD_FAILED', 'message': str(e)}), 500


@uploads_bp.route('/<upload_id>', methods=['DELETE'])
@require_auth
def delete_upload(upload_id: str):
    """Delete upload if owned by user (or caller is admin)"""
    upload = db_service.get_upload_by_id(upload_id)
    if not upload:
        return jsonify({'code': 'NOT_FOUND', 'message': 'Upload not found'}), 404

    current_user = request.current_user
    if current_user.get('role') != 'admin' and upload.get('user_id') != current_user.get('user_id'):
        return jsonify({'code': 'FORBIDDEN', 'message': 'You cannot delete this upload'}), 403

    # Delete DB record first
    if not db_service.delete_upload(upload_id):
        return jsonify({'code': 'DELETE_FAILED', 'message': 'Failed to delete upload'}), 500

    # Delete file from disk if it exists
    storage_path = upload.get('storage_path')
    if storage_path:
        local_path = storage_path
        if storage_path.startswith('/'):
            local_path = storage_path.lstrip('/')
        abs_path = os.path.join(current_app.root_path, local_path)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except OSError:
                pass

    return jsonify({'message': 'Upload deleted'}), 200


@uploads_bp.route('/users/<user_id>/uploads', methods=['GET'])
@require_auth
def get_user_uploads(user_id: str):
    """Allow owning user or admin to fetch uploads for a specific user id"""
    caller = request.current_user
    if caller.get('role') != 'admin' and caller.get('user_id') != user_id:
        return jsonify({'code': 'FORBIDDEN', 'message': 'Access denied'}), 403

    limit, offset = _parse_pagination()
    uploads = db_service.get_user_uploads(user_id, limit=limit, offset=offset)
    return jsonify({'uploads': uploads, 'count': len(uploads)}), 200


@uploads_bp.route('/admin/uploads', methods=['GET'])
@require_admin
def admin_list_uploads():
    """List uploads for admin visibility"""
    limit, offset = _parse_pagination()
    user_id = request.args.get('user_id')
    uploads = db_service.get_all_uploads(limit=limit, offset=offset, user_id=user_id)
    return jsonify({'uploads': uploads, 'count': len(uploads)}), 200

