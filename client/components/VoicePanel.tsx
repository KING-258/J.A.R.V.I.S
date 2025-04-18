"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"

type VoicePanelProps = {
  API_URL: string
}

// Declare SpeechRecognition type
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function VoicePanel({ API_URL }: VoicePanelProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [command, setCommand] = useState("")
  const [transcription, setTranscription] = useState("")
  const [intent, setIntent] = useState("")
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [responseAudioUrl, setResponseAudioUrl] = useState<string | null>(null)
  const [audioVisualization, setAudioVisualization] = useState<number[]>([])
  const [processingStage, setProcessingStage] = useState<string | null>(null)
  const [useBrowserRecognition, setUseBrowserRecognition] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const responseAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recognitionRef = useRef<any | null>(null)

  // Check if browser speech recognition is available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      console.log("Browser speech recognition is available")
    } else {
      console.log("Browser speech recognition is not available")
    }
  }, [])

  // Initialize audio visualization
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const visualizeAudio = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const audioContext = audioContextRef.current
    const analyser = audioContext.createAnalyser()
    analyserRef.current = analyser

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateVisualization = () => {
      if (!isRecording) return

      analyser.getByteFrequencyData(dataArray)

      // Get a subset of the data for visualization (16 values)
      const visualizationData = Array.from({ length: 16 }, (_, i) => {
        const index = Math.floor(i * (bufferLength / 16))
        // Normalize to 0-100 range
        return Math.min(100, dataArray[index] / 2.55)
      })

      setAudioVisualization(visualizationData)
      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    }

    updateVisualization()
  }

  const startBrowserSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError("Browser speech recognition is not available")
      return false
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.lang = "en-US"
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: { results: Iterable<unknown> | ArrayLike<unknown> }) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("")

        setTranscription(transcript)
      }

      recognition.onerror = (event: { error: any }) => {
        console.error("Speech recognition error", event.error)
        setError(`Speech recognition error: ${event.error}`)
      }

      recognition.start()
      return true
    } catch (err) {
      console.error("Error starting browser speech recognition:", err)
      setError("Error starting browser speech recognition")
      return false
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      setCommand("")
      setTranscription("")
      setIntent("")
      setResponse("")
      setProcessingStage(null)
      setAudioVisualization(Array(16).fill(0))
      setResponseAudioUrl(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start browser speech recognition if enabled
      if (useBrowserRecognition) {
        const started = startBrowserSpeechRecognition()
        if (!started) {
          setUseBrowserRecognition(false)
        }
      }

      // Use MediaRecorder with mp3 if supported, otherwise fall back to webm
      let mimeType = "audio/mp3"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm"
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = handleRecordingStop

      // Visualize audio
      visualizeAudio(stream)

      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)

        // Auto-stop after 10 seconds
        if (seconds >= 10) {
          stopRecording()
        }
      }, 1000)
    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Error accessing microphone. Please ensure microphone permissions are granted.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }

    // Stop browser speech recognition if active
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Stop visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setIsRecording(false)
    setAudioVisualization(Array(16).fill(0))
  }

  const handleRecordingStop = async () => {
    try {
      setIsLoading(true)
      setProcessingStage("Processing audio...")

      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" })
      setAudioData(audioBlob)

      // Create audio URL for playback
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      if (audioRef.current) {
        audioRef.current.src = url
      }

      // If we're using browser speech recognition, use the transcription directly
      if (useBrowserRecognition && transcription) {
        await processTranscription(transcription)
        setIsLoading(false)
        return
      }

      // Create form data
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.mp3")

      // Try to use the voice-command endpoint with better error handling
      try {
        setProcessingStage("Processing voice command...")

        const response = await fetch(`${API_URL}/api/voice-command`, {
          method: "POST",
          body: formData,
        })

        // Check if response is ok (status in the range 200-299)
        if (!response.ok) {
          console.error(`API responded with status: ${response.status}`)
          throw new Error(`API responded with status: ${response.status}`)
        }

        // Try to parse the response as JSON
        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError)
          throw new Error("Invalid response format from server")
        }

        if (data.error) {
          setError(data.error)
          setIsLoading(false)
          return
        }

        // Set the command from the response
        setCommand(data.command || "")
        setTranscription(data.command || "")
        setIntent(data.intent || "general_query")
        setResponse(data.response || "")

        // If we have audio in the response, play it
        if (data.audio) {
          try {
            // Convert base64 to audio
            const audioBlob = base64ToBlob(data.audio, "audio/mp3")
            const audioUrl = URL.createObjectURL(audioBlob)
            setResponseAudioUrl(audioUrl)

            if (responseAudioRef.current) {
              responseAudioRef.current.src = audioUrl
              responseAudioRef.current.play()
            } else {
              // Fallback if ref is not available
              const audio = new Audio(audioUrl)
              audio.play()
            }
          } catch (audioError) {
            console.error("Error playing response audio:", audioError)
          }
        }

        // If we got an error intent, try browser speech recognition next time
        if (data.intent === "error" && data.command === "Speech recognition unavailable") {
          setUseBrowserRecognition(true)
          console.log("Switching to browser speech recognition for future requests")
        }
      } catch (error) {
        console.error("Error with voice command:", error)

        // Try browser speech recognition as fallback
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition && !useBrowserRecognition) {
          setUseBrowserRecognition(true)
          setError("Backend speech recognition failed. Switching to browser speech recognition for future requests.")
        } else {
          // Set fallback values for a better user experience
          setCommand("Voice processing failed")
          setTranscription("Voice processing failed")
          setIntent("error")
          setResponse(
            "I'm having trouble processing your voice command. The backend API may not be fully implemented yet or is experiencing issues.",
          )
          setError("Voice command processing failed. Please check the backend API.")
        }
      }
    } catch (err) {
      console.error("Error processing voice command:", err)
      setError("Error processing voice command. Please try again.")
      setCommand("Error occurred")
      setResponse("An error occurred while processing your request.")
    } finally {
      setIsLoading(false)
      setProcessingStage(null)
    }
  }

  // Process transcription with Gemini
  const processTranscription = async (text: string) => {
    try {
      setProcessingStage("Processing transcription...")

      // Get chatbot response
      const response = await fetch(`${API_URL}/api/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          user_id: "voice_user",
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.response) {
        setCommand(text)
        setIntent("browser_recognition")
        setResponse(data.response)

        // Try to get text-to-speech if available
        try {
          const ttsResponse = await fetch(`${API_URL}/api/tts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: data.response,
            }),
          })

          const ttsData = await ttsResponse.json()

          if (ttsData.audio) {
            // Convert base64 to audio
            const audioBlob = base64ToBlob(ttsData.audio, "audio/mp3")
            const audioUrl = URL.createObjectURL(audioBlob)
            setResponseAudioUrl(audioUrl)

            if (responseAudioRef.current) {
              responseAudioRef.current.src = audioUrl
              responseAudioRef.current.play()
            } else {
              // Fallback if ref is not available
              const audio = new Audio(audioUrl)
              audio.play()
            }
          }
        } catch (err) {
          console.error("TTS not available:", err)
        }
      }
    } catch (err) {
      console.error("Error processing transcription:", err)
      setResponse("I'm sorry, I couldn't process that request.")
    }
  }

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64)
    const byteArrays = []

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)

      const byteNumbers = new Array(slice.length)
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }

    return new Blob(byteArrays, { type: mimeType })
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl border border-blue-500/20 p-6 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute -inset-2 bg-blue-500/5 blur-xl z-0"></div>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
          <span className="mr-2">Voice Interface</span>
          <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
        </h2>

        <div className="mb-8 flex justify-center">
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl transition-all relative ${
                isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isLoading}
            >
              {isRecording ? "■" : "🎤"}

              {/* Pulsing effect when recording */}
              {isRecording && (
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 0, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-full bg-red-500"
                  style={{ zIndex: -1 }}
                />
              )}
            </motion.button>
            <p className="mt-2 text-blue-300">
              {isRecording
                ? `Recording... ${recordingTime}s`
                : isLoading
                  ? processingStage || "Processing..."
                  : "Tap to speak"}
            </p>

            {useBrowserRecognition && (
              <div className="mt-1 text-xs text-green-400">Using browser speech recognition</div>
            )}
          </div>
        </div>

        {/* Audio visualization */}
        {(isRecording || isLoading) && (
          <div className="flex justify-center items-end h-16 mb-6 space-x-1">
            {audioVisualization.map((value, index) => (
              <motion.div
                key={index}
                animate={{ height: `${value}%` }}
                transition={{ duration: 0.1 }}
                className="w-2 bg-blue-500/80 rounded-t"
                style={{ minHeight: "4px" }}
              />
            ))}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg border border-red-500/30"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/80 p-4 rounded-lg border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Recognized Command</h3>
            <div className="min-h-[50px] p-3 bg-gray-900/80 rounded border border-blue-500/10 text-gray-300">
              {transcription || "No command recognized yet"}
            </div>

            {intent && (
              <div className="mt-3">
                <h4 className="font-medium text-blue-300">Detected Intent:</h4>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm border border-blue-500/20">
                  {intent}
                </span>
              </div>
            )}

            <div className="mt-4">
              {audioUrl && (
                <audio
                  ref={audioRef}
                  controls
                  className="w-full h-10 rounded"
                  style={{
                    filter: "hue-rotate(180deg) saturate(70%)",
                    backgroundColor: "#1e293b",
                    color: "#60a5fa",
                  }}
                />
              )}
            </div>
          </div>

          <div className="bg-gray-800/80 p-4 rounded-lg border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">J.A.R.V.I.S Response</h3>
            <div className="min-h-[150px] p-3 bg-gray-900/80 rounded border border-blue-500/10 text-gray-300">
              {response ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  {response}
                </motion.div>
              ) : (
                "No response yet"
              )}
            </div>

            {responseAudioUrl && (
              <div className="mt-4">
                <audio
                  ref={responseAudioRef}
                  controls
                  className="w-full h-10 rounded"
                  style={{
                    filter: "hue-rotate(180deg) saturate(70%)",
                    backgroundColor: "#1e293b",
                    color: "#60a5fa",
                  }}
                  src={responseAudioUrl}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Try These Commands</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "What time is it?",
              "Tell me a joke",
              "What's the weather like today?",
              "Turn on the lights",
              "Set a timer for 5 minutes",
              "What can you do?",
            ].map((command, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                className="bg-gray-800/50 p-3 rounded-lg border border-blue-500/20 text-gray-300 cursor-pointer"
              >
                "{command}"
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
