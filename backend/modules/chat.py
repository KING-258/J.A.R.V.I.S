from flask import Blueprint, request, jsonify
import google.generativeai as genai
import logging
import time
from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)

chat_bp = Blueprint('chat', __name__)

def get_gemini_model():
    try:
        return genai.GenerativeModel(GEMINI_MODEL)
    except Exception as e:
        logger.error(f"Error initializing Gemini model: {str(e)}")
        return None

@chat_bp.route('/gemini-chat', methods=['POST'])
def gemini_chat():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "Invalid request. 'message' is required"}), 400
        user_message = data.get('message')
        user_id = data.get('user_id', 'guest')
        history = data.get('history', [])
        chat_history = []
        for msg in history:
            if msg['role'] == 'user':
                chat_history.append({'role': 'user', 'parts': [msg['content']]})
            else:
                chat_history.append({'role': 'model', 'parts': [msg['content']]})
        model = get_gemini_model()
        if not model:
            return jsonify({"error": "Failed to initialize Gemini model"}), 500
        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message)
        return jsonify({
            "response": response.text,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"Error in Gemini chat: {str(e)}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 500

@chat_bp.route('/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "Invalid request. 'message' is required"}), 400
        user_message = data.get('message')
        user_id = data.get('user_id', 'guest')
        model = get_gemini_model()
        if not model:
            return jsonify({"error": "Failed to initialize Gemini model"}), 500
        response = model.generate_content(user_message)
        return jsonify({
            "response": response.text,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"Error in chatbot: {str(e)}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 500
