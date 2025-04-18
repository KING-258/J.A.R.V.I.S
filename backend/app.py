from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging

from modules.chat import chat_bp
from modules.audio import audio_bp
from modules.vision import vision_bp
from modules.auth import auth_bp
from modules.system import system_bp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

app.register_blueprint(chat_bp, url_prefix='/api')
app.register_blueprint(audio_bp, url_prefix='/api')
app.register_blueprint(vision_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(system_bp, url_prefix='/api')

@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "message": "J.A.R.V.I.S API is running",
        "version": "1.0.0"
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
