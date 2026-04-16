import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"

const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "farmer",
    country: "",
    farm_id: "",
    license_id: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const hangleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const doRegister = async (e) => {
    e.preventDefault()
    setError("")
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${VITE_API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }
      setSuccess(true)
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-100 p-4 flex flex-col items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-[40%] h-[40%] rounded-full bg-teal-900/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30%] h-[30%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none" />
      
      <div className="relative w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-2xl shadow-2xl transition-all duration-300">
        <button 
          onClick={() => navigate("/login")}
          className="absolute top-6 left-6 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all group z-20"
          title="Back to Login"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 font-medium tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> Join the Network
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Create Account</h1>
          <p className="text-slate-400 text-sm mt-2">Professional registration for authorities & farmers</p>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 className="text-xl font-bold text-white">Registration Successful!</h2>
            <p className="text-slate-400 text-sm">Redirecting you to login...</p>
          </div>
        ) : (
          <form onSubmit={doRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Full Name</label>
                <input name="name" value={formData.name} onChange={hangleChange} placeholder="John Doe" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Username</label>
                <input name="username" value={formData.username} onChange={hangleChange} placeholder="jdoe123" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={hangleChange} placeholder="••••••••" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500 pr-10" required />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm transition">
                   {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Role</label>
              <select name="role" value={formData.role} onChange={hangleChange} className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
                <option value="farmer" className="bg-slate-900">Farmer</option>
                <option value="vet" className="bg-slate-900">Veterinarian</option>
                <option value="admin" className="bg-slate-900">Administrator</option>
              </select>
            </div>

            {formData.role === "farmer" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Country</label>
                  <input name="country" value={formData.country} onChange={hangleChange} placeholder="e.g. USA" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Farm ID</label>
                  <input name="farm_id" value={formData.farm_id} onChange={hangleChange} placeholder="F-102" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500" required />
                </div>
              </div>
            )}

            {formData.role === "vet" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <label className="text-xs font-medium text-slate-400">Medical License ID</label>
                <input name="license_id" value={formData.license_id} onChange={hangleChange} placeholder="LIC-9982" className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500" required />
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full h-12"
              >
                {loading ? "Creating Account..." : "Register Now"}
              </Button>
            </div>
            
            {error && <div className="text-rose-400 text-xs text-center border border-rose-500/20 bg-rose-500/10 p-2 rounded-lg">{error}</div>}
            
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs text-slate-400 hover:text-teal-400 transition"
              >
                Already have an account? <span className="font-bold">Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Register
