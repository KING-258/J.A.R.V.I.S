import os
import base64
import numpy as np
import cv2
import logging

# Configure logging
logger = logging.getLogger(__name__)

def decode_base64_image(base64_string):
    """
    Decode a base64 string to an image
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        numpy array: Decoded image
    """
    try:
        # Remove the data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
            
        # Decode base64 image
        image_bytes = base64.b64decode(base64_string)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        return image
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        return None

def encode_image_to_base64(image):
    """
    Encode an image to base64
    
    Args:
        image: Image as numpy array
        
    Returns:
        str: Base64 encoded image string
    """
    try:
        # Encode image to JPEG
        _, buffer = cv2.imencode('.jpg', image)
        
        # Convert to base64
        base64_string = base64.b64encode(buffer).decode('utf-8')
        
        return base64_string
    except Exception as e:
        logger.error(f"Error encoding image to base64: {str(e)}")
        return None
