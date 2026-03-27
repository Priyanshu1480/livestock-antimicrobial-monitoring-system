import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

function Navbar({ role, homePath, onLogout, onThemeToggle, isDark }) {
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
        const res = await fetch("http://localhost:5000/api/records")
        const data = await res.json()
        const vio = data.filter((r) => Number(r.residue_value) > Number(r.MRL_limit) || (r.withdrawal_end_date && new Date().toISOString().slice(0, 10) < r.withdrawal_end_date) || r.compliance_status?.toLowerCase() === "violation" || r.status === "flagged")
        const notes = vio.slice(0, 8).map((r, i) => ({ id: `${r.record_id}-${i}`, title: `${r.record_id} Violation`, message: `${r.drug_name || "Drug"} residue high`, read: false }))
        setNotifications(notes)
        setUnread(notes.length)
      } catch (err) {
        console.error(err)
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
    <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-800 p-3 rounded-2xl shadow text-white border border-white/10">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-100/80">Antimicrobial Monitoring</div>
        <div className="text-lg font-semibold tracking-wide">{role} Portal</div>
        <div className="text-xs text-slate-200 mt-1">Welcome back, {role}</div>
      </div>

      <div className="flex items-center gap-2 text-xs relative" ref={ref}>
        <div className="rounded-full bg-slate-900/60 px-2 py-1 text-slate-100 drop-shadow">{dateStr}&nbsp;{timeStr}</div>
        <button onClick={onThemeToggle} className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 transition hover:bg-white/20">{isDark ? "☀️ Light" : "🌙 Dark"}</button>
        <div className="relative">
          <button onClick={() => setIsOpen((p) => !p)} className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 transition hover:bg-white/20">🔔</button>
          {unread > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-rose-400 px-1 text-[10px] font-bold">{unread}</span>}
          {isOpen && (
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-slate-300"><span>Notifications</span><button onClick={markAllRead} className="text-cyan-300 hover:text-cyan-100">Mark read</button></div>
              <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                {notifications.length === 0 ? <div className="text-slate-300 text-xs p-2">No notifications.</div> : notifications.map((n) => <div key={n.id} className={`rounded-lg p-2 text-xs ${n.read ? "bg-slate-800" : "bg-cyan-900/20 border border-cyan-400/30"}`}><div className="font-semibold">{n.title}</div><div>{n.message}</div></div>)}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => { localStorage.removeItem("selectedRole"); nav("/") }} className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 transition hover:bg-white/20">Home</button>
        <button onClick={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); onLogout() }} className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 transition hover:bg-red-500/80">Logout</button>
      </div>
    </header>
  )
}

export default Navbar

