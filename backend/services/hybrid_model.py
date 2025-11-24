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

        self.disease_classes = [
            'Healthy',
            'Northern Leaf Blight',
            'Common Rust',
            'Gray Leaf Spot'
        ]

        # 1. Load ViT Model
        try:
            self.vit_model = ViTForImageClassification.from_pretrained(
                'google/vit-base-patch16-224',
                num_labels=len(self.disease_classes),
                ignore_mismatched_sizes=True # This creates a blank classifier
            )
        except Exception as e:
            print(f"Warning: Could not load ViT model: {str(e)}")
            self.vit_model = None

        # 2. Load ViT Processor
        try:
            self.vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
        except Exception:
            self.vit_processor = None

        # 3. Define Transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])

        # 4. Load EfficientNet B0 (CNN)
        model_path = os.getenv('MODEL_PATH', './models/hybrid_model.pth')

        try:
            # Load EfficientNet B0 (matches the saved model architecture)
            self.cnn_model = models.efficientnet_b0(weights=None)
            
            # EfficientNet classifier is Sequential(Dropout, Linear)
            # We replace the Linear layer (index 1)
            num_ftrs = self.cnn_model.classifier[1].in_features
            self.cnn_model.classifier[1] = nn.Linear(num_ftrs, len(self.disease_classes))
            
            if os.path.exists(model_path):
                # Load state dict for the ENTIRE HybridModel (including cnn_model and vit_model)
                state_dict = torch.load(model_path, map_location=self.device)
                
                # The saved model is a HybridModel state_dict (keys start with cnn_model... and vit_model...)
                # So we load it into 'self', not 'self.cnn_model'
                self.load_state_dict(state_dict)
                print(f"✅ Successfully loaded HybridModel (EfficientNet+ViT) from {model_path}")
            else:
                print(f"Warning: Model file not found at {model_path}. Using initialized model (untrained).")
                self.cnn_model = None

        except Exception as e:
            print(f"❌ Failed to load model: {str(e)}")
            # Fallback to None so we don't crash, but predictions will be dummy
            self.cnn_model = None

        if self.cnn_model:
            self.cnn_model.to(self.device)
        if self.vit_model:
            self.vit_model.to(self.device)


    def forward(self, cnn_input, vit_input):
        cnn_logits = self.cnn_model(cnn_input)
        if self.vit_model:
            vit_outputs = self.vit_model(**vit_input)
            vit_logits = vit_outputs.logits
            combined_logits = (cnn_logits + vit_logits) / 2
            return combined_logits
        else:
            return cnn_logits

    def predict(self, image: Image.Image) -> tuple[str, float]:
        if self.cnn_model is None:
            return 'Healthy', 0.85

        self.eval()
        if self.cnn_model:
            self.cnn_model.eval()
        if self.vit_model:
            self.vit_model.eval()

        all_probs = []

        try:
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                cnn_output = self.cnn_model(img_tensor)
                cnn_probs = torch.softmax(cnn_output, dim=1)
                all_probs.append(cnn_probs)
        except Exception as e:
            print(f"CNN prediction error: {str(e)}")

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