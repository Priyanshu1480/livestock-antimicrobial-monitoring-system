import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import "./App.css"
import Login from "./pages/Login"
import RoleSelect from "./pages/RoleSelect"
import FarmerDashboard from "./pages/FarmerDashboard"
import VetDashboard from "./pages/VetDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import PublicVerification from "./pages/PublicVerification"
import AIAssistant from "./components/AIAssistant"

function getAuth() {
  try {
    const data = JSON.parse(localStorage.getItem("auth") || "null")
    if (data && data.role && data.username) return data
  } catch {
    return null
  }
  return null
}

function ProtectedRoute({ allowedRole, auth, children }) {
  if (!auth) return <Navigate to="/" replace />
  if (allowedRole && auth.role !== allowedRole) return <Navigate to={`/${auth.role}`} replace />
  return children
}

function App() {
  const [auth, setAuth] = useState(getAuth())

  const handleLogin = (authData) => {
    setAuth(authData)
    localStorage.setItem("auth", JSON.stringify(authData))
  }

  const handleLogout = () => {
    setAuth(null)
    localStorage.removeItem("auth")
    localStorage.removeItem("selectedRole")
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelect auth={auth} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/farmer" 
            element={
              <ProtectedRoute allowedRole="farmer" auth={auth}>
                <FarmerDashboard auth={auth} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vet" 
            element={
              <ProtectedRoute allowedRole="vet" auth={auth}>
                <VetDashboard auth={auth} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
           <Route path="/admin" 
             element={
               <ProtectedRoute allowedRole="admin" auth={auth}>
                 <AdminDashboard auth={auth} onLogout={handleLogout} />
               </ProtectedRoute>
             } 
           />
           <Route path="/verify/:id" element={<PublicVerification />} />
           <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AIAssistant auth={auth} />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
