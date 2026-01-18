import base64
import cv2
import numpy as np
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from pyzbar import pyzbar

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('index.html')

def preprocess_image(img):
    """Enhance image for better barcode detection."""
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Increase contrast/brightness if needed
    # (Optional: alpha 1.5, beta 0)
    # gray = cv2.convertScaleAbs(gray, alpha=1.2, beta=0)

    # Upscale image if it's too small (helps with small barcodes)
    height, width = gray.shape
    if width < 800:
        scale = 800 / width
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    return gray

@socketio.on('image')
def handle_image(data):
    try:
        header, encoded = data.split(",", 1)
        data_decoded = base64.b64decode(encoded)
        nparr = np.frombuffer(data_decoded, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return

        # Attempt 1: Standard detection on original image
        barcodes = pyzbar.decode(img)
        
        # Attempt 2: If none found, try preprocessed grayscale
        if not barcodes:
            processed = preprocess_image(img)
            barcodes = pyzbar.decode(processed)
            
        # Attempt 3: If still none, try Otsu thresholding
        if not barcodes:
            processed = preprocess_image(img)
            _, thresh = cv2.threshold(processed, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            barcodes = pyzbar.decode(thresh)

        results = []
        for barcode in barcodes:
            barcodeData = barcode.data.decode("utf-8")
            barcodeType = barcode.type
            results.append({
                "data": barcodeData,
                "type": barcodeType
            })

        if results:
            emit('results', results)
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
