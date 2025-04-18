"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"

type SettingsPanelProps = {
  user: any
  systemStatus: any
  API_URL: string
  refreshStatus: () => void
  handleLogout: () => void
}

export default function SettingsPanel({
  user,
  systemStatus,
  API_URL,
  refreshStatus,
  handleLogout,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState("profile")
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollStatus, setEnrollStatus] = useState("")
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState("")
  const [scanningFace, setScanningFace] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      setIsEnrolling(true)
      setEnrollStatus("Starting camera...")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setEnrollStatus("Camera ready. Fill in your details and look at the camera.")
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setEnrollStatus("Error accessing camera. Please ensure camera permissions are granted.")
      setIsEnrolling(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsEnrolling(false)
    setEnrollStatus("")
    setScanningFace(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return null

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get the image as base64 data URL
    return canvas.toDataURL("image/jpeg")
  }

  const enrollFace = async () => {
    if (!userName.trim() || !userId.trim()) {
      setEnrollStatus("Please enter both name and user ID.")
      return
    }

    try {
      setEnrollStatus("Enrolling face...")
      setScanningFace(true)

      // Capture image from webcam
      const imageData = captureImage()
      if (!imageData) {
        setEnrollStatus("Failed to capture image. Please try again.")
        setScanningFace(false)
        return
      }

      // Send to backend for enrollment
      const response = await fetch(`${API_URL}/api/face-enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          user_id: userId,
          name: userName,
          role: "user",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEnrollStatus(`Success: ${data.message}`)
        // Clear form after successful enrollment
        setUserName("")
        setUserId("")
        // Stop camera after a delay
        setTimeout(() => {
          stopCamera()
        }, 2000)
      } else {
        setEnrollStatus(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error("Enrollment error:", error)
      setEnrollStatus("Error during enrollment. Please try again.")
    } finally {
      setScanningFace(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl border border-blue-500/20 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute -inset-2 bg-blue-500/5 blur-xl z-0"></div>

      <div className="flex relative z-10">
        <div className="w-1/4 border-r border-blue-500/20">
          <nav className="p-4">
            <ul className="space-y-2">
              {[
                { id: "profile", label: "Profile" },
                { id: "face-enrollment", label: "Face Enrollment" },
                { id: "system", label: "System" },
                { id: "about", label: "About" },
              ].map((section) => (
                <li key={section.id}>
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded ${
                      activeSection === section.id
                        ? "bg-blue-900/30 text-blue-400 border-l-2 border-blue-500"
                        : "hover:bg-gray-800/50 text-gray-300"
                    }`}
                  >
                    {section.label}
                  </motion.button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="w-3/4 p-6">
          {activeSection === "profile" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
                <span className="mr-2">Profile Settings</span>
                <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
              </h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-300">Current User</h3>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/20">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-900/50 text-blue-300 rounded-full w-12 h-12 flex items-center justify-center text-xl border border-blue-500/30">
                      {user?.id?.charAt(0).toUpperCase() || "G"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">{user?.id || "Guest"}</p>
                      <p className="text-sm text-gray-400">
                        {user?.authenticated ? "Authenticated User" : "Guest User"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-300">Session Information</h3>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Login Time</p>
                      <p className="text-gray-300">{new Date(user?.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Authentication Method</p>
                      <p className="text-gray-300">{user?.authenticated ? "Face Recognition" : "Guest Access"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="bg-red-600/80 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-500/30"
              >
                Logout
              </motion.button>
            </motion.div>
          )}

          {activeSection === "face-enrollment" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
                <span className="mr-2">Face Enrollment</span>
                <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
              </h2>

              <div className="mb-4">
                <p className="text-gray-300">
                  Enroll your face to use facial recognition for authentication. This will allow you to log in without a
                  password.
                </p>
              </div>

              <div className="mb-6">
                <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video mb-4 border border-blue-500/20">
                  {scanningFace && (
                    <div className="absolute inset-0 z-20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full max-w-[280px] aspect-square relative">
                          {/* Scanning animation */}
                          <motion.div
                            initial={{ top: 0 }}
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-blue-400/70 z-30"
                          />

                          {/* Face outline */}
                          <div className="absolute inset-[15%] border-2 border-dashed border-blue-400/70 rounded-full"></div>

                          {/* Corner markers */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isEnrolling ? "block" : "hidden"}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {!isEnrolling && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="text-5xl mb-2 text-blue-400/80"
                      >
                        👤
                      </motion.div>
                      <p className="text-gray-400">Camera inactive</p>
                    </div>
                  )}
                </div>

                <p
                  className={`text-center text-sm mb-4 ${
                    enrollStatus.includes("Success")
                      ? "text-green-400"
                      : enrollStatus.includes("Error")
                        ? "text-red-400"
                        : "text-blue-300"
                  }`}
                >
                  {enrollStatus}
                </p>

                {isEnrolling ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">User ID</label>
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                        placeholder="Choose a user ID (e.g., john_doe)"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={enrollFace}
                        className="bg-green-600/80 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors border border-green-500/30"
                      >
                        Enroll Face
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={stopCamera}
                        className="bg-red-600/80 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-500/30"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startCamera}
                    className="bg-blue-600/80 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors border border-blue-500/30"
                  >
                    Start Enrollment
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === "system" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
                <span className="mr-2">System Settings</span>
                <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
              </h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-300">System Information</h3>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <p className={systemStatus.status === "online" ? "text-green-400" : "text-red-400"}>
                        {systemStatus.status || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Version</p>
                      <p className="text-gray-300">{systemStatus.version || "1.0.0"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Last Updated</p>
                      <p className="text-gray-300">
                        {systemStatus.timestamp ? new Date(systemStatus.timestamp).toLocaleString() : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">API Endpoint</p>
                      <p className="text-gray-300">{API_URL}</p>
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshStatus}
                className="bg-blue-600/80 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors border border-blue-500/30"
              >
                Refresh System Status
              </motion.button>
            </motion.div>
          )}

          {activeSection === "about" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
                <span className="mr-2">About J.A.R.V.I.S</span>
                <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
              </h2>

              <div className="prose max-w-none text-gray-300">
                <p>
                  J.A.R.V.I.S (Just A Rather Very Intelligent System) is an AI assistant designed to help with various
                  tasks through natural interaction.
                </p>

                <h3 className="text-blue-300">Features</h3>
                <ul className="space-y-1">
                  <li>
                    <strong className="text-blue-300">Face Authentication</strong> - Secure login using facial
                    recognition
                  </li>
                  <li>
                    <strong className="text-blue-300">Object Detection</strong> - Identify objects in images using
                    computer vision
                  </li>
                  <li>
                    <strong className="text-blue-300">Voice Commands</strong> - Control the system using natural voice
                    instructions
                  </li>
                  <li>
                    <strong className="text-blue-300">Chatbot</strong> - Have natural conversations with the AI
                    assistant
                  </li>
                  <li>
                    <strong className="text-blue-300">Intent Classification</strong> - Understand the meaning behind
                    user requests
                  </li>
                  <li>
                    <strong className="text-blue-300">Speech Synthesis</strong> - Convert text responses to
                    natural-sounding speech
                  </li>
                </ul>

                <h3 className="text-blue-300">Technologies</h3>
                <p>J.A.R.V.I.S is built using a combination of modern technologies:</p>
                <ul className="space-y-1">
                  <li>
                    <strong className="text-blue-300">Frontend</strong>: Next.js, React, Tailwind CSS, Framer Motion
                  </li>
                  <li>
                    <strong className="text-blue-300">Backend</strong>: Python, Flask, PyTorch, TensorFlow
                  </li>
                  <li>
                    <strong className="text-blue-300">AI Models</strong>: Computer Vision, NLP, Speech Processing,
                    Google Gemini
                  </li>
                </ul>

                <p className="text-sm text-gray-400 mt-8">
                  Version 1.0.0 • &copy; {new Date().getFullYear()} J.A.R.V.I.S AI Assistant
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
