import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Skeleton from "../components/Skeleton"
import Toast from "../components/Toast"
import Button from "../components/Button"

const RAW_API_URL = import.meta.env.VITE_API_URL || ""
const API_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")
  : "http://localhost:5000"

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
  const [pendingAction, setPendingAction] = useState(null)
  const [consultRequired, setConsultRequired] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState([])
  const [riskFilter, setRiskFilter] = useState("All")

  const sortByDateDesc = (items) => (items || []).slice().sort((a, b) => {
    const da = new Date(a.administration_date || a.date || 0)
    const db = new Date(b.administration_date || b.date || 0)
    return db - da
  })

  const loadRecords = async (bg = false) => {
    if (!bg) setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/records`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const sorted = sortByDateDesc(data)
        
        // Auto-categorize & persist logic (one-time check for "Pending" records)
        if (!bg) {
          const autoUpdates = []
          sorted.forEach(r => {
            const currentStatus = (r.status || "").toLowerCase()
            const currentVetStatus = (r.vet_status || "").toLowerCase()
            
            if (currentStatus === "pending" || currentVetStatus === "not reviewed") {
              const violation = isViolation(r)
              const safe = (r.mrl_status || "").toLowerCase() === "safe" && (r.compliance_status || "").toLowerCase() === "compliant"
              
              if (violation) {
                autoUpdates.push({ record_id: r.record_id, status: "Rejected", vet_notes: "System Auto-Rejected: Violation detected." })
              } else if (safe) {
                autoUpdates.push({ record_id: r.record_id, status: "Approved", vet_notes: "System Auto-Approved: High compliance and safe residue levels." })
              }
            }
          })

          if (autoUpdates.length > 0) {
            console.log(`Auto-categorizing ${autoUpdates.length} records...`)
            fetch(`${API_URL}/api/records-bulk`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: autoUpdates })
            }).then(() => {
                setMessage(`${autoUpdates.length} records auto-processed and saved to database`)
                loadRecords(true) // Reload to get updated data
            })
          }
        }

        setRecords((prev) => {
          try {
            if (JSON.stringify(prev) === JSON.stringify(sorted)) return prev
          } catch(e) {}
          return sorted
        })
      } else {
        console.error("Invalid data format", data)
        setRecords([])
      }
    } catch (err) {
      console.error("Error loading records:", err)
      setRecords([])
      setMessage("Error loading records - please refresh")
    } finally {
      if (!bg) setLoading(false)
    }
  }

  const [isCritical, setIsCritical] = useState(false)

  const updateRecordStatus = async (recordId, action) => {
    try {
      setLoading(true)
      const isApproved = action === "approved"
      const updatePayload = {
        status: isApproved ? "Approved" : "Rejected",
        vet_notes: remarks || "",
        is_critical: isCritical,
        ...(isApproved && { digital_signature: `VET-SIG-${Math.random().toString(36).substring(2,8).toUpperCase()}-${Date.now().toString(16).toUpperCase()}` }),
        ...(!isApproved && (consultRequired || isCritical) && { consult_required: true })
      }
      const res = await fetch(`${API_URL}/api/records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      console.log("Record updated:", updated)
      await loadRecords()
      setSelectedRecord(null)
      setPendingAction(null)
      setRemarks("")
      setConsultRequired(false)
      setIsCritical(false)
      setMessage(action === "approved" ? "Record approved & electronically signed" : "Record declined")
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
      const interval = setInterval(() => loadRecords(true), 3000)
      return () => clearInterval(interval)
    }, [])
  
    // Auto-scroll to top when section changes
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [active])
  
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
          const vStatus = (r.vet_status || "").toLowerCase();
          const rStatus = (r.status || "").toLowerCase();
          if (statusFilter === "Approved") {
            if (vStatus !== "approved" && rStatus !== "approved") return false;
          } else if (statusFilter === "Rejected") {
            if (vStatus !== "rejected" && rStatus !== "rejected") return false;
          } else if (statusFilter === "Not Reviewed" || statusFilter === "Pending") {
            if (vStatus !== "not reviewed" && rStatus !== "pending") return false;
          }
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
  
    const pendingRecords = useMemo(() => records.filter(r => (r.vet_status || "").toLowerCase() === "not reviewed" || (r.status || "").toLowerCase() === "pending"), [records])
  
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
      <div className="dashboard-ambient-vet min-h-screen text-slate-100 flex font-sans overflow-x-hidden">
        <Sidebar items={sidebarItems} active={active} onSelect={setActive} />
        
        <main className="flex-1 min-h-screen md:ml-64 p-4 md:p-8 lg:p-10 space-y-8 relative z-10 transition-all duration-300">
          <Navbar role="Veterinarian" homePath="/" onLogout={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); nav("/") }} isDark={isDark} onThemeToggle={onThemeToggle} />
          
          {message && <Toast message={message} type={message.includes("Error") ? "error" : "success"} onClose={() => setMessage("")} />}
          
          <div className="max-w-[1400px] mx-auto space-y-8">
            <div className="card-glass rounded-[2rem] p-8 md:p-10 relative overflow-hidden shrink-0 shadow-2xl border border-white/5">
               <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[100%] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none animate-pulse" />
              <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                <div>
                  <p className="text-xs uppercase tracking-widest text-rose-400 font-bold mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Clinical Monitoring Terminal
                  </p>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Veterinary Authorization</h1>
                  <p className="text-slate-400 text-sm max-w-md">Review high-precision medical data and authorize antimicrobial usage guidelines.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-3 self-start">
                  <div className="min-w-[120px] rounded-2xl bg-slate-800/50 border border-white/5 p-4 backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold italic mb-1">Database</div>
                    <div className="text-2xl font-black text-white">{summary.total}</div>
                  </div>
                  <div className="min-w-[120px] rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-widest text-rose-400 font-bold italic mb-1">Violations</div>
                    <div className="text-2xl font-black text-rose-300">{summary.violations}</div>
                  </div>
                </div>
              </div>
            </div>
  
            {loading && records.length === 0 ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <Skeleton className="lg:col-span-2 h-[500px]" />
                  <Skeleton className="h-[500px]" />
                </div>
              </div>
            ) : (
            <div className="space-y-8 pb-32">
              {active === "Dashboard" && (
                <>
                  {/* FEATURED PENDING CASE */}
                  {pendingRecords.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-right duration-700">
                      <div className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full -mr-20 -mt-20 animate-pulse pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/30 animate-bounce">Latest Pending Request</span>
                            <span className="text-amber-400/60 text-xs font-mono uppercase tracking-tighter">Priority High</span>
                          </div>
                          
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="space-y-4">
                              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none italic uppercase">
                                Case: {pendingRecords[0].record_id}
                                <span className="block text-2xl md:text-3xl text-amber-300 not-italic normal-case font-bold mt-2">Manual review required for specimen {pendingRecords[0].animal_id}</span>
                              </h2>
                              <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-400">
                                <span className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-2xl border border-white/5 shadow-inner">
                                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                  {pendingRecords[0].animal_type || "Bovine"}
                                </span>
                                <span className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-2xl border border-white/5 shadow-inner">
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                  {pendingRecords[0].drug_name}
                                </span>
                                <span className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-2xl border border-white/5 shadow-inner">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  {pendingRecords[0].country}
                                </span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => { setSelectedRecord(pendingRecords[0]); setPendingAction("approved") }}
                              className="px-10 py-5 bg-white text-slate-950 rounded-3xl font-black text-lg shadow-2xl shadow-white/10 hover:scale-[1.05] hover:shadow-white/20 transition-all active:scale-95 group/btn overflow-hidden relative"
                            >
                              <span className="relative z-10 uppercase tracking-widest">Decide Case Now</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-200 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1. Quick Action Panel */}
                  <div className="card-glass hover:shadow-cyan-500/10 rounded-[1.5rem] p-5 shadow-xl transition-all duration-300">
                    <h3 className="text-sm font-semibold text-cyan-300 mb-3">Quick Actions</h3>
                    <div className="flex gap-3 flex-wrap">
                      <button 
                        onClick={() => {
                          setActive("Records")
                          setStatusFilter("Not Reviewed")
                          setFilter("All")
                          setCountryFilter("All")
                          setFarmFilter("All")
                          setSearch("")
                          setTimeout(() => document.getElementById('pending-section')?.scrollIntoView({ behavior: 'smooth' }), 100)
                        }}
                        className="px-5 py-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] hover:shadow-amber-500/30 transition font-semibold text-sm"
                      >
                        ⏳ View Pending
                      </button>
                      <button 
                        onClick={() => {
                          setActive("Records")
                          setStatusFilter("Approved")
                          setFilter("All")
                          setCountryFilter("All")
                          setFarmFilter("All")
                          setSearch("")
                          setTimeout(() => document.getElementById('approved-section')?.scrollIntoView({ behavior: 'smooth' }), 100)
                        }}
                        className="px-5 py-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] hover:shadow-emerald-500/30 transition font-semibold text-sm"
                      >
                        ✓ View Approved
                      </button>
                      <button 
                        onClick={() => {
                          setActive("Records")
                          setStatusFilter("Rejected")
                          setFilter("All")
                          setCountryFilter("All")
                          setFarmFilter("All")
                          setSearch("")
                          setTimeout(() => document.getElementById('rejected-section')?.scrollIntoView({ behavior: 'smooth' }), 100)
                        }}
                        className="px-5 py-3 bg-gradient-to-r from-rose-400 via-fuchsia-400 to-purple-500 text-slate-950 rounded-2xl shadow-lg shadow-rose-500/20 hover:scale-[1.02] hover:shadow-rose-500/30 transition font-semibold text-sm"
                      >
                        ✗ View Rejected
                      </button>
                    </div>
                  </div>
  
                  {/* 2. Status Distribution */}
                  <div className="card-glass hover:shadow-cyan-500/10 rounded-[1.5rem] p-5 shadow-xl transition-all duration-300">
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
  
                  {/* 3. Trends and Species */}
                  <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
                    <section className="card-glass hover:shadow-cyan-500/10 rounded-2xl p-4 transition-all duration-300">
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
                    <section className="card-glass hover:shadow-cyan-500/10 rounded-2xl p-4 transition-all duration-300">
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
                </>
              )}
  
              {/* SECTIONS HEADERS (NON-DASHBOARD) */}
              {active !== "Dashboard" && (
                <div className="card-glass hover:shadow-cyan-500/10 rounded-3xl p-6 mb-4 animate-in slide-in-from-top duration-500">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent underline decoration-cyan-500/50 decoration-2 underline-offset-8 uppercase tracking-widest">{active} Section</h2>
                      <p className="text-xs text-slate-400 mt-2">{active === "Records" ? "Full clinical monitoring registry." : active === "Violations" ? "Urgent residue safety alerts." : active === "Recommendations" ? "Expert diagnostic protocols." : "Genetic and systematic risk vectors."}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-800/80 p-2 rounded-2xl border border-white/5">
                      <div className="relative">
                        <input 
                          value={search} 
                          onChange={(e) => setSearch(e.target.value)} 
                          placeholder="Filter registry..." 
                          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs w-64 focus:ring-2 focus:ring-cyan-500/40 outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
  
              {active === "Records" && (
                <div className="space-y-4">
                  {/* 1. Featured Pending Case (Top of Records) */}
                  {pendingRecords.length > 0 && statusFilter !== "Approved" && statusFilter !== "Rejected" && (
                    <div className="card-glass p-6 rounded-[2rem] border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent shadow-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-6 animate-in zoom-in duration-500">
                       <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-[10px] uppercase tracking-widest text-amber-500 font-black">Immediate Attention Required</span>
                          </div>
                          <h3 className="text-2xl font-black text-white italic">Case {pendingRecords[0].record_id} — {pendingRecords[0].animal_id}</h3>
                          <p className="text-xs text-slate-400 font-medium max-w-lg">This specimen requires manual authorization for {pendingRecords[0].drug_name} administration. All safety parameters are currently being evaluated.</p>
                       </div>
                       <button 
                         onClick={() => { setSelectedRecord(pendingRecords[0]); setPendingAction("approved") }}
                         className="px-8 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                       >
                         AUTHORIZE NOW
                       </button>
                    </div>
                  )}

                  {/* 2. Search and Filter Bar */}
                  <div className="grid gap-2 md:grid-cols-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div className="relative col-span-2">
                      <input 
                        type="text" 
                        placeholder="Search Animal ID, Drug, or Farm..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner" 
                      />
                      <svg className="absolute right-4 top-3 text-slate-500 w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)} 
                      className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-xs text-white cursor-pointer hover:border-slate-500 transition-all font-semibold"
                    >
                      <option value="All">All Live Status</option>
                      <option value="Not Reviewed">⏳ Pending Cases</option>
                      <option value="Approved">✔️ Approved Clear</option>
                      <option value="Rejected">❌ Rejected / Blocked</option>
                    </select>
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 rounded-xl border border-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                       Total: {filteredRecords.length} Items
                    </div>
                  </div>
                  
                  {/* 3. Record Grid */}
                  <div id="pending-section" className="space-y-6">
                     <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{statusFilter === "All" ? "Full Clinical Registry" : `${statusFilter} Cases`}</h3>
                        <div className="h-px flex-1 mx-6 bg-gradient-to-r from-white/5 via-white/5 to-transparent" />
                     </div>

                     <div className="grid gap-4 lg:grid-cols-3">
                       {filteredRecords.map(r => (
                          <div key={r.record_id} className={`card-glass p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${r.vet_status === 'approved' ? 'border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5' : r.vet_status === 'rejected' ? 'border-rose-500/20 hover:border-rose-500/40 shadow-rose-500/5' : 'border-amber-500/10 hover:border-amber-500/30 shadow-amber-500/5 hover:shadow-xl'}`}>
                             <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                  <span className="font-black text-white text-sm tracking-tighter block">{r.record_id}</span>
                                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">{r.date || r.administration_date}</span>
                                </div>
                                <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-black uppercase tracking-widest transition-all ${
                                  (r.vet_status || r.status).toLowerCase() === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/10' : 
                                  (r.vet_status || r.status).toLowerCase() === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/10' : 
                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                  {r.vet_status || r.status}
                                </span>
                             </div>
                             
                             <div className="space-y-3 mb-6">
                                <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5 space-y-2">
                                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex items-center justify-between">Animal ID <span className="text-white">#{r.animal_id}</span></div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex items-center justify-between">Treatment <span className="text-cyan-400">{r.drug_name}</span></div>
                                </div>
                                
                                {r.vet_notes && (
                                  <div className="text-[10px] text-slate-400 italic bg-white/5 p-2 rounded-lg border-l-2 border-slate-500 leading-relaxed font-medium">
                                    “{r.vet_notes}”
                                  </div>
                                )}
                             </div>

                             <div className="flex gap-2">
                                {((r.vet_status || r.status).toLowerCase() === 'pending' || (r.vet_status || r.status).toLowerCase() === 'not reviewed') ? (
                                  <button 
                                    onClick={() => { setSelectedRecord(r); setPendingAction("approved"); setRemarks("") }} 
                                    className="flex-1 bg-white text-slate-950 hover:bg-slate-200 px-3 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg active:scale-95"
                                  >
                                    Review Case
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => { setSelectedRecord(r); setRemarks(r.vet_notes || "") }} 
                                    className="flex-1 bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700 hover:text-white px-3 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all"
                                  >
                                    View Details
                                  </button>
                                )}
                             </div>
                          </div>
                       ))}
                     </div>
                     {filteredRecords.length === 0 && <div className="text-center py-20 text-slate-500 italic border-2 border-dashed border-white/5 rounded-[2rem] text-sm font-medium">No records matching the current vector filters.</div>}
                  </div>
                </div>
              )}
  
              {active === "Violations" && (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {records.filter(isViolation).map((r) => (
                      <div key={`vio-${r.record_id}`} className="rounded-xl border border-rose-500/30 bg-rose-900/10 p-4 animate-in slide-in-from-right duration-500">
                        <div className="flex justify-between font-black text-rose-300 tracking-widest text-xs mb-2">
                           <span>CASE ID: {r.record_id}</span>
                           <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[9px] animate-pulse">CRITICAL VIOLATION</span>
                        </div>
                        <div className="text-xs text-slate-300 font-medium">Record indicates {r.drug_name} residue at {r.residue_value}mg/kg. Legal MRL: {r.MRL_limit}mg/kg.</div>
                      </div>
                    ))}
                    {records.filter(isViolation).length === 0 && <div className="text-center py-10 text-slate-500 text-xs italic">System clean. No active violations detected.</div>}
                  </div>
                </div>
              )}
  
              {active === "Recommendations" && (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredRecords.map((r) => (
                    <div key={`rec-${r.record_id}`} className="card-glass p-5 rounded-[1.5rem] border border-cyan-500/20 hover:border-cyan-500/50 transition-all group">
                      <div className="flex justify-between items-center mb-3">
                         <span className="font-black text-cyan-300 text-sm tracking-tighter">{r.record_id}</span>
                         <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-cyan-400 transition-colors">Safety Protocol</span>
                      </div>
                      <div className="text-xs text-slate-200 leading-relaxed font-medium">
                         {getRecommendation(r)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
  
              {active === "Risk Analysis" && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="rounded-[1.5rem] bg-rose-500/10 border border-rose-500/30 p-5">
                       <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Primary Vectors</div>
                       <div className="text-3xl font-black text-rose-300">{riskAnalysis.highRisk}</div>
                       <div className="text-[10px] text-rose-500/60 font-bold mt-1 uppercase">High Risk Alerts</div>
                    </div>
                    <div className="rounded-[1.5rem] bg-amber-500/10 border border-amber-500/30 p-5">
                       <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Secondary Vectors</div>
                       <div className="text-3xl font-black text-amber-300">{riskAnalysis.mediumRisk}</div>
                       <div className="text-[10px] text-amber-500/60 font-bold mt-1 uppercase">Medium Risk Alerts</div>
                    </div>
                    <div className="rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/30 p-5">
                       <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Compliance Vectors</div>
                       <div className="text-3xl font-black text-emerald-300">{riskAnalysis.lowRisk}</div>
                       <div className="text-[10px] text-emerald-500/60 font-bold mt-1 uppercase">Low Risk Observations</div>
                    </div>
                  </div>
  
                  <div className="card-glass p-6 rounded-[2rem]">
                     <h3 className="text-xs font-black text-cyan-300 uppercase tracking-[0.2em] mb-6">Distribution Matrix</h3>
                     <div className="space-y-4">
                        {riskAnalysis.topProblems.map(([problem, count]) => (
                          <div key={problem}>
                             <div className="flex justify-between text-[11px] mb-1.5 font-bold uppercase tracking-tight">
                                <span>{problem}</span>
                                <span className="text-cyan-400">{count} Events</span>
                             </div>
                             <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(count/summary.total)*100}%` }}></div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </main>
  
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-slate-900 border border-white/10 p-8 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => setSelectedRecord(null)} 
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all hover:rotate-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black mb-1">Clinical Review</p>
                <h3 className="text-2xl font-black text-white">Record ID: {selectedRecord.record_id}</h3>
              </div>
  
              <div className="grid grid-cols-2 gap-3 text-xs mb-6 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                {Object.entries(selectedRecord).filter(([key]) => !["vet_remarks", "vet_notes", "digital_signature", "consult_required"].includes(key)).map(([key, value]) => (
                  <div key={key} className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">{key.replace(/_/g, ' ')}</span>
                    <span className="text-slate-200 font-medium truncate" title={String(value)}>{String(value || "—")}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Expert Recommendations</label>
                  <span className="text-[10px] text-cyan-500 font-mono">Quick-Build Notes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Dosage Too High", "Exceeds MRL Limits", "Wrong Medication", "Incorrect Animal Profile"].map(reply => (
                    <button key={reply} onClick={() => setRemarks(prev => prev ? prev + ", " + reply : reply)} className="text-[10px] bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-all active:scale-95">
                      + {reply}
                    </button>
                  ))}
                </div>
                <textarea 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Enter detailed clinical observations..." 
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all" 
                  rows="3" 
                />
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group bg-slate-800/30 p-3 rounded-xl border border-white/5 hover:bg-slate-800/50 transition-all">
                    <input 
                      type="checkbox" 
                      checked={consultRequired} 
                      onChange={e => setConsultRequired(e.target.checked)} 
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500 transition-all" 
                    />
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors font-medium uppercase tracking-tight">Require mandatory farmer consult</span>
                  </label>
  
                  <label className="flex items-center gap-3 cursor-pointer group bg-rose-500/5 p-3 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 transition-all">
                    <input 
                      type="checkbox" 
                      checked={isCritical} 
                      onChange={e => setIsCritical(e.target.checked)} 
                      className="w-4 h-4 rounded border-rose-600 bg-rose-700 text-rose-500 focus:ring-rose-500 transition-all" 
                    />
                    <span className="text-[11px] text-rose-400 group-hover:text-rose-300 transition-colors font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      Flag as High-Risk Critical Alert
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => updateRecordStatus(selectedRecord.record_id, "approved")} 
                  className="flex-1 rounded-2xl bg-emerald-500 text-slate-950 px-4 py-4 text-xs font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  APPROVE & E-SIGN
                </button>
                <button 
                  onClick={() => updateRecordStatus(selectedRecord.record_id, "rejected")} 
                  className="flex-1 rounded-2xl bg-slate-800 border border-rose-500/30 text-rose-400 px-4 py-4 text-xs font-black hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  DECLINE
                </button>
              </div>
            </div>
          </div>
        )}
  
        {animalHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-slate-900 border border-white/10 p-8 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => setAnimalHistory(null)} 
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all hover:rotate-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-rose-500 font-black mb-1">Safety History</p>
                <h3 className="text-2xl font-black text-white">Animal: {animalHistory}</h3>
              </div>
  
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {getAnimalHistory(animalHistory).length > 0 ? (
                  getAnimalHistory(animalHistory).map((r) => (
                  <div key={r.record_id} className={`rounded-2xl border p-5 transition-all hover:bg-slate-800/40 relative group ${r.status === "Approved" || r.status === "safe" ? "border-emerald-500/20 bg-emerald-500/5" : r.status === "Rejected" || r.status === "not safe" ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/5"}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-black text-white text-sm tracking-tight">{r.record_id}</span>
                      <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full border shadow-sm ${r.status === "Approved" || r.status === "safe" ? "border-emerald-500/30 text-emerald-400 bg-emerald-400/5" : r.status === "Rejected" || r.status === "not safe" ? "border-rose-500/30 text-rose-400 bg-rose-400/5" : "border-slate-500/30 text-slate-400"}`}>{r.status || "pending"}</span>
                    </div>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                        <div className="flex flex-col"><span className="text-slate-500 uppercase text-[8px] font-bold mb-0.5">Drug</span> <span className="text-slate-200 font-medium">{r.drug_name}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 uppercase text-[8px] font-bold mb-0.5">Date</span> <span className="text-slate-200 font-medium">{r.administration_date}</span></div>
                        <div className="col-span-2 flex flex-col"><span className="text-slate-500 uppercase text-[8px] font-bold mb-0.5">Primary Clinical Sign</span> <span className="text-slate-200 font-medium">{r.problem || r.symptom}</span></div>
                      </div>
                      {r.vet_notes && <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-400 italic leading-relaxed">“{r.vet_notes}”</div>}
                    </div>
                  ))
                ) : (
                <div className="text-center text-slate-500 text-sm py-12 italic border-2 border-dashed border-white/5 rounded-3xl font-medium">No recorded secondary history for this specimen.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  export default VetDashboard
