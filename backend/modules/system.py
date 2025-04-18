from flask import Blueprint, request, jsonify
import os
import time
import logging
import psutil
import platform
from datetime import datetime
import google.generativeai as genai
from config import GEMINI_API_KEY

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
system_bp = Blueprint('system', __name__)

@system_bp.route('/system-status', methods=['GET'])
def system_status():
    """Get the current system status"""
    try:
        # Check if Gemini API is available
        gemini_available = False
        try:
            if GEMINI_API_KEY:
                genai.configure(api_key=GEMINI_API_KEY)
                models = genai.list_models()
                gemini_available = any("gemini" in model.name for model in models)
        except Exception as e:
            logger.error(f"Error checking Gemini API: {str(e)}")
        
        # Get system information
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        # Check if ffmpeg is installed
        ffmpeg_available = False
        try:
            import subprocess
            subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            ffmpeg_available = True
        except:
            pass
        
        # Check if speech recognition model is loaded
        speech_recognition_available = False
        try:
            from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
            speech_recognition_available = True
        except:
            pass
        
        # Check module status
        modules_status = {
            "face_auth": os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'data', 'faces')),
            "object_detection": True,  # Assuming YOLO is installed
            "voice_command": speech_recognition_available and ffmpeg_available,
            "chatbot": gemini_available
        }
        
        return jsonify({
            "status": "online",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu": cpu_percent,
                "memory": memory_percent,
                "disk": disk_percent,
                "platform": platform.system(),
                "python_version": platform.python_version()
            },
            "modules": modules_status,
            "features": {
                "ffmpeg": ffmpeg_available,
                "speech_recognition": speech_recognition_available,
                "gemini": gemini_available
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        return jsonify({
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500
