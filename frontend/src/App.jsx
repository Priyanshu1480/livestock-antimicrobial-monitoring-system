import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./App.css"
import Login from "./pages/Login"
import RoleSelect from "./pages/RoleSelect"
import FarmerDashboard from "./pages/FarmerDashboard"
import VetDashboard from "./pages/VetDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import NotFound from "./pages/NotFound"

function getAuth() {
  try {
    const data = JSON.parse(localStorage.getItem("auth") || "null")
    if (data && data.role && data.username) return data
  } catch {
    return null
  }
  return null
}

function ProtectedRoute({ allowedRole, children }) {
  const auth = getAuth()
  if (!auth) return <Navigate to="/" replace />
  if (allowedRole && auth.role !== allowedRole) return <Navigate to={`/${auth.role}`} replace />
  return children
}

function App() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const darkMode = stored ? stored === "dark" : true
    setIsDark(darkMode)
    if (darkMode) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem("theme", next ? "dark" : "light")
      if (next) document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      return next
    })
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/sel" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerDashboard isDark={isDark} onThemeToggle={toggleTheme} /></ProtectedRoute>} />
        <Route path="/vet" element={<ProtectedRoute allowedRole="vet"><VetDashboard isDark={isDark} onThemeToggle={toggleTheme} /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard isDark={isDark} onThemeToggle={toggleTheme} /></ProtectedRoute>} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
