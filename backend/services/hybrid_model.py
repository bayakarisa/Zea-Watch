import os
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms
from transformers import ViTImageProcessor, ViTForImageClassification
import torchvision.models as models

class HybridModel(nn.Module): 
    def __init__(self):
        super(HybridModel, self).__init__() 
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Your 4-class list
        self.disease_classes = [
            'Healthy',
            'Northern Leaf Blight',
            'Common Rust',
            'Gray Leaf Spot'
        ]
        
        # Load models for INFERENCE
        self.load_models() 
        
        try:
            self.vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
        except Exception:
            self.vit_processor = None
        
        # This transform is for PREDICTION
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                                 std=[0.229, 0.224, 0.225])
        ])
    
    def load_models(self):
        """Load CNN and Transformer models for INFERENCE."""
        
        # --- Load EfficientNet (CNN) ---
        # Set pretrained=False because we are about to load our own weights
        self.cnn_model = models.efficientnet_b0(pretrained=False) 
        num_features = self.cnn_model.classifier[1].in_features
        self.cnn_model.classifier[1] = nn.Linear(num_features, len(self.disease_classes))
        
        # --- Load ViT (Transformer) ---
        try:
            self.vit_model = ViTForImageClassification.from_pretrained(
                'google/vit-base-patch16-224',
                num_labels=len(self.disease_classes),
                ignore_mismatched_sizes=True
            )
        except Exception as e:
            print(f"Warning: Could not load ViT model: {str(e)}")
            self.vit_model = None

        # --- THIS IS THE CRITICAL PART ---
        # Load the "saved brain" (.pth file) you just trained
        model_path = os.getenv('MODEL_PATH', './models/hybrid_model.pth')
        if os.path.exists(model_path):
            print(f"Loading trained weights from {model_path}...")
            # We load all weights (CNN and ViT) from the one file
            # We need to load them into the parent HybridModel object
            self.load_state_dict(torch.load(model_path, map_location=self.device))
            print("✅ Weights loaded successfully.")
        else:
            print(f"Warning: Model file not found at {model_path}. Model will have random weights.")

        # --- Set models to INFERENCE mode ---
        self.train(False) # Set the parent module to eval mode
        self.cnn_model.eval()
        if self.vit_model:
            self.vit_model.eval()
            
        self.cnn_model.to(self.device)
        if self.vit_model:
            self.vit_model.to(self.device)


    def forward(self, cnn_input, vit_input):
        # This is only used for training, but needs to exist
        cnn_logits = self.cnn_model(cnn_input)
        if self.vit_model:
            vit_outputs = self.vit_model(**inputs)
            vit_logits = vit_outputs.logits
            combined_logits = (cnn_logits + vit_logits) / 2
            return combined_logits
        else:
            return cnn_logits

    def predict(self, image: Image.Image) -> tuple[str, float]:
        """
        Your original predict function.
        """
        if self.cnn_model is None:
            return 'Healthy', 0.85
        
        # Make sure models are in eval mode
        self.eval()

        all_probs = []

        # CNN Prediction
        try:
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                cnn_output = self.cnn_model(img_tensor)
                cnn_probs = torch.softmax(cnn_output, dim=1)
                all_probs.append(cnn_probs)
        except Exception as e:
            print(f"CNN prediction error: {str(e)}")
        
        # Transformer Prediction
        if self.vit_model and self.vit_processor:
            try:
                inputs = self.vit_processor(image, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    vit_output = self.vit_model(**inputs)
                    vit_probs = torch.softmax(vit_output.logits, dim=1)
                    all_probs.append(vit_probs)
            except Exception as e:
                print(f"ViT prediction error: {str(e)}")
        
        if not all_probs:
            return 'Healthy', 0.85
        
        final_probs = torch.stack(all_probs).mean(dim=0)
        final_conf, final_idx = torch.max(final_probs, 1)
        
        disease_name = self.disease_classes[final_idx.item()]
        
        return disease_name, final_conf.item()