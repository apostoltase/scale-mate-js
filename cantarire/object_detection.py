import os
import subprocess
import sys
import json
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
from PIL import Image

# Function to capture image using libcamera
def capture_image(image_path):
    try:
        subprocess.run(['libcamera-still', '-o', image_path, '--width', '640', '--height', '480'], check=True)
        print(f"Image captured and saved to {image_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error capturing image: {e}")
        sys.exit(1)

# Function to load and run inference using the saved model
def run_inference(image_path, model_path):
    model = tf.keras.models.load_model(model_path)

    # Preprocess the image to match the training conditions
    img = Image.open(image_path).convert('RGB')
    img = img.resize((224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # Normalize the image

    predictions = model.predict(img_array)
    class_names = ['apple', 'bananas', 'lime']  # Update with your actual class names
    print(f"Predictions: {predictions}")  # Print predictions for debugging

    predicted_class = np.argmax(predictions[0])
    label = class_names[predicted_class]
    confidence = float(predictions[0][predicted_class])  # Convert to float

    return label, confidence

# Function to update JSON file with detected data
def update_json_with_detection(label, confidence):
    json_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'measurement_data.json')
    
    try:
        with open(json_file_path, 'r') as json_file:
            data = json.load(json_file)
        
        data['label'] = label
        data['confidence'] = confidence

        with open(json_file_path, 'w') as json_file:
            json.dump(data, json_file)
        
        print(f"Updated JSON with label: {label}, confidence: {confidence}")
    except Exception as e:
        print(f"Error updating JSON file: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 object_detection.py <weight>")
        sys.exit(1)

    weight = float(sys.argv[1])
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, "captured_image.jpg")
    model_path = os.path.join(script_dir, "my_pretrained_model.keras")

    # Capture image
    capture_image(image_path)

    # Run inference
    label, confidence = run_inference(image_path, model_path)

    # Update the JSON file with the detected label and confidence
    if label and confidence:
        update_json_with_detection(label, confidence)

if __name__ == "__main__":
    main()
