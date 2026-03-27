const sectionIcons = {
  Dashboard: "📊",
  Records: "🧾",
  Violations: "⚠️",
  Recommendations: "💡",
  Input: "✍️",
  "My Records": "📋",
  Alerts: "🚨",
  Overview: "🧭",
  Counts: "🔢",
  Chart: "📈",
  "Trend Analytics": "📊"
}

function Sidebar({ items, active, onSelect }) {
  return (
    <aside className="w-full md:w-64 bg-slate-900/80 border border-slate-700 rounded-3xl p-3 space-y-2 shadow-xl backdrop-blur-lg">
      {items.map((item) => (
        <button key={item} onClick={() => onSelect(item)} className={`w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition ${active===item ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 shadow" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
          <span className="mr-2">{sectionIcons[item] || "•"}</span> {item}
        </button>
      ))}
    </aside>
  )
}

export default Sidebar

