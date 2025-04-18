"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

type ChatPanelProps = {
  API_URL: string
  user: any
}

type Message = {
  id: string
  sender: "user" | "assistant"
  text: string
  timestamp: string
}

export default function ChatPanel({ API_URL, user }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [typingText, setTypingText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add welcome message when component mounts
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Hello! I'm J.A.R.V.I.S, your AI assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ])
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Simulate typing effect for assistant messages
  const simulateTyping = (text: string) => {
    setIsTyping(true)
    setTypingText("")

    let i = 0
    const typeNextChar = () => {
      if (i < text.length) {
        setTypingText((prev) => prev + text.charAt(i))
        i++
        typingTimeoutRef.current = setTimeout(typeNextChar, Math.random() * 30 + 10) // Random delay between 10-40ms
      } else {
        setIsTyping(false)
      }
    }

    typeNextChar()

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  // Update the handleSendMessage function to use the existing chatbot endpoint as a fallback
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      // Try to use Gemini API first, but fall back to the existing chatbot endpoint
      let response
      try {
        response = await fetch(`${API_URL}/api/gemini-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage.text,
            user_id: user?.id || "guest",
            history: messages.map((msg) => ({
              role: msg.sender === "user" ? "user" : "model",
              content: msg.text,
            })),
          }),
        })
      } catch (error) {
        console.log("Gemini API not available, falling back to chatbot endpoint")
        // Fallback to existing chatbot endpoint
        response = await fetch(`${API_URL}/api/chatbot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage.text,
            user_id: user?.id || "guest",
          }),
        })
      }

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.response,
        timestamp: data.timestamp || new Date().toISOString(),
      }

      // Simulate typing effect before adding the message
      simulateTyping(assistantMessage.text)

      // Add the message after typing is complete
      setTimeout(
        () => {
          setMessages((prev) => [...prev, assistantMessage])
          setIsTyping(false)
        },
        assistantMessage.text.length * 20 + 500,
      ) // Approximate time to finish typing
    } catch (error) {
      console.error("Error sending message:", error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, errorMessage])
      setIsTyping(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl border border-blue-500/20 h-[calc(100vh-12rem)] flex flex-col relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute -inset-2 bg-blue-500/5 blur-xl z-0"></div>

      <div className="p-4 border-b border-blue-500/20 relative z-10">
        <h2 className="text-xl font-bold text-blue-400 flex items-center">
          <span className="mr-2">J.A.R.V.I.S Interface</span>
          <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
        </h2>
      </div>

      <div className="flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-gray-800/20 relative z-10">
        <AnimatePresence>
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white border border-blue-400/30"
                      : "bg-gray-800 text-gray-200 border border-blue-500/20"
                  }`}
                >
                  <p>{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === "user" ? "text-blue-200" : "text-gray-400"}`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-800 text-gray-200 border border-blue-500/20">
                  <p>
                    {typingText}
                    <span className="animate-pulse">|</span>
                  </p>
                </div>
              </motion.div>
            )}

            {isLoading && !isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg p-3 max-w-[80%] border border-blue-500/20">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-blue-500/20 relative z-10">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow px-4 py-2 bg-gray-800 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
            disabled={isLoading || isTyping}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors relative overflow-hidden"
            disabled={isLoading || isTyping || !inputMessage.trim()}
          >
            Send
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
        </form>
      </div>
    </div>
  )
}
