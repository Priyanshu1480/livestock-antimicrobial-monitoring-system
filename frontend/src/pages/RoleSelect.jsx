import { useNavigate } from "react-router-dom"

const roles = [
  { id: "farmer", label: "Farmer", emoji: "🐄", description: "Submit farm medication records" },
  { id: "vet", label: "Veterinarian", emoji: "🩺", description: "Review compliance and safety alerts" },
  { id: "admin", label: "Admin", emoji: "🛡️", description: "Monitor enterprise analytics" }
]

function RoleSelect() {
  const navigate = useNavigate()

  const handleSelect = (role) => {
    localStorage.setItem("selectedRole", role)
    navigate(`/login?role=${role}`)
  }

  return (
    <div className="role-select-container h-screen text-slate-100 p-4 flex items-center justify-center" style={{
      backgroundImage: 'url(https://images.unsplash.com/photo-1500595046743-cd271d694d30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'scroll',
    }}>
      <div className="role-select-content w-full max-w-5xl">
        <div className="role-select-card rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8 fade-up">
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-200 font-semibold">Start with your role</div>
            <h1 className="text-4xl sm:text-5xl font-black mt-3 text-white">Choose Your Portal</h1>
            <p className="mt-3 text-slate-200 text-base">Role-based secure dashboards for farmers, veterinarians, and admins.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {roles.map((role, index) => (
              <button 
                key={role.id} 
                onClick={() => handleSelect(role.id)} 
                className="role-card-item rounded-2xl p-6 text-left"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-5xl mb-3">{role.emoji}</div>
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-300 font-bold">{role.label}</div>
                <div className="text-sm text-slate-200 mt-3">{role.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleSelect
