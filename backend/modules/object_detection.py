import os
import cv2
import numpy as np
import torch
import base64
import logging
from io import BytesIO
from PIL import Image

logger = logging.getLogger("JARVIS.ObjectDetection")

class ObjectDetector:
    def __init__(self, model_path="models/yolov8n.pt"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            logger.info(f"Loaded YOLOv8 model from {model_path}")
        except Exception as e:
            logger.error(f"Error loading YOLOv8 model: {str(e)}")
            logger.info("Downloading YOLOv8 model...")
            try:
                from ultralytics import YOLO
                self.model = YOLO("yolov8n.pt")
                self.model.save(model_path)
                logger.info(f"Downloaded and saved YOLOv8 model to {model_path}")
            except Exception as e:
                logger.error(f"Error downloading YOLOv8 model: {str(e)}")
                self._init_fallback_detector()

    def _init_fallback_detector(self):
        logger.warning("Using fallback object detector with OpenCV")
        self.use_fallback = True
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.body_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_fullbody.xml')
        self.fallback_classes = {
            0: "face",
            1: "person"
        }

    def _preprocess_image(self, image_data):
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        image = np.array(image)
        if image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        return image

    def _fallback_detect(self, image):
        detections = []
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        for i, (x, y, w, h) in enumerate(faces):
            detections.append({
                "id": i,
                "class_id": 0,
                "class_name": "face",
                "confidence": 0.8,
                "bbox": {
                    "x1": float(x),
                    "y1": float(y),
                    "x2": float(x + w),
                    "y2": float(y + h),
                    "width": float(w),
                    "height": float(h)
                }
            })
        bodies = self.body_cascade.detectMultiScale(gray, 1.1, 4)
        for i, (x, y, w, h) in enumerate(bodies):
            detections.append({
                "id": len(faces) + i,
                "class_id": 1,
                "class_name": "person",
                "confidence": 0.7,
                "bbox": {
                    "x1": float(x),
                    "y1": float(y),
                    "x2": float(x + w),
                    "y2": float(y + h),
                    "width": float(w),
                    "height": float(h)
                }
            })
        return detections

    def detect(self, image_data):
        try:
            image = self._preprocess_image(image_data)
            if hasattr(self, 'use_fallback') and self.use_fallback:
                return self._fallback_detect(image)
            results = self.model(image)
            detections = []
            for result in results:
                boxes = result.boxes
                for i, box in enumerate(boxes):
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    confidence = box.conf[0].item()
                    class_id = int(box.cls[0].item())
                    class_name = result.names[class_id]
                    detections.append({
                        "id": i,
                        "class_id": class_id,
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                            "width": x2 - x1,
                            "height": y2 - y1
                        }
                    })
            logger.info(f"Detected {len(detections)} objects")
            return detections
        except Exception as e:
            logger.error(f"Error in object detection: {str(e)}")
            if not hasattr(self, 'use_fallback'):
                self._init_fallback_detector()
            return self._fallback_detect(image)
