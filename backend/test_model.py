import torch
from PIL import Image
from vision_model import predict

# Load a sample X-ray from the test set (change path to an actual pneumonia image)
test_image_path = "data/raw/chest_xray/test/PNEUMONIA/person1_virus_14.jpeg"
image = Image.open(test_image_path).convert("RGB")

laterality, pathologies, keywords, bbox = predict(image)
print(f"Predicted laterality: {laterality}")
print(f"Predicted pathologies: {pathologies}")
print(f"All keywords: {keywords}")
print(f"Bounding box: {bbox}")