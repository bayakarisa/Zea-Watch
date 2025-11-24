from flask import Blueprint, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename
from PIL import Image
import io
import numpy as np
import jwt

# Import services
from services.hybrid_model import HybridModel
from services.gemini_service import GeminiService
from services.supabase_service import SupabaseService
from services.confidence_service import ConfidenceService

predict_bp = Blueprint('predict', __name__)

confidence_service = ConfidenceService()
db_service = SupabaseService()

# Allowed file types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# -----------------------------------------------------------------------------
# 🔐 OPTIONAL Supabase Authentication
# -----------------------------------------------------------------------------
from services.auth_service import AuthService

def get_user_id_from_token():
    """
    Optional authentication using AuthService.
    If Authorization: Bearer <token> is provided AND token is valid → return user_id.
    Otherwise return None (guest mode).
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    
    # Use AuthService to verify the token
    auth_service = AuthService()
    payload = auth_service.verify_token(token, expected_type='access')
    
    if payload:
        return payload.get('sub') or payload.get('user_id')
    return None


# -----------------------------------------------------------------------------
# 📸 Image analysis endpoint
# -----------------------------------------------------------------------------
@predict_bp.route('/analyze', methods=['POST'])
def analyze():
    """
    Handle image upload and perform AI-based analysis.
    Guests allowed. If JWT is provided and valid → attach user_id.
    """
    # -----------------------------------------------------
    # 🔐 Optional Auth
    # -----------------------------------------------------
    user_id = get_user_id_from_token()
    if user_id:
        print(f"🔐 Authenticated user: {user_id}")
    else:
        print("🟡 Guest user (no authentication)")

    # -----------------------------------------------------
    # 📸 Get Image
    # -----------------------------------------------------
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, GIF, WEBP'}), 400

    try:
        # Load image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')

        gemini_service = GeminiService()

        # -----------------------------------------------------
        # 🔍 Step 1: Validate image is maize leaf
        # -----------------------------------------------------
        is_valid, validation_message = gemini_service.validate_maize_leaf(image)
        if not is_valid:
            return jsonify({'error': validation_message}), 400

        # -----------------------------------------------------
        # 🧠 Step 2: AI prediction
        # -----------------------------------------------------
        model = HybridModel()
        disease, raw_confidence = model.predict(image)

        raw_scores = {
            'confidence': float(raw_confidence),
            'model_output': 'hybrid_cnn_vit'
        }

        normalized_confidence = confidence_service.validate_confidence(raw_confidence)

        # -----------------------------------------------------
        # 💡 Step 3: AI description (Gemini)
        # -----------------------------------------------------
        description, recommendation = gemini_service.get_insights(
            disease,
            normalized_confidence,
            image
        )

        # -----------------------------------------------------
        # 💾 Step 4: Save image + prediction
        # -----------------------------------------------------
        filename = secure_filename(file.filename)
        upload_folder = current_app.config.get('UPLOAD_FOLDER', './static/uploads')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        image.save(filepath)
        
        # Use absolute URL for the image so it works on the frontend (different port)
        base_url = request.host_url.rstrip('/')
        image_url = f'{base_url}/static/uploads/{filename}'

        model_version = os.getenv('MODEL_VERSION', '1.0.0')

        result = db_service.save_prediction(
            user_id=user_id,  # <-- authenticated users saved; guest = None
            image_url=image_url,
            label=disease,
            confidence=normalized_confidence,
            raw_scores=raw_scores,
            model_version=model_version,
            description=description,
            recommendation=recommendation
        )

        # -----------------------------------------------------
        # ✅ Step 5: Return response
        # -----------------------------------------------------
        return jsonify({
            'id': str(result.get('id', '')),
            'disease': disease,
            'confidence': normalized_confidence,
            'confidence_display': confidence_service.format_confidence_for_display(normalized_confidence),
            'description': description,
            'recommendation': recommendation,
            'image_url': image_url,
            'created_at': result.get('created_at'),
            'user_id': user_id or "guest"
        }), 200

    except Exception as e:
        import traceback
        print("❌ Error analyzing image:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': f"Failed to analyze image: {str(e)}"}), 500
