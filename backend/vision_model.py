import os
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
from typing import Tuple, Set, List
from collections import OrderedDict

# ---------- Configuration ----------
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "chest_xray_pneumonia_model.pth")
NUM_CLASSES = 2  # normal, pneumonia

# ---------- Transform (must match training) ----------
def get_transform():
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.Grayscale(num_output_channels=3),   # convert 1‑channel to 3‑channel
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

# ---------- Load model with robust handling ----------
def load_model():
    # Create base model
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, NUM_CLASSES)
    
    if os.path.exists(MODEL_PATH):
        state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
        
        # Remove 'module.' prefix if the model was saved with DataParallel
        new_state_dict = OrderedDict()
        for k, v in state_dict.items():
            name = k[7:] if k.startswith('module.') else k
            new_state_dict[name] = v
        
        # Load with strict=False to ignore mismatched keys (e.g., missing fc.bias)
        missing_keys, unexpected_keys = model.load_state_dict(new_state_dict, strict=False)
        if missing_keys:
            print(f"⚠️ Missing keys: {missing_keys}")
        if unexpected_keys:
            print(f"⚠️ Unexpected keys: {unexpected_keys}")
        print("✅ Model loaded successfully")
    else:
        print(f"❌ Model file not found at {MODEL_PATH}. Using random weights.")
    
    model = model.to(DEVICE)
    model.eval()
    return model

model = load_model()
transform = get_transform()

# ---------- Convert prediction to keyword sets ----------
def get_keywords_from_prediction(pred_class: int) -> Tuple[Set[str], Set[str], Set[str]]:
    laterality = {"bilateral"}   # this model does not predict left/right
    if pred_class == 1:          # pneumonia
        pathologies = {"pneumonia"}
    else:                        # normal
        pathologies = {"normal"}
    all_keywords = laterality.union(pathologies)
    return laterality, pathologies, all_keywords

# ---------- Mock bounding box (replace with real detection later) ----------
def get_mock_bounding_box(pred_class: int) -> List[int]:
    if pred_class == 1:
        return [120, 180, 280, 220]   # approximate pneumonia region
    else:
        return [200, 200, 150, 150]   # central box for normal

# ---------- Main prediction function ----------
def predict(image: Image.Image) -> Tuple[Set[str], Set[str], Set[str], List[int]]:
    input_tensor = transform(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        outputs = model(input_tensor)
        _, predicted = torch.max(outputs, 1)
        pred_class = predicted.item()

    laterality, pathologies, all_keywords = get_keywords_from_prediction(pred_class)
    bbox = get_mock_bounding_box(pred_class)
    return laterality, pathologies, all_keywords, bbox