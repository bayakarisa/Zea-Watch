import torch
import torchvision.models as models

def check_model(name, model_fn):
    try:
        model = model_fn()
        sd = model.state_dict()
        keys = list(sd.keys())
        print(f"--- {name} ---")
        # Print first 5 keys
        for k in keys[:5]:
            print(k)
        
        # Check for specific signature keys
        if 'features.0.0.weight' in sd:
            print(f"MATCHES features.0.0.weight")
        
        # Check for block signature
        has_block = any('block' in k for k in keys)
        if has_block:
             print("Has 'block' in keys")
             # Print a key with block
             for k in keys:
                 if 'block' in k:
                     print(f"Sample block key: {k}")
                     break
    except Exception as e:
        print(f"Error checking {name}: {e}")

if __name__ == "__main__":
    import sys
    with open('model_keys.txt', 'w') as f:
        sys.stdout = f
        print("Checking common models...")
        check_model("ResNet50", models.resnet50)
        check_model("MobileNetV2", models.mobilenet_v2)
        check_model("EfficientNet_B0", models.efficientnet_b0)
        check_model("EfficientNet_B1", models.efficientnet_b1)
        check_model("EfficientNet_V2_S", models.efficientnet_v2_s)
        check_model("DenseNet121", models.densenet121)
        check_model("VGG16", models.vgg16)
