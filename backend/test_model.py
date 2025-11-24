import os
import sys
import torch
from PIL import Image
import numpy as np

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

from services.hybrid_model import HybridModel

def test_model():
    print("Testing HybridModel loading...")
    print(f"Current working directory: {os.getcwd()}")
    
    model_path = './models/hybrid_model.pth'
    print(f"Checking if model file exists at {model_path}: {os.path.exists(model_path)}")
    
    try:
        model = HybridModel()
        print("HybridModel instantiated.")
        
        if model.cnn_model is None:
            print("❌ model.cnn_model is None! Loading failed.")
        else:
            print("✅ model.cnn_model is initialized.")
            
        # Create a dummy image
        dummy_image = Image.new('RGB', (224, 224), color='green')
        
        print("Running prediction on dummy image...")
        disease, confidence = model.predict(dummy_image)
        
        print(f"Prediction Result: {disease}, Confidence: {confidence}")
        
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    with open('model_test_output.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        sys.stderr = f
        test_model()
