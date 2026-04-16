import { useNavigate } from "react-router-dom"
import Button from "../components/Button"

const roles = [
  { id: "farmer", label: "Farmer", emoji: "🐄", description: "Submit and manage records with AI-assisted diagnosis" },
  { id: "vet", label: "Veterinarian", emoji: "🩺", description: "Review treatments with Intelligent Case Review" },
  { id: "admin", label: "Admin", emoji: "🛡️", description: "Monitor compliance labels and AI-driven trends" }
]

function RoleSelect({ auth }) {
  const navigate = useNavigate()

  const handleSelect = (role) => {
    localStorage.setItem("selectedRole", role)
    navigate(`/login?role=${role}`)
  }

  const handleResume = () => {
    if (auth && auth.role) {
      navigate(`/${auth.role}`)
    }
  }

  return (
    <div className="role-select-container min-h-screen text-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="role-select-content w-full max-w-5xl">
        <div className="mt-8 text-center mb-12 fade-up">
          <div className="text-xs uppercase tracking-widest text-teal-400 font-black mb-3">AI-POWERED LIVESTOCK HEALTH MONITORING SYSTEM</div>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 text-white">Choose Your Portal</h1>
          
          <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-800/60 pt-8 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-cyan-300 tracking-tight">Intelligent Livestock Management</h2>
            
            <p className="text-base text-slate-200 font-medium tracking-wide">A Project by Priyanshu, Aditya, and Harika</p>
          </div>
          
          <p className="mt-6 text-slate-500 text-xs uppercase tracking-widest max-w-xl mx-auto font-medium">
            AI-Integrated Portals &nbsp;·&nbsp; Farmers &nbsp;·&nbsp; Veterinarians &nbsp;·&nbsp; Administrators
          </p>

          {auth && (
            <div className="mt-8 fade-in">
              <button 
                onClick={handleResume}
                className="group relative px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white font-black text-xs md:text-sm tracking-widest transition-all flex items-center gap-3 mx-auto shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 outline-none border border-amber-400/50"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                RETURN TO {auth.role.toUpperCase()} DASHBOARD
                <svg className="group-hover:translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto pb-12">
          {roles.map((role, index) => (
            <button 
              key={role.id} 
              onClick={() => handleSelect(role.id)} 
              className="role-card-item rounded-2xl p-8 text-left h-full flex flex-col"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-4xl mb-6 bg-slate-800/50 w-16 h-16 flex items-center justify-center rounded-xl border border-slate-700/50 shrink-0">{role.emoji}</div>
              <div className="text-xl text-white font-medium mb-2">{role.label}</div>
              <div className="text-sm text-slate-400 leading-relaxed flex-grow">{role.description}</div>
              <div className="mt-6 text-teal-400 text-sm font-medium flex items-center gap-1 opacity-0 transition-opacity duration-300">
                Continue <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          ))}
        </div>
        
        <div className="w-full text-center mt-auto pt-6 pb-2 text-xs font-mono tracking-widest text-slate-500/60">
          Version 1.0 | Academic Capstone Project
        </div>

      </div>
    </div>
  )
}

export default RoleSelect
