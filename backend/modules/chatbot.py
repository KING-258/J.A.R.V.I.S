import os
import json
import logging
import requests
import random
from datetime import datetime

logger = logging.getLogger("JARVIS.Chatbot")

class Chatbot:
    def __init__(self, api_key=None, history_path="data/chat_history"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("No Gemini API key provided. Using fallback responses.")
        os.makedirs(history_path, exist_ok=True)
        self.history_path = history_path
        self.fallback_responses = {
            "greeting": [
                "Hello! How can I assist you today?",
                "Hi there! I'm JARVIS, your AI assistant. What can I do for you?",
                "Greetings! How may I help you?"
            ],
            "farewell": [
                "Goodbye! Have a great day!",
                "See you later! Feel free to ask if you need anything else.",
                "Farewell! I'll be here if you need assistance."
            ],
            "unknown": [
                "I'm not sure I understand. Could you please rephrase that?",
                "I'm still learning. Could you try asking in a different way?",
                "I don't have enough information to respond to that properly."
            ],
            "weather": [
                "I'm sorry, I don't have access to real-time weather data at the moment.",
                "To provide weather information, I would need to connect to a weather service.",
                "I can't check the weather right now, but I can help with other tasks."
            ],
            "time": [
                f"The current time is {datetime.now().strftime('%H:%M')}.",
                f"It's currently {datetime.now().strftime('%I:%M %p')}.",
                f"The time is {datetime.now().strftime('%H:%M:%S')}."
            ],
            "calendar": [
                "You have 3 meetings scheduled for today.",
                "Your next meeting is at 2:00 PM with the project team.",
                "You have a client call at 4:30 PM today."
            ],
            "joke": [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? Because he was outstanding in his field!",
                "What do you call a fake noodle? An impasta!"
            ],
            "compliment": [
                "Thank you! I'm designed to be helpful.",
                "I appreciate your kind words!",
                "Thank you for the compliment. I'm here to assist you."
            ],
            "help": [
                "I can help with various tasks like answering questions, setting reminders, checking your calendar, and more. Just ask!",
                "You can ask me about the weather, time, your schedule, or general knowledge questions.",
                "I'm here to assist with information, reminders, and other tasks. What would you like help with?"
            ]
        }

    def _load_history(self, user_id):
        history_file = os.path.join(self.history_path, f"{user_id}.json")
        if os.path.exists(history_file):
            try:
                with open(history_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading chat history: {str(e)}")
        return []

    def _save_history(self, user_id, history):
        history_file = os.path.join(self.history_path, f"{user_id}.json")
        try:
            with open(history_file, 'w') as f:
                json.dump(history, f)
        except Exception as e:
            logger.error(f"Error saving chat history: {str(e)}")

    def get_response(self, message, user_id="guest"):
        history = self._load_history(user_id)
        history.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        if self.api_key:
            try:
                messages = []
                for entry in history[-5:]:
                    role = "user" if entry["role"] == "user" else "model"
                    messages.append({"role": role, "parts": [{"text": entry["content"]}]})
                if not any(msg.get("role") == "system" for msg in messages):
                    messages.insert(0, {
                        "role": "system",
                        "parts": [{"text": "You are JARVIS, an AI assistant. Be helpful, concise, and friendly."}]
                    })
                url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
                headers = {
                    "Content-Type": "application/json",
                    "x-goog-api-key": self.api_key
                }
                data = {
                    "contents": messages,
                    "generationConfig": {
                        "temperature": 0.7,
                        "topP": 0.95,
                        "topK": 40,
                        "maxOutputTokens": 1024
                    }
                }
                response = requests.post(url, headers=headers, json=data)
                response_json = response.json()
                if response.status_code == 200 and "candidates" in response_json:
                    bot_response = response_json["candidates"][0]["content"]["parts"][0]["text"]
                    logger.info(f"Got response from Gemini API")
                else:
                    logger.warning(f"Error from Gemini API: {response_json.get('error', {}).get('message', 'Unknown error')}")
                    bot_response = self._get_fallback_response(message)
            except Exception as e:
                logger.error(f"Error calling Gemini API: {str(e)}")
                bot_response = self._get_fallback_response(message)
        else:
            bot_response = self._get_fallback_response(message)
        history.append({
            "role": "assistant",
            "content": bot_response,
            "timestamp": datetime.now().isoformat()
        })
        self._save_history(user_id, history)
        return bot_response

    def _get_fallback_response(self, message):
        message = message.lower()
        if any(word in message for word in ["hi", "hello", "hey"]):
            return random.choice(self.fallback_responses["greeting"])
        elif any(word in message for word in ["bye", "goodbye", "see you"]):
            return random.choice(self.fallback_responses["farewell"])
        elif any(word in message for word in ["weather", "temperature", "forecast"]):
            return random.choice(self.fallback_responses["weather"])
        elif any(word in message for word in ["time", "clock", "hour"]):
            return random.choice(self.fallback_responses["time"])
        elif any(word in message for word in ["calendar", "schedule", "meeting", "appointment"]):
            return random.choice(self.fallback_responses["calendar"])
        elif any(word in message for word in ["joke", "funny", "laugh"]):
            return random.choice(self.fallback_responses["joke"])
        elif any(word in message for word in ["thanks", "thank you", "good job", "well done"]):
            return random.choice(self.fallback_responses["compliment"])
        elif any(word in message for word in ["help", "assist", "support", "what can you do"]):
            return random.choice(self.fallback_responses["help"])
        else:
            return random.choice(self.fallback_responses["unknown"])
