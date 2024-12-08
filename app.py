from flask import Flask, request, jsonify, render_template
from flask_cors import CORS  # Import CORS
import torch
import torchvision.transforms as transforms
import torch.nn as nn
import io
import os
from PIL import Image
from torchvision import models

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)  # This allows all origins

# Set environment (can be set in environment variables)
ENVIRONMENT = os.getenv('FLASK_ENV', 'development')  # Default to 'development'

# Load ResNet18 model
model = models.resnet18(weights='IMAGENET1K_V1')  # Load the pre-trained ResNet18 model
model.fc = nn.Linear(model.fc.in_features, 3)  # Modify the final layer for your classification

# Model file path
model_path = "plantguard_model.pth"

# Load the saved model weights from the downloaded file
try:
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))  # Ensure correct loading on CPU or GPU
    model.eval()  # Set the model to evaluation mode
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

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
    # Set the app to run in the correct mode (development/production)
    if ENVIRONMENT == 'development':
        app.run(debug=True, host='0.0.0.0', port=5000)  # For local network access
    else:
        app.run(debug=False, host='0.0.0.0', port=5000)  # For production, run on all interfaces
