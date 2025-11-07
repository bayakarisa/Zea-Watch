from flask import Blueprint, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename
from PIL import Image
import io
from services.hybrid_model import HybridModel
from services.gemini_service import GeminiService
from services.db_service import DatabaseService

predict_bp = Blueprint('predict', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@predict_bp.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, GIF, WEBP'}), 400
    
    try:
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Initialize services
        gemini_service = GeminiService()
        
        # Validate that the image is a maize leaf BEFORE analysis
        print("=" * 50)
        print("STARTING IMAGE VALIDATION")
        print("=" * 50)
        is_valid, validation_message = gemini_service.validate_maize_leaf(image)
        print(f"Validation result: is_valid={is_valid}, message={validation_message}")
        print("=" * 50)
        
        if not is_valid:
            print(f"❌ VALIDATION FAILED - Rejecting image")
            return jsonify({'error': validation_message}), 400
        
        print("✅ VALIDATION PASSED - Proceeding with analysis")
        
        # Initialize other services
        model = HybridModel()
        db_service = DatabaseService()
        
        # Run AI model prediction
        disease, confidence = model.predict(image)
        
        # Get detailed description and recommendation from Gemini
        description, recommendation = gemini_service.get_insights(disease, confidence, image)
        
        # Save image and get URL
        filename = secure_filename(file.filename)
        upload_folder = current_app.config.get('UPLOAD_FOLDER', './static/uploads')
        filepath = os.path.join(upload_folder, filename)
        os.makedirs(upload_folder, exist_ok=True)
        image.save(filepath)
        image_url = f'/static/uploads/{filename}'
        
        # Save to database
        result = db_service.save_analysis(
            disease=disease,
            confidence=float(confidence),
            description=description,
            recommendation=recommendation,
            image_url=image_url
        )
        
        return jsonify({
            'id': result.get('id'),
            'disease': disease,
            'confidence': float(confidence),
            'description': description,
            'recommendation': recommendation,
            'image_url': image_url,
            'created_at': result.get('created_at')
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error analyzing image: {str(e)}")
        print(f"Traceback: {error_trace}")
        
        # Return user-friendly error message
        error_message = str(e)
        if "CUDA" in error_message or "cuda" in error_message:
            error_message = "GPU/CUDA error. Falling back to CPU processing."
        elif "model" in error_message.lower() or "Model" in error_message:
            error_message = "Model loading error. Please check model files."
        elif "Gemini" in error_message:
            error_message = "AI description service unavailable. Using fallback descriptions."
        
        return jsonify({'error': f'Failed to analyze image: {error_message}'}), 500

