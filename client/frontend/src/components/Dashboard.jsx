"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import ChatPanel from "./ChatPanel"
import VisionPanel from "./VisionPanel"
import VoicePanel from "./VoicePanel"
import SettingsPanel from "./SettingsPanel"
import SystemStatus from "./SystemStatus"
import "../styles/Dashboard.css"

const Dashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [systemStatus, setSystemStatus] = useState({})
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  // Check if user is authenticated
  useEffect(() => {
    const userInfo = sessionStorage.getItem("user")
    if (!userInfo) {
      navigate("/")
      return
    }

    setUser(JSON.parse(userInfo))

    // Fetch system status
    fetchSystemStatus()
  }, [navigate])

  const fetchSystemStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/system-status`)
      const data = await response.json()
      setSystemStatus(data)
    } catch (error) {
      console.error("Error fetching system status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("user")
    navigate("/")
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>J.A.R.V.I.S AI Assistant</h1>
        <div className="user-info">
          <span>Welcome, {user?.id === "guest" ? "Guest" : user?.id}</span>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <ul>
          <li className={activeTab === "dashboard" ? "active" : ""}>
            <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          </li>
          <li className={activeTab === "vision" ? "active" : ""}>
            <button onClick={() => setActiveTab("vision")}>Vision</button>
          </li>
          <li className={activeTab === "chat" ? "active" : ""}>
            <button onClick={() => setActiveTab("chat")}>Chat</button>
          </li>
          <li className={activeTab === "voice" ? "active" : ""}>
            <button onClick={() => setActiveTab("voice")}>Voice</button>
          </li>
          <li className={activeTab === "settings" ? "active" : ""}>
            <button onClick={() => setActiveTab("settings")}>Settings</button>
          </li>
        </ul>
      </nav>

      <main className="dashboard-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-panel">
            <h2>System Status</h2>
            {loading ? (
              <div className="loading">Loading system status...</div>
            ) : (
              <SystemStatus systemStatus={systemStatus} refreshStatus={fetchSystemStatus} setActiveTab={setActiveTab} />
            )}
          </div>
        )}

        {activeTab === "vision" && <VisionPanel API_URL={API_URL} />}

        {activeTab === "chat" && <ChatPanel API_URL={API_URL} user={user} />}

        {activeTab === "voice" && <VoicePanel API_URL={API_URL} />}

        {activeTab === "settings" && (
          <SettingsPanel
            user={user}
            systemStatus={systemStatus}
            API_URL={API_URL}
            refreshStatus={fetchSystemStatus}
            handleLogout={handleLogout}
          />
        )}
      </main>

      <footer className="dashboard-footer">
        <p>J.A.R.V.I.S AI Assistant &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default Dashboard
