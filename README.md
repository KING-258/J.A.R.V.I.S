# J.A.R.V.I.S AI Assistant

## 🤖 Overview

J.A.R.V.I.S (Just A Rather Very Intelligent System) is a full-stack AI assistant inspired by the AI from Iron Man. It features voice interaction, chat capabilities, computer vision, and system monitoring, all wrapped in a sleek, modern interface.

![J.A.R.V.I.S Dashboard](https://i.imgur.com/example-screenshot.png)

## ✨ Features

- **🎙️ Voice Interface**: Speech recognition and text-to-speech capabilities
- **💬 Chat Interface**: Natural language conversation with context awareness
- **👁️ Vision System**: Image analysis and object detection
- **📊 System Monitoring**: Real-time monitoring of system resources
- **🔐 Authentication**: Facial recognition and password authentication
- **🧠 Memory System**: Short-term and long-term memory for personalized interactions
- **🌐 Offline Mode**: Graceful degradation when backend is unavailable

## 🛠️ Tech Stack

### Frontend
- **Next.js**: React framework for the UI
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **shadcn/ui**: UI component library

### Backend
- **Python**: Backend language
- **Flask**: Web framework
- **Google Gemini API**: Large language model for AI capabilities
- **PyTorch**: Machine learning framework
- **OpenCV**: Computer vision library
- **Whisper**: Speech recognition
- **gTTS**: Text-to-speech synthesis

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- Python 3.9 or higher
- Google Gemini API key

### Installation

1. **Clone the repository**

\`\`\`bash
git clone https://github.com/KING-258/J.A.R.V.I.S.git
cd J.A.R.V.I.S
\`\`\`

2. **Install frontend dependencies**

\`\`\`bash
cd client
npm install
\`\`\`

3. **Install backend dependencies**

\`\`\`bash
cd backend
pip install -r requirements.txt
cd ..
\`\`\`

4. **Set up environment variables**

Create a `.env.local` file in the root directory:

\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:5000
\`\`\`

Create a `.env` file in the backend directory:

\`\`\`
GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`

### Running the Application

1. **Start the backend server**

\`\`\`bash
cd backend
python app.py
\`\`\`

2. **Start the frontend development server**

In a new terminal:

\`\`\`bash
npm run dev
\`\`\`

3. **Access the application**

Open your browser and navigate to `http://localhost:3000`

## 📝 Usage

### Authentication

- Use the demo credentials (Username: `admin`, Password: `password`) to log in
- Alternatively, use the facial recognition feature if you've enrolled your face

### Voice Interface

- Click the microphone button to start listening
- Speak your command or question
- The system will process your speech and respond with text and voice

### Chat Interface

- Type your message in the input field
- The system will respond based on the context of your conversation
- You can customize the system prompt to change the assistant's behavior

### Vision System

- Upload an image or capture one using your camera
- Ask a question about the image or use the analyze/detect objects buttons
- View the analysis results and detected objects

## 🌐 Deployment

### Docker Deployment

1. Build and run the Docker containers:

\`\`\`bash
docker-compose up -d
\`\`\`

2. Access the application at `http://localhost:3000`

### Vercel Deployment

1. Push your code to a Git repository
2. Import the project in Vercel
3. Set the environment variables in the Vercel dashboard
4. Deploy the project

For more detailed deployment instructions, see [deployment.md](deployment.md).

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL of the backend API | `http://localhost:5000` |
| `GEMINI_API_KEY` | Google Gemini API key | - |

## 📁 Project Structure

\`\`\`
jarvis-assistant/
├── app/                 # Next.js frontend
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main page
│   └── globals.css      # Global styles
├── components/          # React components
│   ├── authentication-page.tsx    # Authentication component
│   ├── dashboard.tsx              # Main dashboard
│   ├── features/                  # Feature components
│   │   ├── chat-interface.tsx     # Chat interface
│   │   ├── voice-interface.tsx    # Voice interface  
│   │   ├── vision-interface.tsx   # Vision interface
│   │   └── system-monitoring.tsx  # System monitoring
│   └── theme-provider.tsx         # Theme provider
├── lib/                 # Utility functions
│   ├── utils.ts         # Helper functions
│   └── api-client.ts    # API client
├── backend/             # Python Flask backend
│   ├── app.py           # Main Flask application
│   ├── modules/         # Backend modules
│   │   ├── auth.py      # Authentication module
│   │   ├── chat.py      # Chat module
│   │   ├── voice.py     # Voice module
│   │   ├── vision.py    # Vision module
│   │   ├── system.py    # System monitoring module
│   │   └── memory.py    # Memory module
│   └── requirements.txt # Python dependencies
├── public/              # Static assets
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker configuration
└── package.json         # Node.js dependencies
\`\`\`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgements

- [Google Gemini API](https://ai.google.dev/) for the AI capabilities
- [shadcn/ui](https://ui.shadcn.com/) for the UI components
- [Vercel](https://vercel.com/) for hosting and deployment
- [OpenAI Whisper](https://github.com/openai/whisper) for speech recognition

---

<div align="center">
  <p>Built by Amulya Parashar</p>
  <p>© 2025 J.A.R.V.I.S AI Assistant</p>
</div>
