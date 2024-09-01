import subprocess

def capture_image(image_path):
    subprocess.run(['libcamera-still', '-o', image_path, '--nopreview'], check=True)

# Capture an image and save it as 'image.jpg'
capture_image('/home/tase/scale-mate/src/main/java/com/example/scalemate/scripts/image.jpg')
