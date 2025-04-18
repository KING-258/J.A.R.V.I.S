"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function FaceAuth() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureMessage, setCaptureMessage] = useState("")
  const [authStatus, setAuthStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanningFace, setScanningFace] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  useEffect(() => {
    return () => {
      // Cleanup: stop the camera when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setIsCapturing(true)
      setCaptureMessage("Starting camera...")

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
        setCaptureMessage("Camera ready. Look at the camera for authentication.")
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setCaptureMessage("Error accessing camera. Please ensure camera permissions are granted.")
      setIsCapturing(false)
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

    setIsCapturing(false)
    setCaptureMessage("")
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

  const authenticateUser = async () => {
    try {
      setLoading(true)
      setAuthStatus("Authenticating...")
      setScanningFace(true)

      // Capture image from webcam
      const imageData = captureImage()
      if (!imageData) {
        setAuthStatus("Failed to capture image. Please try again.")
        setLoading(false)
        setScanningFace(false)
        return
      }

      // Send to backend for authentication
      const response = await fetch(`${API_URL}/api/face-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()

      // Implement stricter confidence threshold for better accuracy
      if (data.authenticated && data.confidence > 0.60) {
        setAuthStatus(`Authentication successful! Welcome, ${data.user_id}`)
        // Store user info in session storage
        sessionStorage.setItem(
          "user",
          JSON.stringify({
            id: data.user_id,
            authenticated: true,
            timestamp: data.timestamp,
          }),
        )

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setAuthStatus(
          `Authentication failed. Confidence: ${(data.confidence * 100).toFixed(2)}% (Minimum required: 60%)`,
        )
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setAuthStatus(`Error during authentication: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
      setScanningFace(false)
    }
  }

  const handleGuestLogin = () => {
    // Store guest info in session storage
    sessionStorage.setItem(
      "user",
      JSON.stringify({
        id: "guest",
        authenticated: false,
        timestamp: new Date().toISOString(),
      }),
    )

    // Redirect to dashboard
    router.push("/dashboard")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="relative max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900 rounded-lg shadow-2xl p-8 border border-blue-500/30"
        >
          <div className="absolute -top-4 -left-4 -right-4 -bottom-4 bg-blue-500/5 rounded-lg blur-xl z-0"></div>

          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-3xl font-bold text-center text-blue-400 mb-1"
            >
              J.A.R.V.I.S
            </motion.h1>
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="h-0.5 bg-blue-500/50 mb-4 mx-auto"
            />
            <h2 className="text-xl text-center text-blue-300/80 mb-6">Facial Recognition System</h2>

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
                className={`w-full h-full object-cover ${isCapturing ? "block" : "hidden"}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!isCapturing && (
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

            <p className="text-center text-sm text-blue-300/70 mb-2">{captureMessage}</p>
            <motion.p
              animate={authStatus ? { opacity: [0, 1] } : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-center mb-4 font-medium ${
                authStatus.includes("successful")
                  ? "text-green-400"
                  : authStatus.includes("failed")
                    ? "text-red-400"
                    : "text-blue-300"
              }`}
            >
              {authStatus}
            </motion.p>

            <div className="flex flex-col gap-3 mb-4">
              {!isCapturing ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  onClick={startCamera}
                  disabled={loading}
                >
                  Start Camera
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors relative overflow-hidden"
                    onClick={authenticateUser}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Authenticating...
                      </span>
                    ) : (
                      "Authenticate"
                    )}

                    {/* Animated border effect */}
                    <motion.div
                      animate={{
                        x: ["0%", "100%", "0%"],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent"
                    />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                    onClick={stopCamera}
                    disabled={loading}
                  >
                    Stop Camera
                  </motion.button>
                </>
              )}
            </div>

            <div className="text-center mb-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                onClick={handleGuestLogin}
                disabled={loading}
              >
                Continue as Guest
              </motion.button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              This system uses facial recognition for authentication. Your face data is processed securely and not
              shared with third parties.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
