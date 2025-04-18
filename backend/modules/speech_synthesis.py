import os
import logging
import tempfile
import numpy as np
from io import BytesIO

logger = logging.getLogger("JARVIS.SpeechSynthesis")

class SpeechSynthesizer:
    def __init__(self):
        # Try to import TTS libraries
        self.tts_available = False
        
        try:
            import torch
            import torchaudio
            self.torch_available = True
            logger.info("PyTorch and torchaudio available for TTS")
        except ImportError:
            self.torch_available = False
            logger.warning("PyTorch or torchaudio not available")
        
        # Try to import pyttsx3 as fallback
        try:
            import pyttsx3
            self.pyttsx3 = pyttsx3.init()
            self.pyttsx3_available = True
            logger.info("Using pyttsx3 as fallback TTS engine")
        except ImportError:
            self.pyttsx3_available = False
            logger.warning("pyttsx3 not available")
        
        # Try to import gTTS as another fallback
        try:
            from gtts import gTTS
            self.gtts_available = True
            self.gtts = gTTS
            logger.info("Using gTTS as another fallback TTS engine")
        except ImportError:
            self.gtts_available = False
            logger.warning("gTTS not available")
    
    def synthesize(self, text, voice="default"):
        """Synthesize speech from text"""
        # Try using pyttsx3 if available
        if self.pyttsx3_available:
            try:
                # Set voice if specified
                if voice != "default":
                    voices = self.pyttsx3.getProperty('voices')
                    for v in voices:
                        if voice.lower() in v.name.lower():
                            self.pyttsx3.setProperty('voice', v.id)
                            break
                
                # Create a temporary file to save the audio
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_path = temp_file.name
                
                # Generate speech
                self.pyttsx3.save_to_file(text, temp_path)
                self.pyttsx3.runAndWait()
                
                # Read the file
                with open(temp_path, 'rb') as f:
                    audio_data = f.read()
                
                # Clean up
                os.unlink(temp_path)
                
                logger.info(f"Synthesized speech using pyttsx3: {text[:30]}...")
                return audio_data
            
            except Exception as e:
                logger.error(f"Error using pyttsx3 for TTS: {str(e)}")
        
        # Try using gTTS if available
        if self.gtts_available:
            try:
                # Create a BytesIO object to store the audio
                mp3_fp = BytesIO()
                
                # Generate speech
                tts = self.gtts(text=text, lang='en')
                tts.write_to_fp(mp3_fp)
                
                # Get the audio data
                mp3_fp.seek(0)
                audio_data = mp3_fp.read()
                
                logger.info(f"Synthesized speech using gTTS: {text[:30]}...")
                return audio_data
            
            except Exception as e:
                logger.error(f"Error using gTTS for TTS: {str(e)}")
        
        # If all else fails, return an error message
        logger.error("No TTS engine available")
        return b''  # Return empty bytes
