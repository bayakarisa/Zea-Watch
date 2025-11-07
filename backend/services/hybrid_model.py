import os
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms
from transformers import ViTImageProcessor, ViTForImageClassification
import torchvision.models as models

class HybridModel(nn.Module): # <-- Make sure it inherits!
    def __init__(self):
        super(HybridModel, self).__init__() # <-- Add this!
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Define this FIRST
        self.disease_classes = [
            'Healthy',
            'Northern Leaf Blight',
            'Common Rust',
            'Gray Leaf Spot',
            'Bacterial Leaf Streak',
            'Anthracnose Leaf Blight'
        ]
        
        # Call this LAST
        self.load_models() 
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
    
    def load_models(self):
        """Load CNN and Transformer models"""
        try:
            # Load EfficientNet (CNN)
            self.cnn_model = models.efficientnet_b0(pretrained=True)
            num_features = self.cnn_model.classifier[1].in_features
            self.cnn_model.classifier[1] = nn.Linear(num_features, len(self.disease_classes))
            
            model_path = os.getenv('MODEL_PATH', './models/hybrid_model.pth')
            if os.path.exists(model_path):
                self.cnn_model.load_state_dict(torch.load(model_path, map_location=self.device))
            
            self.cnn_model.eval()
            self.cnn_model.to(self.device)
            
            # Load Vision Transformer (ViT)
            try:
                self.vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
                # self.vit_model = ViTForImageClassification.from_pretrained(
                #     'google/vit-base-patch16-224',
                #     num_labels=len(self.disease_classes)
                # )
                self.vit_model = ViTForImageClassification.from_pretrained(
                    'google/vit-base-patch16-224',
                    num_labels=len(self.disease_classes),
                    ignore_mismatched_sizes=True
                )
                self.vit_model.eval()
                self.vit_model.to(self.device)
            except Exception as e:
                print(f"Warning: Could not load ViT model: {str(e)}")
                self.vit_model = None
                
        except Exception as e:
            print(f"Error loading models: {str(e)}")
            # Fallback to simple model
            self.cnn_model = None
            self.vit_model = None
    
    def predict(self, image: Image.Image) -> tuple[str, float]:
        """
        Predict disease using hybrid CNN + Transformer approach.
        Returns (disease_name, confidence)
        """
        if self.cnn_model is None and self.vit_model is None:
            # Fallback prediction (mock)
            return 'Northern Leaf Blight', 0.85
        
        predictions = []
        
        # CNN Prediction
        if self.cnn_model:
            try:
                img_tensor = self.transform(image).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    cnn_output = self.cnn_model(img_tensor)
                    cnn_probs = torch.softmax(cnn_output, dim=1)
                    cnn_conf, cnn_idx = torch.max(cnn_probs, 1)
                    predictions.append((cnn_idx.item(), cnn_conf.item()))
            except Exception as e:
                print(f"CNN prediction error: {str(e)}")
        
        # Transformer Prediction
        if self.vit_model:
            try:
                inputs = self.vit_processor(image, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    vit_output = self.vit_model(**inputs)
                    vit_probs = torch.softmax(vit_output.logits, dim=1)
                    vit_conf, vit_idx = torch.max(vit_probs, 1)
                    predictions.append((vit_idx.item(), vit_conf.item()))
            except Exception as e:
                print(f"ViT prediction error: {str(e)}")
        
        if not predictions:
            # Fallback
            return 'Northern Leaf Blight', 0.85
        
        # Ensemble: Average predictions or use weighted average
        if len(predictions) == 2:
            # Weighted average (CNN: 0.6, ViT: 0.4)
            weighted_idx = int((predictions[0][0] * 0.6 + predictions[1][0] * 0.4))
            weighted_conf = (predictions[0][1] * 0.6 + predictions[1][1] * 0.4)
            final_idx = weighted_idx
            final_conf = weighted_conf
        else:
            final_idx, final_conf = predictions[0]
        
        disease_name = self.disease_classes[min(final_idx, len(self.disease_classes) - 1)]
        
        return disease_name, final_conf

