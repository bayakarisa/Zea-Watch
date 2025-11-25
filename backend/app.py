from flask import Flask, send_from_directory, request
from flask_cors import CORS
from dotenv import load_dotenv
from middleware.rate_limit import init_rate_limiter
import os

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS with proper configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize rate limiter
limiter = init_rate_limiter(app)

# Configuration
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', './static/uploads')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['MODEL_PATH'] = os.getenv('MODEL_PATH', './models/hybrid_model.pth')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production-use-long-random-string')
app.config['SESSION_COOKIE_SECURE'] = os.getenv('ENVIRONMENT', 'development') == 'production'

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Register routes
from routes.predict import predict_bp
from routes.history import history_bp
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.subscriptions import subscriptions_bp
from routes.uploads import uploads_bp
from routes.recommendations import recommendations_bp

# Set rate limiter in auth routes
from routes.auth import set_limiter
set_limiter(limiter)

# Register blueprints with /api prefix
app.register_blueprint(predict_bp, url_prefix='/api')
app.register_blueprint(history_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(subscriptions_bp, url_prefix='/api')
app.register_blueprint(uploads_bp, url_prefix='/api')
app.register_blueprint(recommendations_bp, url_prefix='/api')

# Health check routes
@app.route('/')
def health_check():
    """Root health check endpoint"""
    return {'status': 'ok', 'message': 'ZeaWatch API is running'}

@app.route('/api/health')
def api_health():
    """API health check endpoint"""
    return {'status': 'ok', 'service': 'ZeaWatch API'}

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    upload_folder = app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    print(f"❌ 404 Error: {request.url}")
    return {'error': f'Resource not found: {request.url}'}, 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return {'error': 'Internal server error'}, 500

@app.errorhandler(413)
def too_large(error):
    """Handle file too large errors"""
    return {'error': 'File too large. Maximum size is 5MB'}, 413

# Run the application
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('ENVIRONMENT', 'development') != 'production'

    print(f"[INFO] Starting ZeaWatch API on port {port}")
    print(f"[DEBUG] Debug mode: {debug_mode}")
    print(f"[INFO] Upload folder: {app.config['UPLOAD_FOLDER']}")

    app.run(host='0.0.0.0', port=port, debug=debug_mode)