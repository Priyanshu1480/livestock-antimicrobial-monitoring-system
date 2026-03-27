import { useNavigate } from "react-router-dom"

function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-900 text-white overflow-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-200">Antimicrobial IntelliHub</div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">Digital Framework for Monitoring Antimicrobial Usage in Livestock</h1>
            <p className="mt-3 max-w-2xl text-slate-200 text-sm md:text-base">Track, analyze, and regulate antimicrobial usage to ensure food safety and compliance across farms, clinics, and regulators.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/sel")} className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 font-semibold text-slate-900 shadow-lg hover:scale-[1.03] transition">Get Started</button>
            <button onClick={() => navigate("/login")} className="rounded-xl border border-cyan-300/70 bg-slate-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-slate-700 transition">Enter System</button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Monitoring", desc: "Real-time farm data ingestion and traceability.", icon: "📡" },
            { title: "Compliance", desc: "Automatic rule checks and violation alerts.", icon: "✅" },
            { title: "Alerts", desc: "Priority notifications for critical residue issues.", icon: "🚨" }
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-600/50 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl hover:-translate-y-1 transition">
              <div className="text-3xl">{item.icon}</div>
              <div className="mt-2 font-semibold text-lg">{item.title}</div>
              <div className="mt-1 text-slate-300 text-sm">{item.desc}</div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6 backdrop-blur-md shadow-xl">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/30 via-indigo-500/20 to-cyan-400/20 p-4">
              <div className="text-2xl">🐄</div>
              <div className="mt-2 text-sm font-semibold">Farmer Input</div>
              <div className="text-slate-300 text-xs">Submit medication records and monitor risk.</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/30 via-yellow-500/20 to-orange-500/20 p-4">
              <div className="text-2xl">🩺</div>
              <div className="mt-2 text-sm font-semibold">Veterinarian Review</div>
              <div className="text-slate-300 text-xs">Evaluate violations and generate recommendations.</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500/30 via-indigo-500/20 to-blue-500/20 p-4">
              <div className="text-2xl">🛡️</div>
              <div className="mt-2 text-sm font-semibold">Admin Controls</div>
              <div className="text-slate-300 text-xs">Analyze compliance trends and export reports.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Landing
