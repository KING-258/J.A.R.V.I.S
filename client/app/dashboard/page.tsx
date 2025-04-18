"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import ChatPanel from "@/components/ChatPanel"
import VisionPanel from "@/components/VisionPanel"
import VoicePanel from "@/components/VoicePanel"
import SettingsPanel from "@/components/SettingsPanel"
import SystemStatus from "@/components/SystemStatus"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [systemStatus, setSystemStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  // Check if user is authenticated
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      const userInfo = sessionStorage.getItem("user")
      if (!userInfo) {
        router.push("/auth")
        return
      }

      setUser(JSON.parse(userInfo))

      // Fetch system status
      fetchSystemStatus()
    }
  }, [router])

  const fetchSystemStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/system-status`)

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()
      setSystemStatus(data)
    } catch (error) {
      console.error("Error fetching system status:", error)
      // Set default system status if API fails
      setSystemStatus({
        status: "offline",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        system: {
          cpu: 0,
          memory: 0,
          disk: 0,
        },
        modules: {
          face_auth: false,
          object_detection: false,
          voice_command: false,
          chatbot: false,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("user")
    router.push("/auth")
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <motion.h1
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="text-3xl font-bold text-blue-400"
          >
            J.A.R.V.I.S
          </motion.h1>
          <motion.div
            animate={{
              rotate: 360,
              borderColor: ["rgba(59, 130, 246, 0.3)", "rgba(59, 130, 246, 0.8)", "rgba(59, 130, 246, 0.3)"],
            }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-12 h-12 rounded-full border-t-2 border-b-2 mx-auto mt-4"
          />
          <p className="mt-4 text-blue-300">Initializing system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-200">
      <header className="bg-gray-900 border-b border-blue-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto flex justify-between items-center p-4 relative z-10">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-blue-400 flex items-center"
          >
            J.A.R.V.I.S
            <span className="ml-2 text-xs bg-blue-900/50 px-2 py-0.5 rounded border border-blue-500/30">v1.0</span>
          </motion.h1>

          <div className="flex items-center gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-gray-800/80 px-3 py-1 rounded-full border border-blue-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm">Welcome, {user?.id === "guest" ? "Guest" : user?.id}</span>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-red-600/80 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors border border-red-500/30"
              onClick={handleLogout}
            >
              Logout
            </motion.button>
          </div>
        </div>
      </header>

      <nav className="bg-gray-900/80 border-b border-blue-500/20">
        <div className="container mx-auto">
          <ul className="flex overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "vision", label: "Vision" },
              { id: "chat", label: "Chat" },
              { id: "voice", label: "Voice" },
              { id: "settings", label: "Settings" },
            ].map((tab) => (
              <motion.li
                key={tab.id}
                className={`relative ${activeTab === tab.id ? "text-blue-400" : "text-gray-400"}`}
                whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <button onClick={() => setActiveTab(tab.id)} className="px-4 py-3 relative z-10">
                  {tab.label}
                </button>

                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    initial={false}
                  />
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      </nav>

      <main className="flex-grow container mx-auto p-4">
        {activeTab === "dashboard" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-gray-900 rounded-lg shadow-xl border border-blue-500/20 p-6 relative overflow-hidden">
              <div className="absolute -inset-2 bg-blue-500/5 blur-xl z-0"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
                  <span className="mr-2">System Status</span>
                  <div className="h-px flex-grow bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </h2>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
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
                    <p className="ml-3 text-blue-300">Loading system status...</p>
                  </div>
                ) : (
                  <SystemStatus
                    systemStatus={systemStatus}
                    refreshStatus={fetchSystemStatus}
                    setActiveTab={setActiveTab}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "vision" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <VisionPanel API_URL={API_URL} />
          </motion.div>
        )}

        {activeTab === "chat" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ChatPanel API_URL={API_URL} user={user} />
          </motion.div>
        )}

        {activeTab === "voice" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <VoicePanel API_URL={API_URL} />
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SettingsPanel
              user={user}
              systemStatus={systemStatus}
              API_URL={API_URL}
              refreshStatus={fetchSystemStatus}
              handleLogout={handleLogout}
            />
          </motion.div>
        )}
      </main>

      <footer className="bg-gray-900 border-t border-blue-500/20 p-4 text-center text-gray-400 text-sm">
        <p>J.A.R.V.I.S AI Assistant &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
