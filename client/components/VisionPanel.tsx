"use client"

import type React from "react"
import { useState, useRef } from "react"
import { motion } from "framer-motion"

type VisionPanelProps = {
  API_URL: string
}

type Detection = {
  id: number
  class_id: number
  class_name: string
  confidence: number
  bbox: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }
}

export default function VisionPanel({ API_URL }: VisionPanelProps) {
  const [image, setImage] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanningAnimation, setScanningAnimation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
      setDetections([])
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleCameraCapture = async () => {
    try {
      if (streamRef.current) {
        // If camera is already on, take a picture
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current
          const canvas = canvasRef.current
          const context = canvas.getContext("2d")

          if (context) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            context.drawImage(video, 0, 0, canvas.width, canvas.height)

            const imageData = canvas.toDataURL("image/jpeg")
            setImage(imageData)
            setDetections([])
            setError(null)

            // Stop the camera
            stopCamera()
          }
        }
      } else {
        // Start the camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: "environment",
          },
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Error accessing camera. Please ensure camera permissions are granted.")
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
  }

  const detectObjects = async () => {
    if (!image) return

    setIsLoading(true)
    setError(null)
    setScanningAnimation(true)

    try {
      const response = await fetch(`${API_URL}/api/object-detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: image,
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.detections) {
        setDetections(data.detections)
        drawDetections(data.detections)
      } else {
        setError("No objects detected or error in detection.")
      }
    } catch (error) {
      console.error("Error detecting objects:", error)
      setError(`Error communicating with the server: ${error.message}. Please ensure the backend API is running.`)
    } finally {
      setIsLoading(false)
      setTimeout(() => setScanningAnimation(false), 500) // Keep animation a bit longer for effect
    }
  }

  const drawDetections = (detections: Detection[]) => {
    if (!image || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a new image element
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = image
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw bounding boxes for each detection
      detections.forEach((detection) => {
        const { x1, y1, width, height } = detection.bbox
        const confidence = detection.confidence * 100

        // Set styling for bounding box
        ctx.strokeStyle = "#00BFFF"
        ctx.lineWidth = 3
        ctx.strokeRect(x1, y1, width, height)

        // Set styling for label background
        ctx.fillStyle = "rgba(0, 191, 255, 0.7)"
        ctx.fillRect(x1, y1 - 25, Math.max(width, 100), 25)

        // Set styling for text
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "16px 'Courier New', monospace"
        ctx.fillText(`${detection.class_name} (${confidence.toFixed(1)}%)`, x1 + 5, y1 - 7)

        // Add futuristic corner markers
        const markerSize = 10

        // Top-left
        ctx.beginPath()
        ctx.moveTo(x1, y1 + markerSize)
        ctx.lineTo(x1, y1)
        ctx.lineTo(x1 + markerSize, y1)
        ctx.strokeStyle = "#00FFFF"
        ctx.lineWidth = 2
        ctx.stroke()

        // Top-right
        ctx.beginPath()
        ctx.moveTo(x1 + width - markerSize, y1)
        ctx.lineTo(x1 + width, y1)
        ctx.lineTo(x1 + width, y1 + markerSize)
        ctx.stroke()

        // Bottom-left
        ctx.beginPath()
        ctx.moveTo(x1, y1 + height - markerSize)
        ctx.lineTo(x1, y1 + height)
        ctx.lineTo(x1 + markerSize, y1 + height)
        ctx.stroke()

        // Bottom-right
        ctx.beginPath()
        ctx.moveTo(x1 + width - markerSize, y1 + height)
        ctx.lineTo(x1 + width, y1 + height)
        ctx.lineTo(x1 + width, y1 + height - markerSize)
        ctx.stroke()
      })
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl border border-blue-500/20 p-6 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute -inset-2 bg-blue-500/5 blur-xl z-0"></div>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
          <span className="mr-2">Vision System</span>
          <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
        </h2>

        <div className="mb-6 flex flex-wrap gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors relative overflow-hidden"
          >
            Upload Image
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
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCameraCapture}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors relative overflow-hidden"
          >
            {streamRef.current ? "Capture Photo" : "Use Camera"}

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
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-green-300 to-transparent"
            />
          </motion.button>

          {streamRef.current && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Stop Camera
            </motion.button>
          )}

          {image && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={detectObjects}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? "Detecting..." : "Detect Objects"}

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
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-300 to-transparent"
              />
            </motion.button>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg border border-red-500/30"
          >
            {error}
          </motion.div>
        )}

        <div className="relative bg-gray-800 rounded-lg overflow-hidden border border-blue-500/20">
          {streamRef.current ? (
            <video ref={videoRef} autoPlay playsInline className="w-full max-h-[60vh] object-contain" />
          ) : image ? (
            <div className="relative">
              <canvas ref={canvasRef} className="w-full max-h-[60vh] object-contain mx-auto" />

              {/* Scanning animation */}
              {scanningAnimation && (
                <motion.div
                  initial={{ top: 0 }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-blue-400/70 z-30"
                />
              )}

              {/* Grid overlay for futuristic effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full bg-grid-pattern opacity-10"></div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="text-blue-400"
              >
                Upload an image or use the camera to detect objects
              </motion.p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="inline-block h-12 w-12 relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-400"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="absolute inset-1 rounded-full border-r-2 border-l-2 border-blue-300"
                  />
                </div>
                <p className="mt-2">Analyzing image...</p>
              </div>
            </div>
          )}
        </div>

        {detections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6"
          >
            <h3 className="text-lg font-semibold mb-2 text-blue-300">Detected Objects ({detections.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {detections.map((detection) => (
                <motion.div
                  key={detection.id}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                  className="bg-gray-800/80 p-3 rounded-lg border border-blue-500/30"
                >
                  <div className="font-medium text-blue-300">{detection.class_name}</div>
                  <div className="text-sm text-gray-400">
                    Confidence:
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${detection.confidence * 100}%` }}
                      />
                    </div>
                    <div className="text-right text-xs mt-1">{(detection.confidence * 100).toFixed(1)}%</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
