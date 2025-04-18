import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import FaceAuth from "./components/FaceAuth"
import Dashboard from "./components/Dashboard"
import "./styles/App.css"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FaceAuth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
