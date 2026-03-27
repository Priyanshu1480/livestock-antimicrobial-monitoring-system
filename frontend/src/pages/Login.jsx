import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

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

function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
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

  const doLogin = (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const normalized = username.trim().toUpperCase()
    const user = users[normalized]
    if (!user || user.password !== password) {
      setTimeout(() => {
        setError("Invalid credentials.")
        setLoading(false)
      }, 250)
      return
    }

    if (selectedRole) {
      const expectedUsername = ROLE_DISPLAY[selectedRole] || ""
      const normalizedRole = user.role
      const roleMatch = (selectedRole === "vet" ? "vet" : selectedRole) === normalizedRole
      if (!roleMatch) {
        setTimeout(() => {
          setError(`Expected ${ROLE_LABEL[selectedRole] || selectedRole.toUpperCase()} login for this role.`)
          setLoading(false)
        }, 250)
        return
      }
      // keep validation: username must correspond either to selected role prefills or valid user
      if (!normalized || !users[normalized]) {
        setTimeout(() => {
          setError("Invalid user ID.")
          setLoading(false)
        }, 250)
        return
      }
    }

    const finalRole = user.role
    localStorage.setItem("auth", JSON.stringify({ username: normalized, role: finalRole }))
    localStorage.removeItem("selectedRole")
    setLoading(false)
    navigate(`/${finalRole}`)
  }

  const roleLabel = selectedRole ? ROLE_LABEL[selectedRole] || selectedRole.toUpperCase() : "Your Role"

  const roleBackgroundMap = {
    farmer: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    vet: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    admin: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'
  }

  const backgroundImage = roleBackgroundMap[selectedRole] || 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'

  return (
    <div className="h-screen text-slate-100 p-4 flex items-center justify-center" style={{
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'scroll',
      filter: 'brightness(1.1) saturate(1.2)',
      willChange: 'transform',
      animation: 'backgroundFloat 18s linear infinite'
    }}>
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-blue-900/30 to-slate-950/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900/70 via-slate-800/70 to-indigo-900/70 p-6 backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,145,178,0.45)]">
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-200">🔒 Logging in as {roleLabel}</div>
          <h1 className="text-3xl font-bold mt-3">Secure Login</h1>
          <p className="text-slate-300 text-sm mt-1">Login to continue as {roleLabel}</p>
        </div>
        <button onClick={() => { localStorage.removeItem("selectedRole"); navigate("/") }} className="mb-3 px-3 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 text-slate-900 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_rgba(0,255,200,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60">← Back to Home</button>
        <form onSubmit={doLogin} className="space-y-3">
          <div className="rounded-xl border border-slate-600 bg-slate-900 p-2 transition focus-within:border-cyan-400">
            <label className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">User ID</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. FARMER" className="mt-1 w-full bg-transparent outline-none text-sm text-white border border-cyan-300/20 bg-cyan-500/5 px-2 py-1" required />
            {selectedRole && <div className="mt-1 text-[11px] text-slate-400">Auto-filled from selected role: {ROLE_LABEL[selectedRole] || selectedRole.toUpperCase()}</div>}
          </div>

          <div className="relative rounded-xl border border-slate-600 bg-slate-900 p-2 transition focus-within:border-cyan-400">
            <label className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">Password</label>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="mt-1 w-full bg-transparent outline-none text-sm text-white pr-10" required />
            <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 text-sm">{showPassword ? "🙈" : "👁️"}</button>
          </div>
          <button
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-slate-900 uppercase tracking-wide shadow-lg shadow-cyan-400/30 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_24px_rgba(0,245,255,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="relative inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/80 animate-pulse" />
              {loading ? "Validating..." : "Login"}
            </span>
          </button>
          {error && <div className="text-red-300 text-xs animate-pulse">{error}</div>}
        </form>
      </div>
    </div>
  )
}

export default Login
