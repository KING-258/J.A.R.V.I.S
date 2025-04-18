from flask import Blueprint, request, jsonify
import os
import time
import logging
import base64
import numpy as np
import cv2
from PIL import Image
import io
import torch
from ultralytics import YOLO
from config import OBJECT_DETECTION_MODEL, IMAGE_UPLOAD_FOLDER

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
vision_bp = Blueprint('vision', __name__)

# Initialize YOLO model
try:
    model = YOLO(OBJECT_DETECTION_MODEL)
    logger.info("YOLO model loaded successfully")
except Exception as e:
    logger.error(f"Error loading YOLO model: {str(e)}")
    model = None

@vision_bp.route('/object-detect', methods=['POST'])
def object_detect():
    """
    Detect objects in an image
    
    Expected JSON payload:
    {
        "image": "base64_encoded_image"
    }
    """
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({"error": "Invalid request. 'image' is required"}), 400
            
        # Get the base64 image
        image_data = data['image']
        
        # Remove the data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Save the image temporarily
        temp_path = os.path.join(IMAGE_UPLOAD_FOLDER, f"temp_{int(time.time())}.jpg")
        cv2.imwrite(temp_path, image)
        
        # Perform object detection
        results = model(temp_path)
        
        # Process results
        detections = []
        for i, result in enumerate(results):
            boxes = result.boxes
            for j, box in enumerate(boxes):
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Get class and confidence
                class_id = int(box.cls[0].item())
                class_name = result.names[class_id]
                confidence = float(box.conf[0].item())
                
                # Calculate width and height
                width = x2 - x1
                height = y2 - y1
                
                detections.append({
                    "id": j,
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                        "width": width,
                        "height": height
                    }
                })
        
        # Clean up
        os.remove(temp_path)
        
        return jsonify({
            "detections": detections,
            "count": len(detections),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    except Exception as e:
        logger.error(f"Error in object detection: {str(e)}")
        return jsonify({"error": f"Error detecting objects: {str(e)}"}), 500
