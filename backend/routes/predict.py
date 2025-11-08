from flask import Blueprint, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename
from PIL import Image
import io

# Import services
from services.hybrid_model import HybridModel
from services.gemini_service import GeminiService
from services.db_service import DatabaseService

# Create Flask Blueprint
predict_bp = Blueprint('predict', __name__)

# Allowed file types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    """Check if file extension is valid."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -----------------------------------------------------------------------------
# 📸 Image analysis endpoint
# -----------------------------------------------------------------------------
@predict_bp.route('/analyze', methods=['POST'])
def analyze():
    """Handle image upload and perform AI-based analysis."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, GIF, WEBP'}), 400

    try:
        # Read and prepare image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Initialize Gemini service
        gemini_service = GeminiService()

        # -----------------------------------------------------
        # 🔍 Step 1: Validate that image is a maize leaf
        # -----------------------------------------------------
        print("=" * 50)
        print("STARTING IMAGE VALIDATION")
        print("=" * 50)
        is_valid, validation_message = gemini_service.validate_maize_leaf(image)
        print(f"Validation result: is_valid={is_valid}, message={validation_message}")
        print("=" * 50)

        if not is_valid:
            print("❌ VALIDATION FAILED - Rejecting image")
            return jsonify({'error': validation_message}), 400

        print("✅ VALIDATION PASSED - Proceeding with analysis")

        # -----------------------------------------------------
        # 🧠 Step 2: Run AI model prediction (FIXED)
        # -----------------------------------------------------
        # --- THIS IS THE FIX ---
        # We create a NEW model instance here, inside the function,
        # to force it to load the correct hybrid_model.py file.
        print("🧠 Creating NEW HybridModel instance...")
        model = HybridModel()
        print("🧠 New instance created. Running predict...")
        disease, confidence = model.predict(image)
        # --- END FIX ---

        # -----------------------------------------------------
        # 💡 Step 3: Get detailed description and recommendation
        # -----------------------------------------------------
        description, recommendation = gemini_service.get_insights(disease, confidence, image)

        # -----------------------------------------------------
        # 💾 Step 4: Save image and record analysis
        # -----------------------------------------------------
        filename = secure_filename(file.filename)
        upload_folder = current_app.config.get('UPLOAD_FOLDER', './static/uploads')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        image.save(filepath)
        image_url = f'/static/uploads/{filename}'

        # Save to database
        db_service = DatabaseService()
        result = db_service.save_analysis(
            disease=disease,
            confidence=float(confidence),
            description=description,
            recommendation=recommendation,
            image_url=image_url
        )

        # -----------------------------------------------------
        # ✅ Step 5: Return response
        # -----------------------------------------------------
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

        error_message = str(e)
        if "CUDA" in error_message or "cuda" in error_message:
            error_message = "GPU/CUDA error. Falling back to CPU processing."
        elif "model" in error_message.lower() or "Model" in error_message:
            error_message = "Model loading error. Please check model files."
        elif "Gemini" in error_message:
            error_message = "AI description service unavailable. Using fallback descriptions."

        return jsonify({'error': f'Failed to analyze image: {error_message}'}), 500