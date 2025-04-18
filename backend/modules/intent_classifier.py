import os
import torch
import torch.nn as nn
import numpy as np
import json
import logging
import re
import string

logger = logging.getLogger("JARVIS.IntentClassifier")

class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, output_dim, n_layers=1, dropout=0.5):
        super(LSTMClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, n_layers, batch_first=True, dropout=dropout if n_layers > 1 else 0)
        self.fc = nn.Linear(hidden_dim, output_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, text):
        embedded = self.embedding(text)
        output, (hidden, cell) = self.lstm(embedded)
        hidden = self.dropout(hidden[-1])
        return self.fc(hidden)

class IntentClassifier:
    def __init__(self, model_path="models/intent_classifier.pth", vocab_path="models/intent_vocab.json"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        self.intents = [
            "weather", "time", "reminder", "alarm", "music", "lights",
            "temperature", "news", "joke", "calendar", "email", "search",
            "navigation", "call", "message", "general_question"
        ]
        if os.path.exists(vocab_path):
            with open(vocab_path, 'r') as f:
                self.vocab = json.load(f)
            logger.info(f"Loaded vocabulary with {len(self.vocab)} words")
        else:
            logger.warning(f"Vocabulary not found at {vocab_path}, creating simple vocabulary")
            self.vocab = {"<PAD>": 0, "<UNK>": 1}
            common_words = ["weather", "time", "remind", "alarm", "music", "light",
                           "temperature", "news", "joke", "calendar", "email", "search",
                           "navigate", "call", "message", "question", "what", "when", "where",
                           "how", "why", "who", "is", "are", "can", "could", "would", "will",
                           "the", "a", "an", "to", "for", "in", "on", "at", "by", "with", "about"]
            for word in common_words:
                self.vocab[word] = len(self.vocab)
            with open(vocab_path, 'w') as f:
                json.dump(self.vocab, f)
        self.model = LSTMClassifier(
            vocab_size=len(self.vocab),
            embedding_dim=100,
            hidden_dim=128,
            output_dim=len(self.intents),
            n_layers=2
        ).to(self.device)
        if os.path.exists(model_path):
            logger.info(f"Loading intent classifier model from {model_path}")
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        else:
            logger.warning(f"Model not found at {model_path}, using untrained model")
        self.model.eval()
        self.rules = {
            r"weather|forecast|temperature outside|rain|sunny": "weather",
            r"time|clock|hour|minute": "time",
            r"remind|reminder|remember|forget": "reminder",
            r"alarm|wake|alert": "alarm",
            r"music|song|play|spotify|artist": "music",
            r"light|lamp|bright|dark": "lights",
            r"thermostat|heat|cool|ac|temperature inside": "temperature",
            r"news|headline|report": "news",
            r"joke|funny|laugh": "joke",
            r"calendar|schedule|meeting|appointment": "calendar",
            r"email|mail|gmail|outlook|message": "email",
            r"search|find|google|look up": "search",
            r"navigate|direction|map|route|go to": "navigation",
            r"call|phone|dial|ring": "call",
            r"text|sms|message|whatsapp": "message"
        }

    def _preprocess_text(self, text):
        text = text.lower()
        text = text.translate(str.maketrans('', '', string.punctuation))
        tokens = text.split()
        indices = []
        for token in tokens:
            if token in self.vocab:
                indices.append(self.vocab[token])
            else:
                indices.append(self.vocab["<UNK>"])
        if len(indices) < 20:
            indices = indices + [self.vocab["<PAD>"]] * (20 - len(indices))
        else:
            indices = indices[:20]
        return torch.LongTensor(indices).unsqueeze(0).to(self.device)

    def _rule_based_classify(self, text):
        text = text.lower()
        for pattern, intent in self.rules.items():
            if re.search(pattern, text):
                return intent
        return "general_question"

    def classify(self, text):
        try:
            text_tensor = self._preprocess_text(text)
            with torch.no_grad():
                output = self.model(text_tensor)
                _, predicted = torch.max(output, 1)
                intent = self.intents[predicted.item()]
                confidence = torch.softmax(output, 1).max().item()
                if confidence > 0.7:
                    logger.info(f"Classified intent: {intent} (confidence: {confidence:.2f})")
                    return intent
        except Exception as e:
            logger.error(f"Error in model-based intent classification: {str(e)}")
        intent = self._rule_based_classify(text)
        logger.info(f"Classified intent (rule-based): {intent}")
        return intent
