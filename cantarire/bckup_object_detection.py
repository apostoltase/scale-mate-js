import os
import subprocess
import sys
import requests
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np

# Function to capture image using libcamera
def capture_image(image_path):
    try:
        subprocess.run(['libcamera-still', '-o', image_path, '--width', '640', '--height', '480'], check=True)
        print(f"Image captured and saved to {image_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error capturing image: {e}")

# Function to load and run inference using the pre-trained model
def run_inference(image_path, model_path):
    model = tf.keras.models.load_model(model_path)

    # Preprocess the image
    img = image.load_img(image_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # Normalize the image

    predictions = model.predict(img_array)
    class_names = ['apple', 'bananas', 'lime']  # Update with your actual class names
    predicted_class = np.argmax(predictions[0])
    label = class_names[predicted_class]
    confidence = predictions[0][predicted_class]

    return label, confidence

# Function to send detected object data
def send_data(label, confidence, weight):
    url = "http://192.168.0.139:8080/api/products/add"
    product_data = {
        "name": label,
        "confidence": confidence,
        "weight": weight,
        "price": weight * 0.1  # Example price calculation based on weight
    }

    try:
        response = requests.post(url, json=product_data)
        if response.status_code == 200:
            print("Product data sent successfully")
        else:
            print(f"Failed to send product data: {response.status_code}")
            print(f"Response content: {response.content}")

    except requests.RequestException as e:
        print(f"Error sending data: {e}")

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

    # Send data
    if label and confidence:
        send_data(label, confidence, weight)

if __name__ == "__main__":
    main()
