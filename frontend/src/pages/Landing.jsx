import { useNavigate } from "react-router-dom"
import Button from "../components/Button"

function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-800/30 blur-[120px] pointer-events-none" />
      
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 p-6 md:p-12 relative z-10">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mt-8">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-4 inline-flex items-center gap-2">
              <span className="w-8 h-px bg-teal-400/50 block"></span> Antimicrobial IntelliHub
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
              Framework for Monitoring <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">Antimicrobial Usage</span> <br/>in Livestock
            </h1>
            <p className="mt-3 max-w-xl text-slate-400 text-lg leading-relaxed">
              Track, analyze, and regulate antimicrobial usage to ensure food safety and compliance across farms, clinics, and regulators.
            </p>
            <div className="flex gap-4 mt-8">
              <Button size="lg" variant="primary" onClick={() => navigate("/sel")}>Get Started</Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/login")}>Enter System</Button>
            </div>
          </div>
          
          <div className="hidden lg:block w-full max-w-md relative">
             <div className="aspect-square rounded-full border border-slate-700/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150 pointer-events-none" />
             <div className="aspect-square rounded-full border border-slate-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2] pointer-events-none z-[-1]" />
             <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-2xl relative z-10 transform rotate-[-2deg] translate-x-4">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                  <div className="text-sm font-medium text-slate-300">Live Status</div>
                  <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Systems Active</div>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center"><span className="text-slate-400 text-xs">Monitored Farms</span><span className="font-semibold text-white">1,204</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center"><span className="text-slate-400 text-xs">Compliance Rate</span><span className="font-semibold text-teal-400">97.2%</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center"><span className="text-slate-400 text-xs">Active Alerts</span><span className="font-semibold text-rose-400">3</span></div>
                </div>
             </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-12 mt-12 border-t border-slate-800/50 pt-16">
          <div className="md:col-span-12 mb-4">
             <h2 className="text-2xl font-semibold mb-2">Core Capabilities</h2>
             <p className="text-slate-400">Streamlined tools for every stakeholder in the process.</p>
          </div>
          
          <div className="md:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 hover:bg-slate-900/60 transition group flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="text-teal-400 mb-6 bg-teal-900/20 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </div>
              <h3 className="text-xl font-medium mb-3">Farmer Input</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Submit medication records seamlessly and transparently monitor risk levels in real-time. Automatic calculation of safety periods.</p>
            </div>
            <div className="mt-8 border-t border-slate-800 pt-4"><span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Role Access</span><div className="mt-1 text-sm">Farmer Portal</div></div>
          </div>
          
          <div className="md:col-span-7 flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 hover:bg-slate-900/60 transition group flex flex-col sm:flex-row gap-6">
              <div className="text-blue-400 bg-blue-900/20 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition shrink-0">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">Veterinarian Review</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Evaluate violations, generate recommendations, and ensure compliance standards are met across patient histories.</p>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Veterinarian Portal</div>
              </div>
            </div>
            
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 hover:bg-slate-900/60 transition group flex flex-col sm:flex-row gap-6">
              <div className="text-indigo-400 bg-indigo-900/20 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition shrink-0">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">Admin Controls</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Analyze macro compliance trends, execute rule checks, export multi-variable reports and oversee the entire ecosystem.</p>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Admin Portal</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Landing
