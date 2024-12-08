from flask import Flask, request, jsonify, render_template
from flask_cors import CORS  # Import CORS
from PIL import Image
import torch
import torchvision.transforms as transforms
import torch.nn as nn
import io
import os
import urllib.request
from torchvision import models

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)  # This allows all origins

# Model file URL from Google Drive
model_url = "https://drive.google.com/uc?export=download&id=1CreDGF6OETKYsrZQ679_snIX5OBjW18_"
model_path = "plantguard_model.pth"

# Download the model file if it doesn't exist
if not os.path.exists(model_path):
    print(f"Model file not found locally. Downloading from Google Drive...")
    urllib.request.urlretrieve(model_url, model_path)
    print("Download complete.")

# Load ResNet18 model
model = models.resnet18(weights='IMAGENET1K_V1')  # Load the pre-trained ResNet18 model
model.fc = nn.Linear(model.fc.in_features, 3)  # Modify the final layer for your classification

# Load the saved model weights from the downloaded file
model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))  # Ensure correct loading on CPU or GPU
model.eval()  # Set the model to evaluation mode

# Define image transformation (same as during training)
transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
])

@app.route("/")
def index():
    return render_template("index.html")  # Render the HTML template

@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files["image"]
        print(f"File received: {file.filename}")  # Log the file name to ensure the file is uploaded
        
        # Check if file is empty
        if not file:
            return jsonify({"prediction": "No file uploaded", "confidence": 0.0})
        
        # Open the image
        image = Image.open(io.BytesIO(file.read())).convert("RGB")
        print(f"Image opened successfully: {image.size}")  # Log image size to ensure it's processed

        image = transform(image).unsqueeze(0)  # Add batch dimension

        # Perform inference
        with torch.no_grad():
            outputs = model(image)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)  # Get class probabilities
            confidence, predicted = torch.max(probabilities, 1)  # Get the highest probability

        # Define class names
        class_names = ["Rust", "Powdery", "Healthy"]

        # Confidence threshold check
        confidence_threshold = 0.6
        if confidence < confidence_threshold:
            return jsonify({"prediction": "Invalid Image", "confidence": confidence.item()})

        # Return valid prediction
        predicted_class = class_names[predicted.item()]
        return jsonify({"prediction": predicted_class, "confidence": confidence.item()})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"prediction": "Error", "confidence": 0.0}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)  # Run on all network interfaces
