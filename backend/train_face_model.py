import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
import json
import time
import argparse
from tqdm import tqdm
import matplotlib.pyplot as plt
from modules.face_auth import FaceNet

class FaceDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.classes = os.listdir(root_dir)
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
        self.samples = []
        for cls_name in self.classes:
            cls_dir = os.path.join(root_dir, cls_name)
            if os.path.isdir(cls_dir):
                for img_name in os.listdir(cls_dir):
                    if img_name.endswith(('.jpg', '.jpeg', '.png')):
                        img_path = os.path.join(cls_dir, img_name)
                        self.samples.append((img_path, self.class_to_idx[cls_name], cls_name))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label, username = self.samples[idx]
        image = cv2.imread(img_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        if self.transform:
            image = self.transform(image)
        return image, label, username

def train_model():
    parser = argparse.ArgumentParser(description='Train face recognition model')
    parser.add_argument('--data_dir', type=str, default='data/face_images', help='Directory containing face images')
    parser.add_argument('--model_dir', type=str, default='models', help='Directory to save the model')
    parser.add_argument('--embeddings_dir', type=str, default='data/face_embeddings', help='Directory to save face embeddings')
    parser.add_argument('--batch_size', type=int, default=16, help='Batch size for training')
    parser.add_argument('--epochs', type=int, default=20, help='Number of epochs to train')
    parser.add_argument('--learning_rate', type=float, default=0.001, help='Learning rate')
    args = parser.parse_args()
    os.makedirs(args.model_dir, exist_ok=True)
    os.makedirs(args.embeddings_dir, exist_ok=True)
    if not os.path.exists(args.data_dir):
        print(f"Error: Data directory {args.data_dir} does not exist.")
        return
    subdirs = [d for d in os.listdir(args.data_dir) if os.path.isdir(os.path.join(args.data_dir, d))]
    if len(subdirs) == 0:
        print(f"Error: No user directories found in {args.data_dir}.")
        print("Please run collect_face_data.py first to collect face data.")
        return
    print(f"Found {len(subdirs)} users: {', '.join(subdirs)}")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    dataset = FaceDataset(args.data_dir, transform=transform)
    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True)
    model = FaceNet().to(device)
    model_path = os.path.join(args.model_dir, 'facenet.pth')
    if os.path.exists(model_path):
        print(f"Loading existing model from {model_path}")
        model.load_state_dict(torch.load(model_path, map_location=device))
    criterion = nn.TripletMarginLoss(margin=0.2)
    optimizer = optim.Adam(model.parameters(), lr=args.learning_rate)
    print(f"\nTraining face recognition model for {args.epochs} epochs...")
    train_losses = []
    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        progress_bar = tqdm(dataloader, desc=f"Epoch {epoch+1}/{args.epochs}")
        for batch_idx, (images, labels, _) in enumerate(progress_bar):
            images = images.to(device)
            optimizer.zero_grad()
            embeddings = model(images)
            triplet_loss = 0
            num_triplets = 0
            for i in range(len(labels)):
                anchor_label = labels[i]
                anchor_embedding = embeddings[i].unsqueeze(0)
                positive_indices = [j for j in range(len(labels)) if labels[j] == anchor_label and j != i]
                negative_indices = [j for j in range(len(labels)) if labels[j] != anchor_label]
                if positive_indices and negative_indices:
                    positive_idx = np.random.choice(positive_indices)
                    negative_idx = np.random.choice(negative_indices)
                    positive_embedding = embeddings[positive_idx].unsqueeze(0)
                    negative_embedding = embeddings[negative_idx].unsqueeze(0)
                    loss = criterion(anchor_embedding, positive_embedding, negative_embedding)
                    triplet_loss += loss
                    num_triplets += 1
            if num_triplets > 0:
                triplet_loss /= num_triplets
                triplet_loss.backward()
                optimizer.step()
                running_loss += triplet_loss.item()
                progress_bar.set_postfix({'loss': triplet_loss.item()})
        epoch_loss = running_loss / len(dataloader)
        train_losses.append(epoch_loss)
        print(f"Epoch {epoch+1}/{args.epochs}, Loss: {epoch_loss:.4f}")
    torch.save(model.state_dict(), model_path)
    print(f"\nModel saved to {model_path}")
    plt.figure(figsize=(10, 5))
    plt.plot(range(1, args.epochs + 1), train_losses, marker='o')
    plt.title('Training Loss')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.grid(True)
    plt.savefig(os.path.join(args.model_dir, 'training_loss.png'))
    print("\nGenerating face embeddings for all users...")
    model.eval()
    embeddings_db = {}
    with torch.no_grad():
        for user_dir in subdirs:
            user_path = os.path.join(args.data_dir, user_dir)
            user_images = [f for f in os.listdir(user_path) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if not user_images:
                print(f"No images found for user {user_dir}, skipping.")
                continue
            user_embeddings = []
            for img_file in user_images:
                img_path = os.path.join(user_path, img_file)
                image = cv2.imread(img_path)
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                image = cv2.resize(image, (64, 64))
                image = image / 255.0
                image = np.transpose(image, (2, 0, 1))
                image = torch.FloatTensor(image).unsqueeze(0).to(device)
                embedding = model(image).squeeze().cpu().numpy().tolist()
                user_embeddings.append(embedding)
            if user_embeddings:
                avg_embedding = np.mean(np.array(user_embeddings), axis=0).tolist()
                embeddings_db[user_dir] = {
                    "name": user_dir,
                    "embedding": avg_embedding,
                    "role": "user",
                    "enrolled_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                print(f"Generated embedding for user: {user_dir}")
    embeddings_file = os.path.join(args.embeddings_dir, 'face_db.json')
    with open(embeddings_file, 'w') as f:
        json.dump(embeddings_db, f)
    print(f"\nFace embeddings saved to {embeddings_file}")
    print(f"Generated embeddings for {len(embeddings_db)} users")
    print("\nTraining complete! The face recognition system is now ready to use.")

if __name__ == "__main__":
    train_model()
