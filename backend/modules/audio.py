from flask import Blueprint, request, jsonify
import os
import time
import logging
import torch
import soundfile as sf
import numpy as np
import base64
import io
import subprocess
import google.generativeai as genai
from gtts import gTTS
from config import GEMINI_API_KEY, GEMINI_MODEL, AUDIO_UPLOAD_FOLDER

logger = logging.getLogger(__name__)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

audio_bp = Blueprint('audio', __name__)

def get_gemini_model():
    try:
        return genai.GenerativeModel(GEMINI_MODEL)
    except Exception as e:
        logger.error(f"Error initializing Gemini model: {str(e)}")
        return None

def convert_audio_to_wav(input_file, output_file):
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        subprocess.run([
            "ffmpeg", 
            "-i", input_file, 
            "-ar", "16000", 
            "-ac", "1", 
            "-y", 
            output_file
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error(f"Error converting audio with ffmpeg: {str(e)}")
        return False

def transcribe_audio_with_nlp(audio_path):
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            logger.info(f"Transcribed with Google Speech Recognition: {text}")
            return text
    except ImportError:
        logger.warning("SpeechRecognition library not available, trying alternative methods")
    except Exception as e:
        logger.error(f"Error with SpeechRecognition: {str(e)}")
    try:
        from transformers import pipeline
        transcriber = pipeline("automatic-speech-recognition")
        result = transcriber(audio_path)
        text = result["text"]
        logger.info(f"Transcribed with transformers pipeline: {text}")
        return text
    except ImportError:
        logger.warning("Transformers library not available")
    except Exception as e:
        logger.error(f"Error with transformers pipeline: {str(e)}")
    return "Speech recognition failed. Please ensure required libraries are installed."

@audio_bp.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400
        temp_input_path = os.path.join(AUDIO_UPLOAD_FOLDER, f"temp_input_{int(time.time())}")
        temp_output_path = os.path.join(AUDIO_UPLOAD_FOLDER, f"temp_output_{int(time.time())}.wav")
        audio_file.save(temp_input_path)
        conversion_success = convert_audio_to_wav(temp_input_path, temp_output_path)
        if not conversion_success:
            return jsonify({"transcription": "Audio conversion failed. Please try a different format."}), 200
        transcription = transcribe_audio_with_nlp(temp_output_path)
        try:
            os.remove(temp_input_path)
            os.remove(temp_output_path)
        except:
            pass
        return jsonify({"transcription": transcription}), 200
    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}")
        return jsonify({"transcription": "I couldn't process that audio. Please try again."}), 200

@audio_bp.route('/tts', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "Invalid request. 'text' is required"}), 400
        text = data.get('text')
        tts = gTTS(text=text, lang='en')
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        audio_base64 = base64.b64encode(mp3_fp.read()).decode('utf-8')
        return jsonify({
            "audio": audio_base64,
            "format": "mp3",
            "text": text
        })
    except Exception as e:
        logger.error(f"Error in text-to-speech: {str(e)}")
        return jsonify({"error": f"Error generating speech: {str(e)}"}), 500

@audio_bp.route('/voice-command', methods=['POST'])
def voice_command():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400
        temp_input_path = os.path.join(AUDIO_UPLOAD_FOLDER, f"temp_input_{int(time.time())}")
        temp_output_path = os.path.join(AUDIO_UPLOAD_FOLDER, f"temp_output_{int(time.time())}.wav")
        audio_file.save(temp_input_path)
        conversion_success = convert_audio_to_wav(temp_input_path, temp_output_path)
        if not conversion_success:
            return jsonify({
                "command": "Audio conversion failed",
                "intent": "error",
                "response": "I couldn't process that audio format. Please try a different format."
            }), 200
        transcription = transcribe_audio_with_nlp(temp_output_path)
        try:
            os.remove(temp_input_path)
            os.remove(temp_output_path)
        except:
            pass
        if not transcription or len(transcription.strip()) < 2:
            return jsonify({
                "command": "Empty transcription",
                "intent": "error",
                "response": "I didn't hear anything. Please try speaking again."
            }), 200
        model = get_gemini_model()
        if not model:
            return jsonify({
                "command": transcription,
                "intent": "general_query",
                "response": "I understood what you said, but I'm having trouble generating a response right now."
            }), 200
        try:
            prompt = f"""
            The user said: "{transcription}"
            
            1. Identify the intent of this voice command.
            2. Provide a helpful response.
            
            Format your response as:
            Intent: [intent_category]
            Response: [your helpful response]
            """
            response = model.generate_content(prompt)
            response_text = response.text
            intent = "general_query"
            gemini_response = response_text
            if "Intent:" in response_text and "Response:" in response_text:
                intent_part = response_text.split("Intent:")[1].split("Response:")[0].strip()
                response_part = response_text.split("Response:")[1].strip()
                intent = intent_part.lower().replace(" ", "_")
                gemini_response = response_part
            tts = gTTS(text=gemini_response, lang='en')
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            audio_base64 = base64.b64encode(mp3_fp.read()).decode('utf-8')
            return jsonify({
                "command": transcription,
                "intent": intent,
                "response": gemini_response,
                "audio": audio_base64,
                "format": "mp3",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
        except Exception as e:
            logger.error(f"Error processing with Gemini: {str(e)}")
            return jsonify({
                "command": transcription,
                "intent": "general_query",
                "response": f"I heard: '{transcription}', but I'm having trouble processing your request."
            }), 200
    except Exception as e:
        logger.error(f"Error in voice command: {str(e)}")
        return jsonify({
            "command": "Processing error",
            "intent": "error",
            "response": "I encountered an error while processing your voice command. Please try again."
        }), 200
