import { useEffect, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import Button from "../components/Button"

const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

const users = {
  FARMER: { password: "FARMER@12", role: "farmer" },
  VETERINARIAN: { password: "VETERINARIAN@12", role: "vet" },
  ADMIN: { password: "ADMIN@12", role: "admin" }
}

const ROLE_DISPLAY = {
  farmer: "FARMER",
  vet: "VETERINARIAN",
  admin: "ADMIN"
}

const ROLE_LABEL = {
  farmer: "FARMER",
  vet: "VETERINARIAN",
  admin: "ADMIN"
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [selectedRole, setSelectedRole] = useState("")

  useEffect(() => {
    const role = searchParams.get("role") || localStorage.getItem("selectedRole")
    if (!role) {
      navigate("/")
      return
    }
    setSelectedRole(role)
    const autoUser = ROLE_DISPLAY[role] || role.toUpperCase()
    setUsername(autoUser)
    localStorage.setItem("selectedRole", role)
  }, [searchParams, navigate])

  const doLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const normalized = username.trim().toUpperCase()
    
    const handleSuccess = (authData) => {
      setLoginSuccess(true)
      onLogin(authData)
      localStorage.removeItem("selectedRole")
      setTimeout(() => {
        navigate(`/${authData.role}`)
      }, 600)
    }

    // -- DUAL MODE: Check Demo Users First --
    const demoUser = users[normalized]
    if (demoUser && demoUser.password === password) {
      if (selectedRole) {
        const roleMatch = (selectedRole === "vet" ? "vet" : selectedRole) === demoUser.role
        if (!roleMatch) {
          setError(`Expected ${ROLE_LABEL[selectedRole] || selectedRole.toUpperCase()} login for this role.`)
          setLoading(false)
          return
        }
      }
      
      handleSuccess({ 
        username: normalized, 
        role: demoUser.role, 
        name: normalized === "FARMER" ? "Farmer" : normalized === "VETERINARIAN" ? "Veterinarian" : "Admin",
        isDemo: true
      })
      setLoading(false)
      return
    }

    // -- DUAL MODE: Call Backend API for Registered Users --
    try {
      const response = await fetch(`${VITE_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials.")
      }

      // Final Role Validation (if coming from RoleSelect)
      if (selectedRole) {
        const roleMatch = (selectedRole === "vet" ? "vet" : selectedRole) === data.role
        if (!roleMatch) {
          throw new Error(`Your account role (${data.role}) does not match the selected portal (${selectedRole}).`)
        }
      }

      handleSuccess({ 
        username: data.username, 
        role: data.role, 
        name: data.name,
        country: data.country,
        farm_id: data.farm_id,
        license_id: data.license_id,
        isDemo: false
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const roleLabel = selectedRole ? ROLE_LABEL[selectedRole] || selectedRole.toUpperCase() : "Your Role"

  const roleBackgroundMap = {
    farmer: 'login-bg-farmer',
    vet: 'login-bg-vet',
    admin: 'login-bg-admin'
  }

  const bgClass = selectedRole ? roleBackgroundMap[selectedRole.toLowerCase()] : 'bg-[#0a0a0a]'

  return (
    <div className={`min-h-screen text-slate-100 p-4 flex flex-col items-center justify-center relative overflow-hidden ${bgClass}`}>
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-[40%] h-[40%] rounded-full bg-teal-900/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30%] h-[30%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none" />
      
      <div className="relative w-full max-w-sm rounded-[2rem] border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-2xl shadow-2xl transition-all duration-300">
        <button 
          onClick={() => navigate("/")}
          className="absolute top-6 left-6 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all group z-20"
          title="Back to Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 font-medium tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> {roleLabel} Login
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to your account to continue</p>
        </div>

        <form onSubmit={doLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">User ID</label>
            <div className="relative">
               <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. FARMER" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500" required />
            </div>
            {selectedRole && <div className="text-[11px] text-slate-500 mt-1">Auto-filled: {ROLE_LABEL[selectedRole] || selectedRole}</div>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500 pr-10" required />
              <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm transition">
                 {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading || loginSuccess}
              variant={loginSuccess ? "success" : "primary"}
              className={`w-full transition-all duration-300 ${loginSuccess ? 'bg-emerald-500 hover:bg-emerald-500 scale-105 shadow-lg shadow-emerald-500/20' : ''}`}
            >
              {loginSuccess ? "Success ✓" : (loading ? "Singing In..." : "Sign In")}
            </Button>
          </div>
          
          {error && <div className="text-rose-400 text-xs text-center border border-rose-500/20 bg-rose-500/10 p-2 rounded-lg">{error}</div>}
          
          <div className="text-center mt-4">
            <button 
              type="button"
              onClick={() => navigate("/register")}
              className="text-xs text-slate-400 hover:text-teal-400 transition"
            >
              New User? <span className="font-bold">Register Account</span>
            </button>
          </div>
        </form>

        {selectedRole && (
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="text-[13px] font-semibold text-slate-300 mb-2">Features:</div>
            <ul className="space-y-1.5 text-[13px] text-slate-400/80 list-disc pl-4 marker:text-slate-600">
              {selectedRole.toLowerCase() === "farmer" && (
                <>
                  <li>Record livestock treatment details</li>
                  <li>Select animal, disease, and symptoms</li>
                  <li>Receive suggested dosage guidance</li>
                  <li>Track submitted treatment history</li>
                </>
              )}
              {selectedRole.toLowerCase() === "vet" && (
                <>
                  <li>Review farmer-submitted records</li>
                  <li>Approve or reject treatments</li>
                  <li>Add expert notes and recommendations</li>
                  <li>Monitor violations and risk levels</li>
                </>
              )}
              {selectedRole.toLowerCase() === "admin" && (
                <>
                  <li>View system-wide records and analytics</li>
                  <li>Monitor compliance and violations</li>
                  <li>Analyze trends across farms and regions</li>
                  <li>Generate reports and insights</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
