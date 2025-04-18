from flask import Blueprint, request, jsonify
import os
import time
import logging
import base64
import numpy as np
import cv2
import face_recognition
import json
from config import FACE_DATABASE_PATH, FACE_RECOGNITION_THRESHOLD

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

def get_face_database():
    face_db = {}
    try:
        db_file = os.path.join(FACE_DATABASE_PATH, 'face_db.json')
        if os.path.exists(db_file):
            with open(db_file, 'r') as f:
                user_data = json.load(f)
            for user_id, data in user_data.items():
                encoding_file = os.path.join(FACE_DATABASE_PATH, f"{user_id}.npy")
                if os.path.exists(encoding_file):
                    face_db[user_id] = {
                        'name': data['name'],
                        'role': data['role'],
                        'encoding': np.load(encoding_file)
                    }
    except Exception as e:
        logger.error(f"Error loading face database: {str(e)}")
    return face_db

def save_face_database(face_db):
    try:
        user_data = {}
        for user_id, data in face_db.items():
            user_data[user_id] = {
                'name': data['name'],
                'role': data['role']
            }
            encoding_file = os.path.join(FACE_DATABASE_PATH, f"{user_id}.npy")
            np.save(encoding_file, data['encoding'])
        db_file = os.path.join(FACE_DATABASE_PATH, 'face_db.json')
        with open(db_file, 'w') as f:
            json.dump(user_data, f)
        return True
    except Exception as e:
        logger.error(f"Error saving face database: {str(e)}")
        return False

@auth_bp.route('/face-auth', methods=['POST'])
def face_auth():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "Invalid request. 'image' is required"}), 400
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_image)
        if not face_locations:
            return jsonify({
                "authenticated": False,
                "confidence": 0.0,
                "message": "No face detected in the image"
            }), 200
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        face_db = get_face_database()
        if not face_db:
            return jsonify({
                "authenticated": False,
                "confidence": 0.0,
                "message": "No users enrolled in the system"
            }), 200
        best_match = None
        best_confidence = 0.0
        for user_id, data in face_db.items():
            matches = face_recognition.compare_faces([data['encoding']], face_encodings[0])
            if matches[0]:
                face_distance = face_recognition.face_distance([data['encoding']], face_encodings[0])[0]
                confidence = 1.0 - face_distance
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = user_id
        if best_match and best_confidence >= FACE_RECOGNITION_THRESHOLD:
            return jsonify({
                "authenticated": True,
                "user_id": best_match,
                "name": face_db[best_match]['name'],
                "confidence": best_confidence,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 200
        else:
            return jsonify({
                "authenticated": False,
                "confidence": best_confidence,
                "message": "Face not recognized or confidence too low"
            }), 200
    except Exception as e:
        logger.error(f"Error in face authentication: {str(e)}")
        return jsonify({"error": f"Error during authentication: {str(e)}"}), 500

@auth_bp.route('/face-enroll', methods=['POST'])
def face_enroll():
    try:
        data = request.json
        if not data or 'image' not in data or 'user_id' not in data or 'name' not in data:
            return jsonify({"error": "Invalid request. 'image', 'user_id', and 'name' are required"}), 400
        image_data = data['image']
        user_id = data['user_id']
        name = data['name']
        role = data.get('role', 'user')
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_image)
        if not face_locations:
            return jsonify({
                "success": False,
                "message": "No face detected in the image"
            }), 200
        if len(face_locations) > 1:
            return jsonify({
                "success": False,
                "message": "Multiple faces detected. Please provide an image with only one face."
            }), 200
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        face_db = get_face_database()
        if user_id in face_db:
            return jsonify({
                "success": False,
                "message": f"User ID '{user_id}' already exists. Please choose a different ID."
            }), 200
        face_db[user_id] = {
            'name': name,
            'role': role,
            'encoding': face_encodings[0]
        }
        if save_face_database(face_db):
            return jsonify({
                "success": True,
                "message": f"User '{name}' enrolled successfully with ID '{user_id}'",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "Error saving face database"
            }), 500
    except Exception as e:
        logger.error(f"Error in face enrollment: {str(e)}")
        return jsonify({"error": f"Error during enrollment: {str(e)}"}), 500
