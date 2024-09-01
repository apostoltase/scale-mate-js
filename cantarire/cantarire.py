import json
import time
import sys
import RPi.GPIO as GPIO
from hx711 import HX711
import subprocess
import requests

def cleanAndExit():
    print("Cleaning...")
    GPIO.cleanup()
    print("Bye!")
    sys.exit()

def is_stable(values, threshold=5):
    return max(values) - min(values) < threshold

def measure_weight():
    hx = HX711(5, 6)
    hx.set_reading_format("MSB", "MSB")
    referenceUnit = 114
    hx.set_reference_unit(-421)
    hx.reset()
    hx.tare()

    print("Tare done! Add weight now...")

    stable_values = []
    waiting_for_removal = False
    last_weight = 0

    while True:
        try:
            val = max(0, int(hx.get_weight(5)))
            print(val)

            if not waiting_for_removal:
                stable_values.append(val)
                if len(stable_values) > 10:
                    stable_values.pop(0)

                if is_stable(stable_values) and val > 0:
                    print("Stable weight detected:", val)
                    return val
                    last_weight = val
                    waiting_for_removal = True
                    stable_values.clear()
            else:
                if val == 0:
                    print("Waiting for the next item...")
                    waiting_for_removal = False

            hx.power_down()
            hx.power_up()
            time.sleep(0.1)

        except (KeyboardInterrupt, SystemExit):
            cleanAndExit()

def save_data_as_json(weight, label=None, confidence=None):
    data = {
        "weight": weight,
        "label": label,
        "confidence": confidence
    }
    with open('measurement_data.json', 'w') as json_file:
        json.dump(data, json_file)

def run_object_detection(weight):
    # Save the weight data to the JSON file first
    save_data_as_json(weight)

    # Call the object detection script, passing the weight as an argument
    subprocess.run(['python3', 'object_detection.py', str(weight)], check=True)

def send_json_to_backend():
    url = "http://localhost:3000/api/receive-measurement"  # Update with your backend URL
    json_file_path = 'measurement_data.json'

    with open(json_file_path, 'r') as json_file:
        json_data = json.load(json_file)

    try:
        response = requests.post(url, json=json_data)
        if response.status_code == 200:
            print("Data sent to backend successfully")
        else:
            print(f"Failed to send data to backend: {response.status_code}")
    except requests.RequestException as e:
        print(f"Error sending data to backend: {e}")

if __name__ == "__main__":
    weight = measure_weight()
    if weight > 0:
        run_object_detection(weight)
        send_json_to_backend()  # Send the data to the backend after object detection
