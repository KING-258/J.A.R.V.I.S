import cv2
import os
import time
import argparse
import numpy as np
from datetime import datetime

def create_directory(directory):
    if not os.path.exists(directory):  # Create
        os.makedirs(directory)
        print(f"Created directory: {directory}")

def collect_face_data():
    parser = argparse.ArgumentParser(description='Collect face data for training')
    parser.add_argument('--username', type=str, help='Username for the face data')
    parser.add_argument('--num_images', type=int, default=50, help='Number of images to collect')
    parser.add_argument('--output_dir', type=str, default='data/face_images', help='Output directory for face images')
    args = parser.parse_args()
    username = args.username
    if not username:
        username = input("Enter your username: ")
    user_dir = os.path.join(args.output_dir, username)
    create_directory(user_dir)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    if face_cascade.empty():
        print("Error: Could not load face cascade classifier.")
        cap.release()
        return
    
    print(f"\nCollecting face data for user: {username}")
    print(f"We'll capture {args.num_images} images. Please look at the camera and move your head slightly between captures.")
    print("Press 'q' to quit at any time.\n")
    print("Starting in 3 seconds...")
    time.sleep(3)
    
    images_captured = 0
    min_face_size = (100, 100)
    start_time = time.time()
    frame_count = 0
    
    while images_captured < args.num_images:
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame from webcam.")
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=min_face_size
        )
        frame_display = frame.copy()
        
        if len(faces) > 0:
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            cv2.rectangle(frame_display, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            cv2.putText(frame_display, f"Capturing: {images_captured}/{args.num_images}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            if frame_count % 5 == 0 and images_captured < args.num_images:
                face_roi = frame[y:y+h, x:x+w]
                
                face_roi = cv2.resize(face_roi, (128, 128))
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                filename = f"{username}_{timestamp}_{images_captured}.jpg"
                filepath = os.path.join(user_dir, filename)
                cv2.imwrite(filepath, face_roi)
                
                images_captured += 1
                print(f"Captured image {images_captured}/{args.num_images}")
        else:
            cv2.putText(frame_display, "No face detected", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        frame_count += 1
        elapsed_time = time.time() - start_time
        fps = frame_count / elapsed_time
        cv2.putText(frame_display, f"FPS: {fps:.2f}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        cv2.imshow('Face Data Collection', frame_display)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Data collection interrupted by user.")
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    if images_captured > 0:
        print(f"\nSuccessfully captured {images_captured} face images for user: {username}")
        print(f"Images saved to: {user_dir}")
        print("\nYou can now run train_face_model.py to train the face recognition model.")
    else:
        print("\nNo images were captured. Please try again.")

if __name__ == "__main__":
    create_directory("data")
    create_directory("data/face_images")
    
    collect_face_data()
