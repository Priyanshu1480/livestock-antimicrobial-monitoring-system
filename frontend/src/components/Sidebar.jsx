const sectionIcons = {
  Dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Overview: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2 2"/><path d="m7.8 16.2 2-2"/><circle cx="12" cy="12" r="2"/><path d="m16.2 16.2-2-2"/><path d="m7.8 7.8 2-2"/></svg>,
  Analytics: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  Alerts: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
  "Consumer Safety": <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  Reports: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Input: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  "My Records": <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  "Farm Dashboard": <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "Dose Guide": <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Users: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M23 7a4 4 0 0 1 0 7.75"/></svg>,
}

function Sidebar({ items, active, onSelect }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/40 border-r border-slate-800/50 backdrop-blur-2xl z-40 hidden md:flex flex-col p-6 pt-24 transition-all duration-300">
      <div className="flex flex-col space-y-2">
        {items.map((item) => (
          <button 
            key={item} 
            onClick={() => onSelect(item)} 
            className={`flex items-center gap-3 w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group ${
              active === item 
                ? "bg-slate-800/50 text-cyan-400 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/30"
            }`}
          >
            <span className={`transition-transform duration-300 group-hover:scale-110 ${active === item ? "text-cyan-400" : "text-slate-500"}`}>
              {sectionIcons[item] || <span className="w-1 h-1 rounded-full bg-slate-500" />}
            </span>
            {item}
            {active === item && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-auto space-y-4">
        {/* User Profile Badge */}
        {(() => {
          const auth = JSON.parse(localStorage.getItem("auth") || "{}");
          if (!auth.name) return null;
          return (
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5 backdrop-blur-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
                {auth.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{auth.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{auth.role}</p>
              </div>
            </div>
          )
        })()}

        {/* AI QUICK ACCESS */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent("agroLensToggle"))}
          className="w-full bg-gradient-to-br from-cyan-500/10 to-blue-600/5 hover:from-cyan-500/20 hover:to-blue-600/10 rounded-2xl p-4 border border-cyan-500/30 backdrop-blur-md flex items-center gap-3 transition-all duration-300 group shadow-lg shadow-cyan-500/5 active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-400/30 group-hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="m3.34 7 1.66 3"/><path d="M7 3h4"/><path d="M20.66 7 19 10"/><path d="M17 3h-4"/><path d="M3.1 14h17.8"/><path d="M4.5 14c-.9 3 0 5 2.5 5h10c2.5 0 3.4-2 2.5-5"/></svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-black">AI Intelligence</p>
            <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">✨ Ask AgroLens</p>
          </div>
        </button>

        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">System Health</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-xs text-emerald-400 font-medium font-mono">Live Sync: Active</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

