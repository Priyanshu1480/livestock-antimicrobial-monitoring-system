import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

function Navbar({ role, homePath, onLogout }) {
  const { isDark, toggleTheme } = useTheme()
  const [time, setTime] = useState(new Date())
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const nav = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const url = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/records"
        const res = await fetch(url)
        const data = await res.json()
        
        let notes = []
        if (role === "Admin") {
          const vio = data.filter(r => r.mrl_status && r.mrl_status !== "Safe" && r.mrl_status !== "safe")
          notes = vio.slice(0, 8).map((r, i) => ({ id: `admin-${r.record_id}-${i}`, title: `Violation Alert 🚨`, message: `${r.farm_id}: ${r.drug_name} residue exceeded MRL`, read: false }))
        } else if (role === "Veterinarian") {
          const pen = data.filter(r => {
             const stat = (r.status || r.vet_status || r.compliance_status || "").toString().toLowerCase()
             return stat === "pending" || stat === "not reviewed" || stat === "" || !r.status
          })
          notes = pen.slice(0, 8).map((r, i) => ({ id: `vet-${r.record_id}-${i}`, title: `Review Pending 🩺`, message: `Animal ${r.animal_id} at ${r.farm_id} requires review`, read: false }))
        } else {
          const rejs = data.filter(r => {
             const stat = (r.status || r.vet_status || r.compliance_status || "").toString().toLowerCase()
             return stat === "rejected" || stat === "not safe" || (r.mrl_status && r.mrl_status !== "Safe" && r.mrl_status !== "safe")
          })
          notes = rejs.slice(0, 8).map((r, i) => ({ id: `farmer-${r.record_id}-${i}`, title: `Record Flagged ⚠️`, message: `Treatment for ${r.animal_id} was rejected.`, read: false }))
        }

        if (notes.length === 0) {
          notes = [{ id: 'sys-ok', title: 'System Status ✅', message: 'No new critical alerts at this time.', read: true }]
        }
        
        setNotifications(notes)
        setUnread(notes.filter(n => !n.read).length)
      } catch (err) {
        console.error("Notifications error", err)
      }
    }
    loadNotifications()
  }, [])

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  const dateStr = time.toLocaleDateString()
  const timeStr = time.toLocaleTimeString()

  return (
    <header className="relative z-50 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-slate-800">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-teal-400/80 font-medium">Antimicrobial Monitoring</div>
        <div className="text-lg font-medium tracking-tight text-white">{role} Portal</div>
        <div className="text-xs text-slate-400 mt-0.5">Welcome back, {role}</div>
      </div>

      <div className="flex items-center gap-2 text-xs relative" ref={ref}>
        <div className="hidden sm:block rounded-full bg-slate-800/80 px-3 py-1.5 text-slate-300 tabular-nums border border-slate-700/50 shadow-inner tracking-wide">{dateStr} {timeStr}</div>
        <button onClick={toggleTheme} className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 transition hover:bg-slate-700 hover:text-white text-slate-300">{isDark ? "☀️ Light" : "🌙 Dark"}</button>
        <div className="relative">
          <button onClick={() => setIsOpen((p) => !p)} className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 transition hover:bg-slate-700 hover:text-white text-slate-300 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            {unread > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 ring-2 ring-slate-900 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold text-white">{unread}</span>}
          </button>
          
          {isOpen && (
            <div className="absolute right-0 z-50 mt-3 w-80 rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl origin-top-right transition-all">
              <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-slate-800 mb-2">
                <span className="font-medium text-slate-200">Notifications</span>
                <button onClick={markAllRead} className="text-teal-400 hover:text-teal-300 transition">Mark as read</button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {notifications.length === 0 ? <div className="text-slate-400 text-xs p-3 text-center">No notifications right now.</div> : notifications.map((n) => <div key={n.id} className={`rounded-lg p-3 text-xs transition duration-200 ${n.read ? "bg-slate-800/40 text-slate-400" : "bg-teal-900/10 border border-teal-500/20 text-slate-200"}`}><div className="font-medium mb-0.5 flex items-center gap-1.5">{!n.read && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 block" />} {n.title}</div><div className={n.read ? "text-slate-500" : "text-slate-400 ml-3"}>{n.message}</div></div>)}
              </div>
            </div>
          )}
        </div>


        <button onClick={() => { localStorage.removeItem("selectedRole"); nav("/") }} className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 transition hover:bg-slate-700 hover:text-white text-slate-300">Home</button>
        <button onClick={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); onLogout() }} className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-rose-400 transition hover:bg-rose-500/20 border border-rose-500/20">Sign Out</button>
      </div>
    </header>
  )
}

export default Navbar

