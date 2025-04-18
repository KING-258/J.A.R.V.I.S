import os
from dotenv import load_dotenv
load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = "gemini-1.5-pro"
SPEECH_MODEL = "wav2vec2-base-960h"
OBJECT_DETECTION_MODEL = "yolov8n.pt"
FACE_RECOGNITION_THRESHOLD = 0.6
FACE_DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'faces')
os.makedirs(FACE_DATABASE_PATH, exist_ok=True)
AUDIO_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'audio')
os.makedirs(AUDIO_UPLOAD_FOLDER, exist_ok=True)
IMAGE_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'images')
os.makedirs(IMAGE_UPLOAD_FOLDER, exist_ok=True)
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')
