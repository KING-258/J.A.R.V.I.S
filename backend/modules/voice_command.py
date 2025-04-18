import os
import numpy as np
import torch
import torch.nn as nn
import logging
import tempfile
import wave
import struct

logger = logging.getLogger("JARVIS.VoiceCommand")

class AudioCNN(nn.Module):
    """CNN model for audio classification"""
    def __init__(self, n_mels=64, n_classes=10):
        super(AudioCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, stride=1, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(64 * (n_mels // 4) * 32, 128)
        self.dropout = nn.Dropout(0.5)
        self.fc2 = nn.Linear(128, n_classes)
        
    def forward(self, x):
        x = self.pool(torch.relu(self.bn1(self.conv1(x))))
        x = self.pool(torch.relu(self.bn2(self.conv2(x))))
        x = x.view(x.size(0), -1)
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x

class VoiceCommandRecognizer:
    def __init__(self, model_path="models/voice_command.pth"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Create model directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        # Define command classes
        self.commands = [
            "turn_on_lights", "turn_off_lights", "set_temperature", 
            "play_music", "stop_music", "what_time", "weather_forecast",
            "set_timer", "add_reminder", "unknown"
        ]
        
        # Initialize the model
        self.model = AudioCNN(n_classes=len(self.commands)).to(self.device)
        
        # Load model if exists, otherwise use a new one
        if os.path.exists(model_path):
            logger.info(f"Loading voice command model from {model_path}")
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        else:
            logger.warning(f"Model not found at {model_path}, using untrained model")
            # In a real system, you would train the model or download a pre-trained one
        
        self.model.eval()
        
        # Audio preprocessing
        self.sample_rate = 16000
        self.n_mels = 64
        
        # Try to import audio processing libraries
        try:
            import torchaudio
            self.mel_spectrogram = torchaudio.transforms.MelSpectrogram(
                sample_rate=self.sample_rate,
                n_fft=1024,
                hop_length=512,
                n_mels=self.n_mels
            )
            self.amplitude_to_db = torchaudio.transforms.AmplitudeToDB()
            self.torchaudio_available = True
            logger.info("Using torchaudio for audio processing")
        except ImportError:
            self.torchaudio_available = False
            logger.warning("torchaudio not available, using fallback audio processing")
        
        # For demo purposes, let's use SpeechRecognition as a fallback
        try:
            import speech_recognition as sr
            self.recognizer = sr.Recognizer()
            self.use_sr_fallback = True
            logger.info("Using SpeechRecognition as fallback")
        except ImportError:
            self.use_sr_fallback = False
            logger.warning("SpeechRecognition not available, using only CNN model")
    
    def _compute_mel_spectrogram(self, waveform, sample_rate):
        """Compute mel spectrogram using numpy (fallback method)"""
        # Simple FFT-based spectrogram
        n_fft = 1024
        hop_length = 512
        
        # Compute STFT
        fft_window = np.hanning(n_fft)
        num_frames = 1 + (len(waveform) - n_fft) // hop_length
        stft = np.zeros((n_fft // 2 + 1, num_frames), dtype=complex)
        
        for i in range(num_frames):
            start = i * hop_length
            end = start + n_fft
            if end <= len(waveform):
                frame = waveform[start:end] * fft_window
                stft[:, i] = np.fft.rfft(frame)
        
        # Convert to power spectrogram
        power_spectrogram = np.abs(stft) ** 2
        
        # Simple mel filterbank (approximation)
        n_mels = self.n_mels
        mel_filters = np.random.rand(n_fft // 2 + 1, n_mels)  # Placeholder for actual mel filters
        mel_spec = np.dot(power_spectrogram.T, mel_filters)
        
        # Convert to dB scale
        mel_spec_db = 10 * np.log10(mel_spec + 1e-10)
        
        # Normalize
        mel_spec_db = (mel_spec_db - np.mean(mel_spec_db)) / (np.std(mel_spec_db) + 1e-10)
        
        return mel_spec_db
    
    def _preprocess_audio(self, audio_file):
        """Preprocess audio for the model"""
        # Save audio file to a temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
            audio_file.save(temp_path)
        
        try:
            if self.torchaudio_available:
                import torchaudio
                # Load audio
                waveform, sample_rate = torchaudio.load(temp_path)
                
                # Resample if needed
                if sample_rate != self.sample_rate:
                    resampler = torchaudio.transforms.Resample(sample_rate, self.sample_rate)
                    waveform = resampler(waveform)
                
                # Convert to mono if stereo
                if waveform.shape[0] > 1:
                    waveform = torch.mean(waveform, dim=0, keepdim=True)
                
                # Pad or truncate to 4 seconds
                target_length = 4 * self.sample_rate
                if waveform.shape[1] < target_length:
                    waveform = torch.nn.functional.pad(waveform, (0, target_length - waveform.shape[1]))
                else:
                    waveform = waveform[:, :target_length]
                
                # Compute mel spectrogram
                mel_spec = self.mel_spectrogram(waveform)
                
                # Convert to decibels
                mel_spec = self.amplitude_to_db(mel_spec)
                
                # Normalize
                mel_spec = (mel_spec - mel_spec.mean()) / mel_spec.std()
                
                # Add batch dimension
                mel_spec = mel_spec.unsqueeze(0).to(self.device)
                
                return mel_spec, temp_path
            else:
                # Fallback to numpy-based processing
                with wave.open(temp_path, 'rb') as wav_file:
                    n_channels = wav_file.getnchannels()
                    sample_width = wav_file.getsampwidth()
                    sample_rate = wav_file.getframerate()
                    n_frames = wav_file.getnframes()
                    
                    # Read all frames
                    frames = wav_file.readframes(n_frames)
                    
                    # Convert to numpy array
                    if sample_width == 2:  # 16-bit audio
                        dtype = np.int16
                    elif sample_width == 4:  # 32-bit audio
                        dtype = np.int32
                    else:  # 8-bit audio
                        dtype = np.uint8
                    
                    waveform = np.frombuffer(frames, dtype=dtype)
                    
                    # Convert to float and normalize
                    waveform = waveform.astype(np.float32) / np.iinfo(dtype).max
                    
                    # If stereo, convert to mono
                    if n_channels == 2:
                        waveform = waveform.reshape(-1, 2).mean(axis=1)
                    
                    # Resample if needed (simple method)
                    if sample_rate != self.sample_rate:
                        # Simple resampling by linear interpolation
                        original_length = len(waveform)
                        target_length = int(original_length * self.sample_rate / sample_rate)
                        indices = np.linspace(0, original_length - 1, target_length)
                        waveform = np.interp(indices, np.arange(original_length), waveform)
                    
                    # Pad or truncate to 4 seconds
                    target_length = 4 * self.sample_rate
                    if len(waveform) < target_length:
                        waveform = np.pad(waveform, (0, target_length - len(waveform)))
                    else:
                        waveform = waveform[:target_length]
                    
                    # Compute mel spectrogram
                    mel_spec = self._compute_mel_spectrogram(waveform, self.sample_rate)
                    
                    # Convert to tensor
                    mel_spec = torch.FloatTensor(mel_spec).unsqueeze(0).unsqueeze(0).to(self.device)
                    
                    return mel_spec, temp_path
                
        except Exception as e:
            logger.error(f"Error preprocessing audio: {str(e)}")
            return None, temp_path
    
    def recognize(self, audio_file):
        """Recognize command from audio"""
        mel_spec, temp_path = self._preprocess_audio(audio_file)
        
        # Try CNN model first
        if mel_spec is not None:
            try:
                with torch.no_grad():
                    outputs = self.model(mel_spec)
                    _, predicted = torch.max(outputs, 1)
                    command = self.commands[predicted.item()]
                
                # If the model is confident, return the command
                if command != "unknown" and torch.softmax(outputs, 1).max().item() > 0.7:
                    logger.info(f"Recognized command: {command}")
                    return command
            except Exception as e:
                logger.error(f"Error in CNN recognition: {str(e)}")
        
        # Fallback to SpeechRecognition if available
        if self.use_sr_fallback:
            try:
                import speech_recognition as sr
                with sr.AudioFile(temp_path) as source:
                    audio_data = self.recognizer.record(source)
                    text = self.recognizer.recognize_google(audio_data)
                    logger.info(f"Recognized text (fallback): {text}")
                    return text
            except Exception as e:
                logger.error(f"Error in SpeechRecognition fallback: {str(e)}")
        
        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except:
            pass
        
        return "unknown"
