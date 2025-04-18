"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/FaceAuth.css"

const FaceAuth = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureMessage, setCaptureMessage] = useState("")
  const [authStatus, setAuthStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const navigate = useNavigate()

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

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

      // Capture image from webcam
      const imageData = captureImage()
      if (!imageData) {
        setAuthStatus("Failed to capture image. Please try again.")
        setLoading(false)
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

      const data = await response.json()

      if (data.authenticated) {
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
          navigate("/dashboard")
        }, 1500)
      } else {
        setAuthStatus(`Authentication failed. Confidence: ${(data.confidence * 100).toFixed(2)}%`)
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setAuthStatus("Error during authentication. Please try again.")
    } finally {
      setLoading(false)
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
    navigate("/dashboard")
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">J.A.R.V.I.S</h1>
        <h2 className="auth-subtitle">Face Authentication</h2>

        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted className={isCapturing ? "active" : ""} />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!isCapturing && (
            <div className="video-placeholder">
              <i className="placeholder-icon">👤</i>
              <p>Camera inactive</p>
            </div>
          )}
        </div>

        <p className="capture-message">{captureMessage}</p>
        <p
          className={`auth-status ${authStatus.includes("successful") ? "success" : authStatus.includes("failed") ? "error" : ""}`}
        >
          {authStatus}
        </p>

        <div className="auth-buttons">
          {!isCapturing ? (
            <button className="auth-button start-button" onClick={startCamera} disabled={loading}>
              Start Camera
            </button>
          ) : (
            <>
              <button className="auth-button authenticate-button" onClick={authenticateUser} disabled={loading}>
                {loading ? "Authenticating..." : "Authenticate"}
              </button>
              <button className="auth-button stop-button" onClick={stopCamera} disabled={loading}>
                Stop Camera
              </button>
            </>
          )}
        </div>

        <div className="guest-login">
          <button className="guest-button" onClick={handleGuestLogin} disabled={loading}>
            Continue as Guest
          </button>
        </div>

        <p className="auth-info">
          This system uses facial recognition for authentication. Your face data is processed securely and not shared
          with third parties.
        </p>
      </div>
    </div>
  )
}

export default FaceAuth
