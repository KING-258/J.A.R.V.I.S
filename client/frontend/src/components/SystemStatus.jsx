"use client"
import "../styles/SystemStatus.css"

const SystemStatus = ({ systemStatus, refreshStatus, setActiveTab }) => {
  return (
    <div className="status-grid">
      <div className="status-card">
        <h3>System</h3>
        <div className="status-item">
          <span>Status:</span>
          <span className={`status-badge ${systemStatus.status === "online" ? "online" : "offline"}`}>
            {systemStatus.status || "Unknown"}
          </span>
        </div>
        <div className="status-item">
          <span>CPU Usage:</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${systemStatus.system?.cpu || 0}%` }}></div>
          </div>
          <span>{systemStatus.system?.cpu || 0}%</span>
        </div>
        <div className="status-item">
          <span>Memory:</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${systemStatus.system?.memory || 0}%` }}></div>
          </div>
          <span>{systemStatus.system?.memory || 0}%</span>
        </div>
        <div className="status-item">
          <span>Disk:</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${systemStatus.system?.disk || 0}%` }}></div>
          </div>
          <span>{systemStatus.system?.disk || 0}%</span>
        </div>
      </div>

      <div className="status-card">
        <h3>AI Modules</h3>
        <div className="status-item">
          <span>Face Authentication:</span>
          <span className={`status-badge ${systemStatus.modules?.face_auth ? "online" : "offline"}`}>
            {systemStatus.modules?.face_auth ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="status-item">
          <span>Object Detection:</span>
          <span className={`status-badge ${systemStatus.modules?.object_detection ? "online" : "offline"}`}>
            {systemStatus.modules?.object_detection ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="status-item">
          <span>Voice Command:</span>
          <span className={`status-badge ${systemStatus.modules?.voice_command ? "online" : "offline"}`}>
            {systemStatus.modules?.voice_command ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="status-item">
          <span>Chatbot:</span>
          <span className={`status-badge ${systemStatus.modules?.chatbot ? "online" : "offline"}`}>
            {systemStatus.modules?.chatbot ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="status-card wide">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button onClick={() => setActiveTab("vision")}>
            <i className="action-icon">👁️</i>
            <span>Object Detection</span>
          </button>
          <button onClick={() => setActiveTab("chat")}>
            <i className="action-icon">💬</i>
            <span>Chat with JARVIS</span>
          </button>
          <button onClick={() => setActiveTab("voice")}>
            <i className="action-icon">🎤</i>
            <span>Voice Commands</span>
          </button>
          <button onClick={() => refreshStatus()}>
            <i className="action-icon">🔄</i>
            <span>Refresh Status</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus
