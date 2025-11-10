from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', './static/uploads')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['MODEL_PATH'] = os.getenv('MODEL_PATH', './models/hybrid_model.pth')

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Register routes
from routes.predict import predict_bp
from routes.history import history_bp

app.register_blueprint(predict_bp, url_prefix='/api')
app.register_blueprint(history_bp, url_prefix='/api')

@app.route('/')
def health_check():
    return {'status': 'ok', 'message': 'ZeaWatch API is running'}

@app.route('/api/health')
def api_health():
    return {'status': 'ok', 'service': 'ZeaWatch API'}

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    upload_folder = app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

