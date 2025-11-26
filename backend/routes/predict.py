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

# Initialize model ONCE when the blueprint loads (not on every request)
# This saves 2-3 seconds per request!
print("Initializing HybridModel...")
model = HybridModel()
print("HybridModel ready for predictions")

# Allowed file types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# -----------------------------------------------------------------------------
# OPTIONAL Supabase Authentication
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
# Image analysis endpoint
# -----------------------------------------------------------------------------
@predict_bp.route('/analyze', methods=['POST'])
def analyze():
    """
    Handle image upload and perform AI-based analysis.
    Guests allowed. If JWT is provided and valid → attach user_id.
    """
    # -----------------------------------------------------
    # Optional Auth
    # -----------------------------------------------------
    user_id = get_user_id_from_token()
    if user_id:
        print(f"Authenticated user: {user_id}")
    else:
        print("Guest user (no authentication)")

    # -----------------------------------------------------
    # Get Image
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
        # Step 1: Validate image is maize leaf
        # -----------------------------------------------------
        is_valid, validation_message = gemini_service.validate_maize_leaf(image)
        if not is_valid:
            return jsonify({'error': validation_message}), 400

        # -----------------------------------------------------
        # Step 2: AI prediction (using pre-loaded global model)
        # -----------------------------------------------------
        # Use the predict_with_probabilities method for detailed results
        prediction_result = model.predict_with_probabilities(image)
        
        disease = prediction_result['disease']
        raw_confidence = prediction_result['confidence']
        all_probabilities = prediction_result['all_probabilities']
        confidence_level = prediction_result['confidence_level']
        model_accuracy = prediction_result['model_accuracy']

        # Store raw scores for database
        raw_scores = {
            'confidence': float(raw_confidence),
            'all_probabilities': all_probabilities,
            'confidence_level': confidence_level,
            'model_output': 'hybrid_cnn_vit',
            'model_accuracy': model_accuracy
        }

        # Normalize confidence using your confidence service
        normalized_confidence = confidence_service.validate_confidence(raw_confidence)

        # -----------------------------------------------------
        # Step 3: AI description (Gemini)
        # -----------------------------------------------------
        description, recommendation = gemini_service.get_insights(
            disease,
            normalized_confidence,
            image
        )

        # -----------------------------------------------------
        # Step 4: Save image + prediction
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

        # Get treatment recommendations from model
        treatment = model.get_treatment_recommendation(disease)

        # -----------------------------------------------------
        # Step 5: Return enhanced response
        # -----------------------------------------------------
        return jsonify({
            'id': str(result.get('id', '')),
            'disease': disease,
            'confidence': normalized_confidence,
            'confidence_level': confidence_level,
            'confidence_display': confidence_service.format_confidence_for_display(normalized_confidence),
            'all_probabilities': all_probabilities,
            'description': description,
            'recommendation': recommendation,
            'treatment': treatment,
            'image_url': image_url,
            'created_at': result.get('created_at'),
            'user_id': user_id or "guest",
            'model_info': {
                'version': model_version,
                'accuracy': model_accuracy,
                'type': 'Hybrid CNN + Vision Transformer'
            }
        }), 200

    except Exception as e:
        import traceback
        print("Error analyzing image:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': f"Failed to analyze image: {str(e)}"}), 500


# -----------------------------------------------------------------------------
# Health check endpoint
# -----------------------------------------------------------------------------
@predict_bp.route('/predict/health', methods=['GET'])
def health_check():
    """Check if the model is loaded and ready"""
    try:
        # Try a simple prediction to verify model is working
        test_image = Image.new('RGB', (224, 224), color='green')
        disease, confidence = model.predict(test_image)
        
        return jsonify({
            'status': 'healthy',
            'model_loaded': True,
            'device': str(model.device),
            'classes': model.disease_classes,
            'test_prediction': {
                'disease': disease,
                'confidence': confidence
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'model_loaded': False,
            'error': str(e)
        }), 500


# -----------------------------------------------------------------------------
# Batch prediction endpoint (optional - for testing multiple images)
# -----------------------------------------------------------------------------
@predict_bp.route('/predict/batch', methods=['POST'])
def batch_predict():
    """
    Handle multiple image uploads for batch prediction
    Useful for testing or admin purposes
    """
    user_id = get_user_id_from_token()
    
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    
    if len(files) == 0:
        return jsonify({'error': 'No files selected'}), 400
    
    results = []
    
    for file in files:
        if not allowed_file(file.filename):
            results.append({
                'filename': file.filename,
                'error': 'Invalid file type'
            })
            continue
        
        try:
            # Load and predict
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Get prediction with probabilities
            prediction_result = model.predict_with_probabilities(image)
            
            results.append({
                'filename': file.filename,
                'disease': prediction_result['disease'],
                'confidence': prediction_result['confidence'],
                'confidence_level': prediction_result['confidence_level'],
                'all_probabilities': prediction_result['all_probabilities']
            })
            
        except Exception as e:
            results.append({
                'filename': file.filename,
                'error': str(e)
            })
    
    return jsonify({
        'total': len(files),
        'successful': len([r for r in results if 'error' not in r]),
        'failed': len([r for r in results if 'error' in r]),
        'results': results
    }), 200