import { useNavigate } from "react-router-dom"
import Button from "../components/Button"

const roles = [
  { id: "farmer", label: "Farmer", emoji: "🐄", description: "Submit and manage livestock treatment records" },
  { id: "vet", label: "Veterinarian", emoji: "🩺", description: "Review treatments and ensure compliance" },
  { id: "admin", label: "Admin", emoji: "🛡️", description: "Monitor system analytics and compliance trends" }
]

function RoleSelect() {
  const navigate = useNavigate()

  const handleSelect = (role) => {
    localStorage.setItem("selectedRole", role)
    navigate(`/login?role=${role}`)
  }

  return (
    <div className="role-select-container min-h-screen text-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="role-select-content w-full max-w-5xl">
        <div className="mt-8 text-center mb-12 fade-up">
          <div className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-3">ADVANCED LIVESTOCK HEALTH MONITORING SYSTEM</div>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 text-white">Choose Your Portal</h1>
          
          <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-800/60 pt-8 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-semibold text-cyan-300 tracking-tight">Smart Livestock Monitoring System</h2>
            
            <p className="text-base text-slate-200 font-medium tracking-wide">A Project by Priyanshu, Aditya, and Harika</p>
            
            <p className="text-sm text-slate-400 tracking-wide">Guided by <span className="text-teal-400 font-semibold">Dr. Syed Abdul Basit Andrabi</span></p>
            
            <p className="text-sm text-slate-300/80 italic px-4 py-2 rounded-full border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm tracking-wide">
              ✦ &nbsp;Safe Livestock. &nbsp;Trusted Data. &nbsp;Better Outcomes. &nbsp;✦
            </p>
          </div>
          
          <p className="mt-6 text-slate-500 text-xs uppercase tracking-widest max-w-xl mx-auto">
            Role-based portals &nbsp;·&nbsp; Farmers &nbsp;·&nbsp; Veterinarians &nbsp;·&nbsp; Administrators
          </p>
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
