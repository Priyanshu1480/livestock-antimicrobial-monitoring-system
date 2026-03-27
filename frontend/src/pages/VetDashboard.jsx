import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Loading from "../components/Loading"

const sidebarItems = ["Dashboard", "Records", "Violations", "Recommendations", "Risk Analysis"]

function isViolation(record) {
  const overLimit = Number(record.residue_value || 0) > Number(record.MRL_limit || 0)
  const earlyUse = record.withdrawal_end_date && new Date().toISOString().slice(0, 10) < record.withdrawal_end_date
  const parsedDose = Number(record.dose_mg_kg || record.dose || 0)
  const highDose = parsedDose > 35
  const status = record.compliance_status?.toLowerCase() === "violation" || record.status === "flagged"
  return overLimit || earlyUse || highDose || status
}

function getRiskLevel(record) {
  if (isViolation(record)) {
    const residue = Number(record.residue_value || 0)
    const limit = Number(record.MRL_limit || 50)
    if (residue > limit * 2) return "High"
    return "Medium"
  }
  return "Low"
}

function VetDashboard({ isDark, onThemeToggle }) {
  const nav = useNavigate()
  const [active, setActive] = useState("Dashboard")
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const [countryFilter, setCountryFilter] = useState("All")
  const [farmFilter, setFarmFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [problemFilter, setProblemFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [animalHistory, setAnimalHistory] = useState(null)
  const [remarks, setRemarks] = useState("")
  const [suggestionText, setSuggestionText] = useState("")
  const [selectedRecords, setSelectedRecords] = useState([])
  const [riskFilter, setRiskFilter] = useState("All")

  const sortByDateDesc = (items) => (items || []).slice().sort((a, b) => {
    const da = new Date(a.administration_date || a.date || 0)
    const db = new Date(b.administration_date || b.date || 0)
    return db - da
  })

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/records`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setRecords(sortByDateDesc(data))
      } else {
        console.error("Invalid data format", data)
        setRecords([])
      }
    } catch (err) {
      console.error("Error loading records:", err)
      setRecords([])
      setMessage("Error loading records - please refresh")
    } finally {
      setLoading(false)
    }
  }

  const updateRecordStatus = async (recordId, action, suggestion) => {
    try {
      setLoading(true)
      const updatePayload = {
        vet_status: action === "approved" ? "approved" : "rejected",
        status: action === "approved" ? "safe" : "not safe",
        vet_notes: suggestion || "",
        vet_remarks: remarks || ""
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      console.log("Record updated:", updated)
      await loadRecords()
      setSelectedRecord(null)
      setRemarks("")
      setSuggestionText("")
      setMessage(action === "approved" ? "✓ Record approved successfully" : "✓ Record declined successfully")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      console.error("Error updating record:", err)
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getAnimalHistory = (animalId) => {
    return records.filter(r => r.animal_id === animalId).sort((a, b) => new Date(b.administration_date) - new Date(a.administration_date))
  }

  const generateAlerts = useMemo(() => {
    const alerts = []
    const animalCounts = {}
    const rejectedCounts = {}

    records.forEach(r => {
      animalCounts[r.animal_id] = (animalCounts[r.animal_id] || 0) + 1
      if (r.vet_status === "rejected") {
        rejectedCounts[r.animal_id] = (rejectedCounts[r.animal_id] || 0) + 1
      }
    })

    records.forEach(r => {
      if (r.vet_status === "not reviewed") {
        if (animalCounts[r.animal_id] > 2) {
          alerts.push({ type: "repeated", id: r.record_id, animal: r.animal_id, message: `Animal treated ${animalCounts[r.animal_id]} times`, severity: "warning" })
        }
        const dose = Number(r.recommended_dose?.split(" ")[0] || 0)
        if (dose > 150) {
          alerts.push({ type: "dose", id: r.record_id, animal: r.animal_id, message: `High dose: ${r.recommended_dose}`, severity: "high" })
        }
      }
      if (rejectedCounts[r.animal_id] > 1) {
        alerts.push({ type: "risk", id: r.record_id, animal: r.animal_id, message: `Multiple rejections for ${r.animal_id}`, severity: "high" })
      }
    })

    return alerts
  }, [records])

  const uniqueProblems = useMemo(() => {
    const problems = new Set(records.map(r => r.problem || r.symptom).filter(Boolean))
    return Array.from(problems).sort()
  }, [records])

  useEffect(() => {
    loadRecords()
  }, [])

  const summary = useMemo(() => {
    const total = records.length
    const violations = records.filter(isViolation).length
    const safe = total - violations
    const byCountry = records.reduce((acc, r) => { acc[r.country] = (acc[r.country] || 0) + 1; return acc }, {})
    const byFarm = records.reduce((acc, r) => { acc[r.farm_id] = (acc[r.farm_id] || 0) + 1; return acc }, {})
    const bySpecies = records.reduce((acc, r) => { acc[r.animal_type || "Unknown"] = (acc[r.animal_type || "Unknown"] || 0) + 1; return acc }, {})
    return { total, violations, safe, byCountry, byFarm, bySpecies }
  }, [records])

  const statusDistribution = useMemo(() => {
    const approved = records.filter(r => r.vet_status === "approved").length
    const rejected = records.filter(r => r.vet_status === "rejected").length
    const pending = records.filter(r => r.vet_status === "not reviewed").length
    const total = summary.total
    return {
      approvedPercent: total ? (approved / total) * 100 : 0,
      rejectedPercent: total ? (rejected / total) * 100 : 0,
      pendingPercent: total ? (pending / total) * 100 : 0,
      approved, rejected, pending
    }
  }, [records, summary.total])

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase()
    return records.filter((r) => {
      if (!r) return false
      const searchFields = [r.record_id, r.animal_id, r.farm_id, r.drug_name, r.animal_type, r.country, r.problem, r.symptom].filter(Boolean).join(" ").toLowerCase()
      if (term && !searchFields.includes(term)) return false
      if (countryFilter !== "All" && r.country !== countryFilter) return false
      if (farmFilter !== "All" && r.farm_id !== farmFilter) return false
      if (statusFilter !== "All") {
        const statusMap = { "Pending": "not reviewed", "Approved": "approved", "Rejected": "rejected" }
        const mappedStatus = statusMap[statusFilter] || statusFilter.toLowerCase()
        if (r.vet_status !== mappedStatus) return false
      }
      if (problemFilter !== "all") {
        const problemMatch = (r.problem || "").toLowerCase() === problemFilter.toLowerCase() || (r.symptom || "").toLowerCase() === problemFilter.toLowerCase()
        if (!problemMatch) return false
      }
      if (filter === "Violations") return isViolation(r)
      if (filter === "Safe") return !isViolation(r)
      return true
    })
  }, [records, search, filter, countryFilter, farmFilter, statusFilter, problemFilter])

  const pendingRecords = useMemo(() => records.filter(r => r.vet_status === "not reviewed"), [records])

  const violations = useMemo(() => records.filter(isViolation), [records])
  const availableFarms = useMemo(() => {
    if (countryFilter === "All") return Object.keys(summary.byFarm)
    return [...new Set(records.filter(r => r.country === countryFilter).map(r => r.farm_id))]
  }, [records, countryFilter, summary.byFarm])

  const getRecommendation = (item) => {
    if ((item.symptom || "").toLowerCase() === "fever") return "Fever: reduce dose or monitor closely"
    if ((item.symptom || "").toLowerCase() === "infection") return "Infection: continue antibiotic and recheck"
    if (Number(item.residue_value || 0) > Number(item.MRL_limit || 0)) return "Reduce dosage and request re-test"
    if (item.withdrawal_end_date && new Date().toISOString().slice(0, 10) < item.withdrawal_end_date) return "Hold product until withdrawal complete"
    return "Compliant - maintain current plan"
  }

  const trending = useMemo(() => {
    const buckets = { Safe: 0, Violation: 0 }
    records.forEach((r) => { if (isViolation(r)) buckets.Violation += 1; else buckets.Safe += 1 })
    return buckets
  }, [records])

  // Risk Analysis Metrics
  const riskAnalysis = useMemo(() => {
    const highRisk = records.filter(r => getRiskLevel(r) === "High").length
    const mediumRisk = records.filter(r => getRiskLevel(r) === "Medium").length
    const lowRisk = records.filter(r => getRiskLevel(r) === "Low").length
    const topProblems = records.reduce((acc, r) => {
      const p = r.problem || "Unknown"
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})
    const topDrugs = records.reduce((acc, r) => {
      const d = r.drug_name || "Unknown"
      acc[d] = (acc[d] || 0) + 1
      return acc
    }, {})
    return { highRisk, mediumRisk, lowRisk, topProblems: Object.entries(topProblems).sort((a, b) => b[1] - a[1]).slice(0, 5), topDrugs: Object.entries(topDrugs).sort((a, b) => b[1] - a[1]).slice(0, 5) }
  }, [records])

  // Filter records by risk
  const riskFilteredRecords = useMemo(() => {
    if (riskFilter === "All") return filteredRecords
    if (riskFilter === "High") return filteredRecords.filter(r => getRiskLevel(r) === "High")
    if (riskFilter === "Medium") return filteredRecords.filter(r => getRiskLevel(r) === "Medium")
    if (riskFilter === "Low") return filteredRecords.filter(r => getRiskLevel(r) === "Low")
    return filteredRecords
  }, [filteredRecords, riskFilter])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 md:p-5">
      <Navbar role="Veterinarian" homePath="/" onLogout={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); nav("/") }} isDark={isDark} onThemeToggle={onThemeToggle} />
      <div className="mt-4 grid gap-3 md:grid-cols-[250px_1fr]">
        <Sidebar items={sidebarItems} active={active} onSelect={setActive} />

        <div className="space-y-3">
          {loading && <Loading />}
          {message && <div className="rounded-lg bg-cyan-900/30 border border-cyan-500/50 text-cyan-200 p-2 text-xs text-center">{message}</div>}

          <div className="rounded-3xl border border-cyan-300/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-cyan-300">Veterinarian Operations</p>
                <h1 className="text-2xl font-bold">Clinical Compliance & Safety Center</h1>
                <p className="mt-1 text-slate-300">Monitor all records, focus on violations, and provide actionable guidance.</p>
              </div>
              <div className="flex gap-2 flex-wrap text-xs text-slate-200">
                <div className="rounded-full bg-blue-500/20 px-3 py-1 border border-blue-400/50">Total {summary.total}</div>
                <div className="rounded-full bg-rose-500/20 px-3 py-1 border border-rose-400/50">⚠️ Violations {summary.violations}</div>
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 border border-emerald-400/50">✔️ Safe {summary.safe}</div>
              </div>
            </div>
          </div>

          {active === "Dashboard" && (
            <>
              {/* Quick Action Panel */}
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Quick Actions</h3>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={() => document.getElementById('pending-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-4 py-2 bg-amber-600/20 border border-amber-500/50 text-amber-200 rounded-lg hover:bg-amber-600/30 transition text-sm font-medium"
                  >
                    ⏳ View Pending
                  </button>
                  <button 
                    onClick={() => document.getElementById('approved-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-200 rounded-lg hover:bg-emerald-600/30 transition text-sm font-medium"
                  >
                    ✓ View Approved
                  </button>
                  <button 
                    onClick={() => document.getElementById('rejected-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-4 py-2 bg-rose-600/20 border border-rose-500/50 text-rose-200 rounded-lg hover:bg-rose-600/30 transition text-sm font-medium"
                  >
                    ✗ View Rejected
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl bg-blue-900/15 border border-blue-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-blue-200">Records</div>
                <div className="mt-2 text-3xl font-bold text-blue-300">📊 {summary.total}</div>
                <div className="mt-1 text-blue-200">All active traceability cases.</div>
              </div>
              <div className="rounded-2xl bg-rose-900/15 border border-rose-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-rose-200">Violations</div>
                <div className="mt-2 text-3xl font-bold text-rose-300">⚠️ {summary.violations}</div>
                <div className="mt-1 text-rose-200">Priority cases requiring intervention.</div>
              </div>
              <div className="rounded-2xl bg-emerald-900/15 border border-emerald-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-emerald-200">Safe</div>
                <div className="mt-2 text-3xl font-bold text-emerald-300">✔️ {summary.safe}</div>
                <div className="mt-1 text-emerald-200">Compliant records in control.</div>
              </div>
            </div>

            {/* Status Distribution Bar */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">Status Distribution</h3>
              <div className="flex h-4 rounded-full overflow-hidden bg-slate-700">
                <div 
                  className="bg-emerald-500" 
                  style={{ width: `${statusDistribution.approvedPercent}%` }}
                  title={`Safe: ${statusDistribution.approved}`}
                ></div>
                <div 
                  className="bg-rose-500" 
                  style={{ width: `${statusDistribution.rejectedPercent}%` }}
                  title={`Violations: ${statusDistribution.rejected}`}
                ></div>
                <div 
                  className="bg-yellow-500" 
                  style={{ width: `${statusDistribution.pendingPercent}%` }}
                  title={`Pending: ${statusDistribution.pending}`}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>✔️ Safe ({Math.round(statusDistribution.approvedPercent)}%)</span>
                <span>⚠️ Violations ({Math.round(statusDistribution.rejectedPercent)}%)</span>
                <span>⏳ Pending ({Math.round(statusDistribution.pendingPercent)}%)</span>
              </div>
            </div>
</>          )}

          <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
            <section className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-slate-400">Trend Analytics</div>
                  <h2 className="text-lg font-semibold">Current Compliance Trend</h2>
                </div>
                <span className="text-xs text-slate-300">Live update</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300"><span>Safe</span><span>{trending.Safe}</span></div>
                <div className="bg-slate-700 h-2 rounded-full"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${summary.total ? (trending.Safe / summary.total) * 100 : 0}%` }} /></div>
                <div className="flex items-center justify-between text-xs text-slate-300"><span>Violations</span><span>{trending.Violation}</span></div>
                <div className="bg-slate-700 h-2 rounded-full"><div className="h-2 rounded-full bg-rose-400" style={{ width: `${summary.total ? (trending.Violation / summary.total) * 100 : 0}%` }} /></div>
              </div>
            </section>
            <section className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-slate-400">Species Distribution</div>
                  <h2 className="text-lg font-semibold">Records by Species</h2>
                </div>
                <span className="text-xs text-slate-300">Insight</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(summary.bySpecies).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-700 bg-slate-900 p-2"><div className="font-semibold">{k || "Unknown"}</div><div className="text-slate-300">{v} cases</div></div>
                ))}
              </div>
            </section>
          </div>

          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{active} Section</h2>
                <p className="text-xs text-slate-400">{active === "Records" ? "All records for veterinary review." : active === "Violations" ? "Only non-compliant cases highlighted in red." : "Dynamic recommendations for each record."}</p>
              </div>
              <div className="flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by animal, farm, drug" className="rounded-xl border border-slate-600 bg-slate-900 px-2 py-1 text-xs w-56" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-900 px-2 py-1 text-xs">
                  <option>All</option>
                  <option>Violations</option>
                  <option>Safe</option>
                </select>
              </div>
            </div>

            {active === "Records" && (
              <div className="space-y-4">
                {/* SMART ALERTS */}
                {generateAlerts.length > 0 && (
                  <div className="rounded-lg border border-rose-500/50 bg-rose-900/20 p-3">
                    <h3 className="text-sm font-semibold text-rose-300 mb-2">⚠️ Smart Alerts</h3>
                    <div className="space-y-1 text-xs">
                      {generateAlerts.slice(0, 5).map((alert, idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-1 rounded ${alert.severity === "high" ? "bg-rose-600/20 text-rose-200" : "bg-amber-600/20 text-amber-200"}`}>
                          <span>{alert.severity === "high" ? "🔴" : "⚠️"}</span>
                          <span>{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEARCH & FILTERS */}
                <div className="grid gap-2 md:grid-cols-4 bg-slate-900/50 p-3 rounded-lg">
                  <input type="text" placeholder="Search Animal ID or Farm..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                    <option value="All">All Status</option>
                    <option value="Not Reviewed">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <select value={problemFilter} onChange={(e) => setProblemFilter(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                    <option value="all">All Problems</option>
                    {uniqueProblems.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                    <option value="All">All Countries</option>
                    {Object.keys(summary.byCountry).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* PENDING SECTION */}
                <div id="pending-section">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-6 bg-amber-400 rounded"></div>
                    <h3 className="text-sm font-semibold text-amber-300">⏳ PENDING REVIEW ({pendingRecords.length})</h3>
                  </div>
                  {pendingRecords.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {pendingRecords.slice(0, 12).map((r) => (
                        <div key={r.record_id} className="rounded-lg border border-amber-500/40 bg-amber-900/15 p-3 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer" title="Review this pending record">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={selectedRecords.includes(r.record_id)} 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRecords([...selectedRecords, r.record_id])
                                  } else {
                                    setSelectedRecords(selectedRecords.filter(id => id !== r.record_id))
                                  }
                                }}
                                className="w-4 h-4 cursor-pointer"
                              />
                              <div className="font-semibold text-amber-300 text-sm">⏳ {r.record_id}</div>
                            </div>
                            <span className="text-[10px] bg-amber-600/30 text-amber-200 px-2 py-1 rounded">Pending</span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-300 mb-3">
                            <div><span className="text-slate-400">🐄 Animal:</span> {r.animal_id} ({r.animal_type})</div>
                            <div><span className="text-slate-400">🏢 Farm:</span> {r.farm_id}</div>
                            <div><span className="text-slate-400">⚕️ Problem:</span> {r.problem || r.symptom || "—"}</div>
                            <div><span className="text-slate-400">💊 Drug:</span> {r.drug_name}</div>
                            <div><span className="text-slate-400">📏 Dose:</span> {r.recommended_dose}</div>
                            <div><span className="text-slate-400">📅 Date:</span> {r.administration_date}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button onClick={() => updateRecordStatus(r.record_id, "approved", "")} className="flex-1 text-[11px] rounded px-2 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition font-semibold" title="Click to approve">✓ Approve</button>
                              <button onClick={() => updateRecordStatus(r.record_id, "rejected", "")} className="flex-1 text-[11px] rounded px-2 py-2 bg-rose-600 text-white hover:bg-rose-700 transition font-semibold" title="Click to decline">✗ Decline</button>
                            </div>
                            <button onClick={() => setAnimalHistory(r.animal_id)} className="w-full text-[11px] rounded px-2 py-1 bg-cyan-600/40 text-cyan-200 hover:bg-cyan-600/60 transition border border-cyan-500/50">📋 View History</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-4 text-center text-xs text-emerald-300">✓ All pending records have been reviewed!</div>
                  )}
                </div>

                {/* APPROVED SECTION */}
                {records.filter(r => r.vet_status === "approved").length > 0 && (
                  <div id="approved-section">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-emerald-400 rounded"></div>
                      <h3 className="text-sm font-semibold text-emerald-300">✓ APPROVED ({records.filter(r => r.vet_status === "approved").length})</h3>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {records.filter(r => r.vet_status === "approved").slice(0, 12).map((r) => (
                        <div key={r.record_id} className="rounded-lg border border-emerald-500/40 bg-emerald-900/15 p-3 hover:shadow-lg hover:scale-105 transition-all duration-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-emerald-300 text-sm">✔️ {r.record_id}</div>
                            <span className="text-[10px] bg-emerald-600/30 text-emerald-200 px-2 py-1 rounded">Approved</span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-300">
                            <div><span className="text-slate-400">🐄 Animal:</span> {r.animal_id} ({r.animal_type})</div>
                            <div><span className="text-slate-400">🏢 Farm:</span> {r.farm_id}</div>
                            <div><span className="text-slate-400">💊 Drug:</span> {r.drug_name}</div>
                            <div><span className="text-slate-400">📅 Date:</span> {r.administration_date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* REJECTED SECTION */}
                {records.filter(r => r.vet_status === "rejected").length > 0 && (
                  <div id="rejected-section">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-rose-400 rounded"></div>
                      <h3 className="text-sm font-semibold text-rose-300">✗ DECLINED ({records.filter(r => r.vet_status === "rejected").length})</h3>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {records.filter(r => r.vet_status === "rejected").slice(0, 12).map((r) => (
                        <div key={r.record_id} className="rounded-lg border border-rose-500/40 bg-rose-900/15 p-3 hover:shadow-lg hover:scale-105 transition-all duration-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-rose-300 text-sm">⚠️ {r.record_id}</div>
                            <span className="text-[10px] bg-rose-600/30 text-rose-200 px-2 py-1 rounded">Declined</span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-300">
                            <div><span className="text-slate-400">🐄 Animal:</span> {r.animal_id} ({r.animal_type})</div>
                            <div><span className="text-slate-400">🏢 Farm:</span> {r.farm_id}</div>
                            <div><span className="text-slate-400">💊 Drug:</span> {r.drug_name}</div>
                            <div><span className="text-slate-400">📅 Date:</span> {r.administration_date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {active === "Violations" && (
              <div className="mt-3 space-y-2">
                {records.filter(isViolation).map((r) => (
                  <div key={`vio-${r.record_id}`} className="rounded-xl border border-rose-500/50 bg-rose-900/25 p-2 text-xs">
                    <div className="flex justify-between"><span className="font-semibold">{r.record_id}</span><span className="text-rose-300">Violation</span></div>
                    <div>{r.animal_id} • {r.drug_name} • Residue {r.residue_value}/{r.MRL_limit}</div>
                    <div className="text-amber-200">Withdrawal until: {r.withdrawal_end_date || "N/A"}</div>
                  </div>
                ))}
                {!records.filter(isViolation).length && <div className="rounded-xl border border-emerald-400/40 bg-emerald-900/10 p-2 text-xs text-emerald-200">No violations currently.</div>}
              </div>
            )}

            {active === "Recommendations" && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {filteredRecords.slice(0, 8).map((r) => (
                  <div key={`rec-${r.record_id}`} className="rounded-xl border border-slate-600 bg-slate-900 p-2 text-xs">
                    <div className="flex justify-between items-center"><span className="font-semibold">{r.record_id}</span><span className="text-[11px] text-cyan-300">{isViolation(r) ? "Review" : "Approved"}</span></div>
                    <div className="mt-1">Drug: {r.drug_name} • {r.animal_id}</div>
                    <div className="mt-1 text-emerald-300">{getRecommendation(r)}</div>
                  </div>
                ))}
              </div>
            )}

            {active === "Risk Analysis" && (
              <div className="space-y-3">
                {/* RISK LEVEL SUMMARY */}
                <div className="grid gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl bg-rose-900/20 border border-rose-500/40 p-3 shadow-lg">
                    <div className="text-xs uppercase text-rose-400 font-semibold">🔴 High Risk</div>
                    <div className="mt-2 text-3xl font-bold text-rose-300">{riskAnalysis.highRisk}</div>
                    <div className="text-xs text-slate-400 mt-1">Immediate intervention needed</div>
                  </div>
                  <div className="rounded-2xl bg-amber-900/20 border border-amber-500/40 p-3 shadow-lg">
                    <div className="text-xs uppercase text-amber-400 font-semibold">🟡 Medium Risk</div>
                    <div className="mt-2 text-3xl font-bold text-amber-300">{riskAnalysis.mediumRisk}</div>
                    <div className="text-xs text-slate-400 mt-1">Requires attention</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-900/20 border border-emerald-500/40 p-3 shadow-lg">
                    <div className="text-xs uppercase text-emerald-400 font-semibold">🟢 Low Risk</div>
                    <div className="mt-2 text-3xl font-bold text-emerald-300">{riskAnalysis.lowRisk}</div>
                    <div className="text-xs text-slate-400 mt-1">Under control</div>
                  </div>
                  <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                    <div className="text-xs uppercase text-slate-400 font-semibold">📊 Total</div>
                    <div className="mt-2 text-3xl font-bold text-cyan-300">{summary.total}</div>
                    <div className="text-xs text-slate-400 mt-1">All records</div>
                  </div>
                </div>

                {/* RISK FILTER */}
                <div className="rounded-lg bg-slate-900/50 p-3 flex gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 self-center">Filter by Risk:</span>
                  {["All", "High", "Medium", "Low"].map(risk => (
                    <button key={risk} onClick={() => setRiskFilter(risk)} className={`text-xs px-3 py-1 rounded transition ${riskFilter === risk ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                      {risk}
                    </button>
                  ))}
                </div>

                {/* TOP PROBLEMS & DRUGS */}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                    <h3 className="text-sm font-semibold text-cyan-300 mb-3">🔝 Top Problems</h3>
                    <div className="space-y-2">
                      {riskAnalysis.topProblems.map(([problem, count]) => (
                        <div key={problem} className="flex justify-between items-center bg-slate-900 rounded p-2 text-xs">
                          <span className="text-slate-300">{problem}</span>
                          <span className="text-amber-400 font-semibold">{count} cases</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                    <h3 className="text-sm font-semibold text-cyan-300 mb-3">💊 Most Used Drugs</h3>
                    <div className="space-y-2">
                      {riskAnalysis.topDrugs.map(([drug, count]) => (
                        <div key={drug} className="flex justify-between items-center bg-slate-900 rounded p-2 text-xs">
                          <span className="text-slate-300">{drug}</span>
                          <span className="text-blue-400 font-semibold">{count} uses</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* HIGH RISK RECORDS */}
                <div className="rounded-2xl bg-rose-900/20 border border-rose-500/30 p-3 shadow-lg">
                  <h3 className="text-sm font-semibold text-rose-300 mb-3">⚠️ High Risk Records</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {riskFilteredRecords.filter(r => getRiskLevel(r) === "High").length > 0 ? (
                      riskFilteredRecords.filter(r => getRiskLevel(r) === "High").slice(0, 10).map(r => (
                        <div key={r.record_id} className="rounded border border-rose-500/40 bg-slate-900 p-2 text-xs flex justify-between items-center hover:bg-slate-800 transition cursor-pointer" onClick={() => setSelectedRecord(r)}>
                          <div>
                            <span className="font-semibold text-rose-300">{r.record_id}</span>
                            <div className="text-slate-400">{r.animal_id} • {r.drug_name}</div>
                          </div>
                          <span className="px-2 py-1 rounded bg-rose-600/30 text-rose-300 font-semibold">HIGH</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs text-center py-3">No high risk records</div>
                    )}
                  </div>
                </div>
              </div>
            )}


          </div>

          {/* Recent Review Section */}
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4 shadow-lg mt-3">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4">Recent Vet Actions</h3>
            <div className="space-y-3">
              {/* Recent Approved */}
              {records.filter(r => r.vet_status === "approved").slice(0, 5).map((r) => (
                <div key={`recent-approved-${r.record_id}`} className="flex items-center justify-between bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">✔️</span>
                    <div>
                      <div className="text-sm font-semibold text-emerald-300">{r.record_id}</div>
                      <div className="text-xs text-slate-400">🐄 {r.animal_id} • ⚕️ {r.problem || r.symptom || "N/A"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    <div className="text-emerald-200">Approved</div>
                    <div>{new Date(r.administration_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {/* Recent Rejected */}
              {records.filter(r => r.vet_status === "rejected").slice(0, 5).map((r) => (
                <div key={`recent-rejected-${r.record_id}`} className="flex items-center justify-between bg-rose-900/10 border border-rose-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400">⚠️</span>
                    <div>
                      <div className="text-sm font-semibold text-rose-300">{r.record_id}</div>
                      <div className="text-xs text-slate-400">🐄 {r.animal_id} • ⚕️ {r.problem || r.symptom || "N/A"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    <div className="text-rose-200">Rejected</div>
                    <div>{new Date(r.administration_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected").length === 0 && (
                <div className="text-center text-slate-400 text-sm py-4">No recent actions</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Record Details: {selectedRecord.record_id}</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-xs px-2 py-1 bg-slate-700 rounded">Close</button>
            </div>
            <div className="grid gap-2 text-xs mb-3 max-h-[200px] overflow-y-auto">
              {Object.entries(selectedRecord).filter(([key]) => !["vet_remarks", "vet_notes"].includes(key)).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-slate-700 pb-1"><span className="text-slate-400">{key}</span><span className="text-white">{String(value)}</span></div>
              ))}
            </div>
            <div className="space-y-2 mb-3">
              <label className="text-xs text-slate-400">Vet Remarks</label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add professional remarks..." className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-white" rows="3" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { updateRecordStatus(selectedRecord.record_id, "approved", suggestionText); setSelectedRecord(null); setSuggestionText("") }} className="rounded bg-emerald-600 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-700">✓ Approve</button>
              <button onClick={() => { updateRecordStatus(selectedRecord.record_id, "rejected", suggestionText); setSelectedRecord(null); setSuggestionText("") }} className="rounded bg-rose-600 px-2 py-2 text-xs font-semibold text-white hover:bg-rose-700">✗ Decline</button>
              <input value={suggestionText} onChange={(e) => setSuggestionText(e.target.value)} placeholder="Notes" className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
            </div>
          </div>
        </div>
      )}

      {/* ANIMAL HISTORY MODAL */}
      {animalHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Treatment History: {animalHistory}</h3>
              <button onClick={() => setAnimalHistory(null)} className="text-xs px-2 py-1 bg-slate-700 rounded">Close</button>
            </div>
            <div className="space-y-2">
              {getAnimalHistory(animalHistory).length > 0 ? (
                getAnimalHistory(animalHistory).map((r) => (
                  <div key={r.record_id} className={`rounded border p-2 text-xs ${r.status === "safe" ? "border-emerald-500/30 bg-emerald-900/10" : r.status === "not safe" ? "border-rose-500/30 bg-rose-900/10" : "border-amber-500/30 bg-amber-900/10"}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{r.record_id}</span>
                      <span className={`text-[10px] px-2 py-1 rounded ${r.status === "safe" ? "bg-emerald-600/30 text-emerald-200" : r.status === "not safe" ? "bg-rose-600/30 text-rose-200" : "bg-amber-600/30 text-amber-200"}`}>{r.status || "pending"}</span>
                    </div>
                    <div><span className="text-slate-400">Drug:</span> {r.drug_name}</div>
                    <div><span className="text-slate-400">Problem:</span> {r.problem || r.symptom}</div>
                    <div><span className="text-slate-400">Date:</span> {r.administration_date}</div>
                    {r.vet_notes && <div className="text-slate-300 mt-1 italic border-t border-slate-700 pt-1">Note: {r.vet_notes}</div>}
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-300 text-xs">No treatment history for this animal</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VetDashboard
