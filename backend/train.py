import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from transformers import ViTImageProcessor

# Import your modified HybridModel from the services folder
from services.hybrid_model import HybridModel

# --- 1. CONFIGURATION ---
# This path should be correct from our last step
DATA_DIR = r'C:\Users\hommi\OneDrive\Desktop\maize_data'
SAVE_PATH = './models/hybrid_model.pth'
BATCH_SIZE = 16
NUM_EPOCHS = 15
LEARNING_RATE = 1e-4

# --- 2. TRANSFORMS AND PROCESSORS (can stay top-level) ---
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
to_pil = transforms.ToPILImage()

# --- 3. MAIN TRAINING FUNCTION ---
def main():
    print("Loading datasets...")
    TRAIN_DIR = os.path.join(DATA_DIR, 'train')
    VAL_DIR = os.path.join(DATA_DIR, 'val')

    try:
        train_dataset = datasets.ImageFolder(TRAIN_DIR, transform=train_transform)
        val_dataset = datasets.ImageFolder(VAL_DIR, transform=val_transform)
    except FileNotFoundError:
        print(f"Error: Data directory not found at '{DATA_DIR}'")
        print("Please double-check the 'DATA_DIR' variable in train.py")
        exit()

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    print(f"Training with {len(train_dataset.classes)} classes:")
    print(train_dataset.classes)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    model = HybridModel().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    best_val_acc = 0.0

    if not os.path.exists('./models'):
        os.makedirs('./models')

    print("Starting training...")
    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        
        print(f"\n--- Epoch {epoch+1}/{NUM_EPOCHS} ---")
        for cnn_inputs, labels in train_loader:
            vit_inputs_pil = [to_pil(img) for img in cnn_inputs]
            vit_inputs = vit_processor(vit_inputs_pil, return_tensors="pt").to(device)
            cnn_inputs = cnn_inputs.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(cnn_inputs, vit_inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * cnn_inputs.size(0)
        
        epoch_loss = running_loss / len(train_loader.dataset)
        print(f"Training Loss: {epoch_loss:.4f}")

        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0

        with torch.no_grad():
            for cnn_inputs, labels in val_loader:
                vit_inputs_pil = [to_pil(img) for img in cnn_inputs]
                vit_inputs = vit_processor(vit_inputs_pil, return_tensors="pt").to(device)
                cnn_inputs = cnn_inputs.to(device)
                labels = labels.to(device)
                
                outputs = model(cnn_inputs, vit_inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * cnn_inputs.size(0)
                
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        epoch_val_loss = val_loss / len(val_loader.dataset)
        epoch_val_acc = (correct / total) * 100
        print(f"Validation Loss: {epoch_val_loss:.4f} | Validation Acc: {epoch_val_acc:.2f}%")
        
        if epoch_val_acc > best_val_acc:
            best_val_acc = epoch_val_acc
            torch.save(model.state_dict(), SAVE_PATH)
            print(f"✅ New best model saved! Accuracy: {best_val_acc:.2f}%")

    print("\n--- Training Finished ---")
    print(f"Best validation accuracy: {best_val_acc:.2f}%")
    print(f"Model saved to {SAVE_PATH}")

# --- 4. START THE SCRIPT ---
if __name__ == '__main__':
    main()