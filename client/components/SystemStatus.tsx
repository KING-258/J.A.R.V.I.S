"use client"

import { motion } from "framer-motion"

type SystemStatusProps = {
  systemStatus: any
  refreshStatus: () => void
  setActiveTab: (tab: string) => void
}

export default function SystemStatus({ systemStatus, refreshStatus, setActiveTab }: SystemStatusProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gray-800/80 rounded-lg p-4 shadow-sm border border-blue-500/20"
      >
        <h3 className="text-lg font-semibold mb-4 text-blue-300">System</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Status:</span>
            <span
              className={`px-2 py-1 rounded text-white text-sm ${systemStatus.status === "online" ? "bg-green-600/80" : "bg-red-600/80"} border ${systemStatus.status === "online" ? "border-green-500/30" : "border-red-500/30"}`}
            >
              {systemStatus.status || "Unknown"}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">CPU Usage:</span>
              <span className="text-blue-300">{systemStatus.system?.cpu || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${systemStatus.system?.cpu || 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-blue-600 h-2.5 rounded-full relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-blue-400/50 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Memory:</span>
              <span className="text-blue-300">{systemStatus.system?.memory || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${systemStatus.system?.memory || 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="bg-purple-600 h-2.5 rounded-full relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-purple-400/50 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Disk:</span>
              <span className="text-blue-300">{systemStatus.system?.disk || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${systemStatus.system?.disk || 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                className="bg-cyan-600 h-2.5 rounded-full relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/50 to-cyan-400/50 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gray-800/80 rounded-lg p-4 shadow-sm border border-blue-500/20"
      >
        <h3 className="text-lg font-semibold mb-4 text-blue-300">AI Modules</h3>
        <div className="space-y-4">
          {[
            { name: "Face Authentication", status: systemStatus.modules?.face_auth },
            { name: "Object Detection", status: systemStatus.modules?.object_detection },
            { name: "Voice Command", status: systemStatus.modules?.voice_command },
            { name: "Chatbot", status: systemStatus.modules?.chatbot },
          ].map((module, index) => (
            <motion.div
              key={module.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="flex justify-between items-center"
            >
              <span className="text-gray-300">{module.name}:</span>
              <div className="flex items-center">
                <motion.div
                  animate={{
                    backgroundColor: module.status
                      ? ["rgba(74, 222, 128, 0.5)", "rgba(74, 222, 128, 0.8)", "rgba(74, 222, 128, 0.5)"]
                      : ["rgba(248, 113, 113, 0.5)", "rgba(248, 113, 113, 0.8)", "rgba(248, 113, 113, 0.5)"],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="w-2 h-2 rounded-full mr-2"
                />
                <span
                  className={`px-2 py-1 rounded text-white text-sm ${module.status ? "bg-green-600/80" : "bg-red-600/80"} border ${module.status ? "border-green-500/30" : "border-red-500/30"}`}
                >
                  {module.status ? "Active" : "Inactive"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="md:col-span-2 bg-gray-800/80 rounded-lg p-4 shadow-sm border border-blue-500/20"
      >
        <h3 className="text-lg font-semibold mb-4 text-blue-300">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "👁️", label: "Object Detection", action: () => setActiveTab("vision") },
            { icon: "💬", label: "Chat with JARVIS", action: () => setActiveTab("chat") },
            { icon: "🎤", label: "Voice Commands", action: () => setActiveTab("voice") },
            { icon: "🔄", label: "Refresh Status", action: () => refreshStatus() },
          ].map((action, index) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              onClick={action.action}
              className="flex flex-col items-center justify-center p-4 bg-gray-900/80 rounded-lg shadow-sm hover:bg-gray-800 transition-colors border border-blue-500/10"
            >
              <span className="text-2xl mb-2">{action.icon}</span>
              <span className="text-gray-300">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
