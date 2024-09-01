import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
from PIL import Image
import os

# Function to load and run inference using the saved model
def run_inference(image_path, model_path):
    model = tf.keras.models.load_model(model_path)

    # Preprocess the image to match the training conditions
    img = Image.open(image_path).convert('RGB')
    img = img.resize((224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # Normalize the image

    print(f"Image array shape: {img_array.shape}")  # Debugging line

    predictions = model.predict(img_array)
    class_names = ['apple', 'banana', 'lime']  # Update with your actual class names
    print(f"Predictions: {predictions}")  # Print predictions for debugging

    predicted_class = np.argmax(predictions[0])
    label = class_names[predicted_class]
    confidence = float(predictions[0][predicted_class])  # Convert to float

    return label, confidence

# Test the model on known images
def test_model_on_known_images(model_path):
    test_images = [
        ('/home/tase/scale-mate/src/main/java/com/example/scalemate/scripts/apple.png', 'apple'),
        ('/home/tase/scale-mate/src/main/java/com/example/scalemate/scripts/bananas.png', 'banana'),
        ('/home/tase/scale-mate/src/main/java/com/example/scalemate/scripts/lime.png', 'lime')
    ]
    
    for image_path, true_label in test_images:
        label, confidence = run_inference(image_path, model_path)
        print(f"Image: {image_path}, True Label: {true_label}, Predicted Label: {label}, Confidence: {confidence}")

if __name__ == "__main__":
    test_model_on_known_images("my_pretrained_model.keras")
