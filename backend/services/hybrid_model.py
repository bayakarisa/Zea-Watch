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
        
        # The 4 output classes
        self.disease_classes = [
            'Healthy',
            'Northern Leaf Blight',
            'Common Rust',
            'Gray Leaf Spot'
        ]
        
        # ----------------------------
        # 1. Build EMPTY EfficientNet CNN
        # ----------------------------
        self.cnn_model = models.efficientnet_b0(pretrained=False)
        num_features = self.cnn_model.classifier[1].in_features
        self.cnn_model.classifier[1] = nn.Linear(num_features, len(self.disease_classes))

        # ----------------------------
        # 2. Build EMPTY ViT model
        # ----------------------------
        try:
            self.vit_model = ViTForImageClassification.from_pretrained(
                'google/vit-base-patch16-224',
                num_labels=len(self.disease_classes),
                ignore_mismatched_sizes=True
            )
        except Exception as e:
            print(f"Warning: Could not load ViT: {e}")
            self.vit_model = None

        # ----------------------------
        # 3. Define ViT processor
        # ----------------------------
        try:
            self.vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
        except Exception:
            self.vit_processor = None

        # ----------------------------
        # 4. Image transform for CNN
        # ----------------------------
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406], 
                std=[0.229, 0.224, 0.225]
            )
        ])

        # ----------------------------
        # 5. Load trained weights
        # ----------------------------
        self.load_models()

        # ----------------------------
        # 6. Move models to device
        # ----------------------------
        self.cnn_model.to(self.device)
        if self.vit_model:
            self.vit_model.to(self.device)


    def load_models(self):
        """Load the fully-trained hybrid_model.pth state dict."""
        model_path = os.getenv('MODEL_PATH', './models/hybrid_model.pth')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        try:
    def load_models(self):
        """Load the fully-trained hybrid_model.pth state dict."""
        model_path = os.getenv('MODEL_PATH', './models/hybrid_model.pth')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        try:
            print(f"Loading trained weights from {model_path} ...")
            # We map to device here to ensure weights load to GPU/CPU correctly
            state = torch.load(model_path, map_location=self.device)
            self.load_state_dict(state)
            print("✅ Weights loaded successfully.")
            
        except Exception as e:
            print(f"❌ Failed loading weights: {e}")
            # It is safer to raise the error than to run with an untrained model
            raise e

        self.eval()
        self.cnn_model.eval()
        if self.vit_model:
            self.vit_model.eval()


    def forward(self, cnn_input, vit_input):
        cnn_logits = self.cnn_model(cnn_input)
        
        if self.vit_model:
            vit_out = self.vit_model(**vit_input)
            vit_logits = vit_out.logits
            return (cnn_logits + vit_logits) / 2
        
        return cnn_logits


    def predict(self, image: Image.Image) -> tuple[str, float]:
        """Runs CNN + ViT ensemble prediction."""
        
        self.eval()
        if self.cnn_model:
            self.cnn_model.eval()
        if self.vit_model:
            self.vit_model.eval()

        all_probs = []

        # ----------------------------
        # Run CNN branch
        # ----------------------------
        try:
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                cnn_out = self.cnn_model(img_tensor)
                cnn_probs = torch.softmax(cnn_out, dim=1)
                all_probs.append(cnn_probs)
        except Exception as e:
            print(f"CNN prediction error: {e}")

        # ----------------------------
        # Run ViT branch
        # ----------------------------
        if self.vit_model and self.vit_processor:
            try:
                inputs = self.vit_processor(image, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    vit_out = self.vit_model(**inputs)
                    vit_probs = torch.softmax(vit_out.logits, dim=1)
                    all_probs.append(vit_probs)
            except Exception as e:
                print(f"ViT prediction error: {e}")

        # ----------------------------
        # If no outputs, default
        # ----------------------------
        # In your predict function
        if not all_probs:
            # Return a distinct error state with 0 confidence
            return "Error: Could not process image", 0.0        

        # Average ensemble
        final_probs = torch.stack(all_probs).mean(dim=0)
        final_conf, final_idx = torch.max(final_probs, dim=1)

        disease_name = self.disease_classes[final_idx.item()]
        return disease_name, final_conf.item()
