import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import base64
import json
import logging
from io import BytesIO
from PIL import Image
from datetime import datetime

logger = logging.getLogger("JARVIS.FaceAuth")

class FaceNetLSTM(nn.Module):
    def __init__(self, hidden_size=256, num_layers=2, embedding_size=512):
        super(FaceNetLSTM, self).__init__()
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, stride=1, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.pool = nn.MaxPool2d(2, 2)
        self.cnn_output_size = 128 * 8 * 8
        self.lstm = nn.LSTM(
            input_size=self.cnn_output_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True
        )
        self.fc1 = nn.Linear(hidden_size, 512)
        self.dropout = nn.Dropout(0.5)
        self.fc2 = nn.Linear(512, embedding_size)
        
    def forward(self, x):
        x = self.pool(torch.relu(self.bn1(self.conv1(x))))
        x = self.pool(torch.relu(self.bn2(self.conv2(x))))
        x = self.pool(torch.relu(self.bn3(self.conv3(x))))
        batch_size = x.size(0)
        x = x.view(batch_size, 1, -1)
        lstm_out, (hidden, cell) = self.lstm(x)
        x = hidden[-1]
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        
        return x

class FaceAuthenticator:
    def __init__(self, model_path="models/facenet_lstm.pth", db_path="data/face_embeddings/face_db.json"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.model = FaceNetLSTM().to(self.device)
        if os.path.exists(model_path):
            logger.info(f"Loading face model from {model_path}")
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        else:
            logger.warning(f"Model not found at {model_path}, using untrained model")
        
        self.model.eval()
        self.db_path = db_path
        self.face_db = {}
        
        if os.path.exists(db_path):
            with open(db_path, 'r') as f:
                self.face_db = json.load(f)
            logger.info(f"Loaded {len(self.face_db)} face embeddings from database")
        else:
            logger.warning(f"Face database not found at {db_path}, creating empty database")
            self._save_db()
    
    def _save_db(self):
        with open(self.db_path, 'w') as f:
            json.dump(self.face_db, f)
    
    def _preprocess_image(self, image_data):
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        image = np.array(image)
        if image.shape[2] == 4:  
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            logger.warning("No face detected in the image")
            return None
        x, y, w, h = max(faces, key=lambda rect: rect[2] * rect[3])
        face = image[y:y+h, x:x+w]
        face = cv2.resize(face, (64, 64))
        face = face / 255.0
        face = np.transpose(face, (2, 0, 1))
        face = torch.FloatTensor(face).unsqueeze(0).to(self.device)
        
        return face
    
    def _cosine_similarity(self, embedding1, embedding2):
        if isinstance(embedding1, list):
            embedding1 = torch.tensor(embedding1).to(self.device)
        if isinstance(embedding2, list):
            embedding2 = torch.tensor(embedding2).to(self.device)
            
        return torch.nn.functional.cosine_similarity(embedding1, embedding2, dim=0).item()
    
    def authenticate(self, image_data):
        face = self._preprocess_image(image_data)
        if face is None:
            return None, 0.0
        with torch.no_grad():
            embedding = self.model(face).squeeze().cpu().numpy().tolist()
        best_match = None
        best_similarity = -1
        
        for user_id, user_data in self.face_db.items():
            similarity = self._cosine_similarity(embedding, user_data["embedding"])
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = user_id
        threshold = 0.7
        
        if best_similarity >= threshold:
            logger.info(f"User {best_match} authenticated with confidence {best_similarity:.2f}")
            return best_match, best_similarity
        else:
            logger.info(f"Authentication failed. Best match: {best_match}, confidence: {best_similarity:.2f}")
            return None, best_similarity
    def enroll(self, image_data, user_id, name, role="user"):
        face = self._preprocess_image(image_data)
        if face is None:
            return False, "No face detected"
        with torch.no_grad():
            embedding = self.model(face).squeeze().cpu().numpy().tolist()
        self.face_db[user_id] = {
            "name": name,
            "embedding": embedding,
            "role": role,
            "enrolled_at": datetime.now().isoformat()
        }
        self._save_db()
        
        logger.info(f"Enrolled new user: {user_id} ({name})")
        return True, "User enrolled successfully"