import { useEffect, useMemo, useState, memo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
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

const VetDashboard = memo(({ auth, onLogout }) => {
  const { isDark, toggleTheme } = useTheme()
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
  const [prescribedDrug, setPrescribedDrug] = useState("")
  const [prescribedDose, setPrescribedDose] = useState("")
  const [withdrawalDays, setWithdrawalDays] = useState(0)
  const [isCritical, setIsCritical] = useState(false)
  
  const [mrlQuery, setMrlQuery] = useState("")
  const [mrlResult, setMrlResult] = useState(null)

  const MRL_DATABASE = [
    { drug: "Penicillin", limit: "0.05", unit: "mg/kg", withdrawal: 14, notes: "Commonly used for respiratory infections. Monitor closely in dairy cattle." },
    { drug: "Tetracycline", limit: "0.10", unit: "mg/kg", withdrawal: 28, notes: "Broad-spectrum. High resistance risk if overused." },
    { drug: "Ceftiofur", limit: "1.00", unit: "mg/kg", withdrawal: 4, notes: "Third-generation cephalosporin. Strict usage guidelines apply." },
    { drug: "Oxytetracycline", limit: "0.20", unit: "mg/kg", withdrawal: 21, notes: "Long-acting formulations may require extended withdrawal periods." },
    { drug: "Amoxicillin", limit: "0.05", unit: "mg/kg", withdrawal: 15, notes: "Effective for soft tissue infections. Standard clearance rate." }
  ]

  const handleMRLSearch = () => {
    if (!mrlQuery) { setMrlResult(null); return; }
    const found = MRL_DATABASE.find(d => d.drug.toLowerCase() === mrlQuery.toLowerCase().trim() || d.drug.toLowerCase().includes(mrlQuery.toLowerCase().trim()));
    setMrlResult(found || { notFound: true, query: mrlQuery })
  }

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
        
        setRecords(sorted)
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

  const updateRecordStatus = async (recordId, action) => {
    try {
      setLoading(true)
      const isApproved = action === "approved"
      
      let safeDate = null
      if (isApproved && withdrawalDays > 0) {
        const adminDate = selectedRecord.administration_date || selectedRecord.date || new Date().toISOString()
        const dateObj = new Date(adminDate)
        dateObj.setDate(dateObj.getDate() + parseInt(withdrawalDays))
        safeDate = dateObj.toISOString().split('T')[0]
      }

      const updatePayload = {
        status: isApproved ? "Approved" : "Rejected",
        vet_notes: remarks || "",
        is_critical: isCritical,
        ...(prescribedDrug && { drug_name: prescribedDrug }),
        ...(prescribedDose && { recommended_dose: prescribedDose }),
        ...(isApproved && withdrawalDays > 0 && { withdrawal_days: parseInt(withdrawalDays), safe_date: safeDate }),
        ...(isApproved && { digital_signature: `VET-SIG-${Math.random().toString(36).substring(2,8).toUpperCase()}-${Date.now().toString(16).toUpperCase()}` }),
        ...((consultRequired || isCritical) && { consult_required: true })
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
      setPrescribedDrug("")
      setPrescribedDose("")
      setWithdrawalDays(0)
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

  useEffect(() => {
    const handleAISync = (e) => {
      const { type, caseId, notes, suggestedDrug } = e.detail;
      if (type === 'vet_sync') {
        const targetId = caseId?.toUpperCase();
        
        // Find existing record match
        const found = records.find(r => 
          (r.record_id && r.record_id.toUpperCase() === targetId) || 
          (r.animal_id && r.animal_id.toUpperCase() === targetId)
        );

        if (found) {
          setSelectedRecord(found);
          if (notes) setRemarks(prev => (prev ? `${prev}\n${notes}` : notes));
          if (suggestedDrug) setPrescribedDrug(suggestedDrug);
          setMessage(`AI synchronized with Case ${targetId}`);
        } else {
          setMessage(`AI suggested Case ${targetId} but it's not in current view.`);
        }
      }
    };

    window.addEventListener("agroLensSync", handleAISync);
    return () => window.removeEventListener("agroLensSync", handleAISync);
  }, [records, selectedRecord]);


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
  
    // Prevent body scroll when modal is open
    useEffect(() => {
      if (selectedRecord || animalHistory) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = "unset"
      }
      return () => { document.body.style.overflow = "unset" }
    }, [selectedRecord, animalHistory])
  
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
        const searchFields = [r.record_id, r.token_number, r.animal_id, r.farm_id, r.drug_name, r.animal_type, r.country, r.problem, r.symptom].filter(Boolean).join(" ").toLowerCase()
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
          <Navbar role="Veterinarian" homePath="/" onLogout={onLogout} />
          
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
                  <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                  {auth?.isDemo ? "Veterinary Clinical Terminal" : `Welcome, ${auth?.name || "Doctor"}`}
                </h1>
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
                  {/* CLINICAL MRL DATABASE LOCATOR */}
                  <div className="card-glass rounded-[2rem] p-6 border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/20 via-violet-500/10 to-transparent flex flex-col items-start gap-6 animate-in slide-in-from-left duration-500 mb-8 overflow-hidden relative">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 blur-[80px] rounded-full pointer-events-none -mt-20 -mr-20 animate-pulse"></div>
                     <div className="flex items-center gap-4 w-full relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-fuchsia-500/30 shrink-0 transform -rotate-6 hover:rotate-0 transition-transform">
                          🧬
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-violet-300 uppercase italic tracking-tight">Clinical MRL Locator</h2>
                          <p className="text-xs text-slate-300">Search antimicrobial limits and mandatory withdrawal periods globally.</p>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 w-full">
                       <div className="flex gap-3 flex-1">
                         <input 
                           type="text" 
                           placeholder="Search drug (e.g., Penicillin, Ceftiofur)..." 
                           value={mrlQuery}
                           onChange={(e) => setMrlQuery(e.target.value)}
                           onKeyDown={(e) => e.key === "Enter" && handleMRLSearch()}
                           className="flex-1 bg-slate-900/50 border border-fuchsia-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 relative z-10"
                         />
                         <button 
                           onClick={handleMRLSearch}
                           className="bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-fuchsia-500/20 active:scale-95 relative z-10"
                         >
                           Query DB
                         </button>
                       </div>
                     </div>

                     {mrlResult && (
                       <div className="w-full mt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                         {mrlResult.notFound ? (
                           <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-sm font-medium relative z-10">
                             ⚠️ No regulatory data found for "<span className="font-bold">{mrlResult.query}</span>". Try "Penicillin", "Tetracycline", or "Ceftiofur".
                           </div>
                         ) : (
                           <div className="bg-slate-900/80 border border-fuchsia-500/40 rounded-xl p-5 shadow-inner relative z-10">
                             <div className="flex justify-between items-start border-b border-fuchsia-500/20 pb-3 mb-4">
                               <div>
                                 <div className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest mb-1">Drug Monograph</div>
                                 <div className="text-2xl font-black text-white">{mrlResult.drug}</div>
                               </div>
                               <div className="text-right">
                                 <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">MRL Limit</div>
                                 <div className="text-xl font-bold text-amber-400">{mrlResult.limit} <span className="text-xs text-amber-400/70">{mrlResult.unit}</span></div>
                               </div>
                             </div>
                             <div className="flex items-center justify-between mb-4">
                               <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-bold flex items-center gap-2">
                                 ⏳ Mandatory Withdrawal: {mrlResult.withdrawal} Days
                               </div>
                             </div>
                             <div>
                               <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Clinical Notes</div>
                               <p className="text-slate-300 text-sm italic border-l-2 border-slate-600 pl-3">"{mrlResult.notes}"</p>
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                  </div>

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
                                Case: {pendingRecords[0].token_number || pendingRecords[0].record_id}
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
                            
                            <div className="flex gap-4">
                              <button 
                                onClick={() => { setSelectedRecord(pendingRecords[0]); setPendingAction("approved") }}
                                className="px-10 py-5 bg-white text-slate-950 rounded-3xl font-black text-lg shadow-2xl shadow-white/10 hover:scale-[1.05] hover:shadow-white/20 transition-all active:scale-95 group/btn overflow-hidden relative"
                              >
                                <span className="relative z-10 uppercase tracking-widest">Decide Case Now</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-200 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                              </button>
                              <Link 
                                to={`/verify/${pendingRecords[0].record_id}`}
                                target="_blank"
                                className="px-6 py-5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-3xl font-black text-xs hover:bg-emerald-500/20 transition-all flex items-center gap-2 uppercase tracking-widest"
                              >
                                🛡️ Verify Certificate
                              </Link>
                            </div>
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
                    <div className="flex flex-wrap items-center justify-center sm:justify-between gap-4 text-[10px] sm:text-xs text-slate-400 mt-3 font-medium uppercase tracking-tighter sm:tracking-normal">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 shadow-sm whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />✔️ Safe ({Math.round(statusDistribution.approvedPercent)}%)</span>
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 shadow-sm whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/30" />⚠️ Violations ({Math.round(statusDistribution.rejectedPercent)}%)</span>
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 shadow-sm whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />⏳ Pending ({Math.round(statusDistribution.pendingPercent)}%)</span>
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
                       <div className="flex gap-3">
                         <button 
                           onClick={() => { setSelectedRecord(pendingRecords[0]); setPendingAction("approved") }}
                           className="px-8 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                         >
                           AUTHORIZE NOW
                         </button>
                         <Link 
                           to={`/verify/${pendingRecords[0].record_id}`}
                           target="_blank"
                           className="px-4 py-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black text-xs hover:bg-emerald-500/30 transition-all flex items-center justify-center min-w-[50px]"
                           title="Public Certificate"
                         >
                           🛡️
                         </Link>
                       </div>
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
                              <div className="grid grid-cols-1 xs:grid-cols-[1fr_auto] items-start gap-3 mb-5 border-b border-white/5 pb-4">
                                 <div className="space-y-1.5 min-w-0">
                                   <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <div className="px-2 py-0.5 bg-slate-800 rounded-md border border-white/10 shadow-sm flex items-center gap-2 max-w-full overflow-hidden">
                                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-tighter shrink-0">ID:</span>
                                        <span className="font-mono text-[11px] text-slate-100 font-black truncate leading-none">{r.token_number || r.record_id}</span>
                                      </div>
                                      {r.token_number && r.record_id?.includes('-') && (
                                         <div className="bg-slate-700/50 text-slate-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest leading-none">
                                            {r.record_id.split('-')[1]}
                                         </div>
                                      )}
                                   </div>
                                   <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[9px] uppercase tracking-widest pl-0.5">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                                      {r.date || r.administration_date}
                                   </div>
                                 </div>
                                 <div className={`justify-self-start xs:justify-self-end text-[9px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap shadow-xl flex items-center gap-2 ${
                                   (r.vet_status || r.status || "").toLowerCase() === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                                   (r.vet_status || r.status || "").toLowerCase() === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 
                                   'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                 }`}>
                                   <span className={`w-1.5 h-1.5 rounded-full ${(r.vet_status || r.status || "").toLowerCase() === 'approved' ? 'bg-emerald-500' : (r.vet_status || r.status || "").toLowerCase() === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                                   {r.vet_status || r.status || "Pending"}
                                 </div>
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
                                {((r.vet_status || r.status || "").toLowerCase() === 'pending' || (r.vet_status || r.status || "").toLowerCase() === 'not reviewed') ? (
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
                                <Link 
                                  to={`/verify/${r.record_id}`} 
                                  target="_blank"
                                  className="w-12 flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl transition-all"
                                  title="View Public Safety Certificate"
                                >
                                  🛡️
                                </Link>
                             </div>
                          </div>
                       ))}
                     </div>
                     {filteredRecords.length === 0 && (
                        <div className="text-center py-24 text-slate-500 italic border-2 border-dashed border-white/5 rounded-[3rem] animate-in fade-in duration-700">
                          <p className="text-lg font-medium mb-4">No records matching the current vector filters.</p>
                          <button 
                            onClick={() => {
                              setSearch("")
                              setStatusFilter("All")
                              setFilter("All")
                              setCountryFilter("All")
                              setFarmFilter("All")
                              setRiskFilter("All")
                              setProblemFilter("all")
                            }}
                            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 hover:text-white transition-all text-xs font-bold uppercase tracking-widest border border-white/5"
                          >
                            Reset All Filters
                          </button>
                        </div>
                      )}
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
                        <div className="text-xs text-slate-300 font-medium mb-3">Record indicates {r.drug_name} residue at {r.residue_value}mg/kg. Legal MRL: {r.MRL_limit}mg/kg.</div>
                        <Link 
                          to={`/verify/${r.record_id}`}
                          target="_blank"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase hover:bg-rose-500/20 transition-all"
                        >
                          🛡️ Audit Public Certificate
                        </Link>
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
                      <div className="text-xs text-slate-200 leading-relaxed font-medium mb-4">
                         {getRecommendation(r)}
                      </div>
                      <Link 
                        to={`/verify/${r.record_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-black uppercase hover:bg-cyan-500/20 transition-all"
                      >
                        🛡️ Verify Safety Record
                      </Link>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-slate-900 border border-white/10 p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300 my-auto">
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => { setSelectedRecord(null); }} 
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all hover:rotate-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black mb-1">Clinical Review</p>
                <h3 className="text-2xl font-black text-white">Record ID: {selectedRecord.record_id}</h3>
              </div>
  
              {/* Critical Alerts & Flags (High Visibility) */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedRecord?.is_critical && (
                  <div className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    High-Risk Critical Alert
                  </div>
                )}
                {selectedRecord?.consult_required && (
                  <div className="px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Mandatory Farmer Consult
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-6 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                {Object.entries(selectedRecord || {}).filter(([key]) => !["vet_remarks", "vet_notes", "digital_signature", "problem", "symptom", "is_critical", "consult_required"].includes(key)).map(([key, value]) => (
                  <div key={key} className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">{key.replace(/_/g, ' ')}</span>
                    <span className="text-slate-200 font-medium truncate" title={String(value)}>{String(value || "—")}</span>
                  </div>
                ))}
                <div className="col-span-2 pt-2 border-t border-white/10 mt-2 flex justify-between items-end">
                   <div>
                     <div className="text-slate-500 uppercase text-[9px] font-bold tracking-wider mb-1">Primary Clinical Issue</div>
                     <div className="text-cyan-400 font-bold text-sm">{(selectedRecord.problem || selectedRecord.symptom) || "N/A"}</div>
                   </div>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Expert Recommendations</label>
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

                {selectedRecord.drug_name === "Consult Veterinarian" && (
                  <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Manual Prescription Required
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Prescribed Drug</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Penicillin"
                          value={prescribedDrug}
                          onChange={(e) => setPrescribedDrug(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Prescribed Dose</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 500 mg"
                          value={prescribedDose}
                          onChange={(e) => setPrescribedDose(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-amber-500/60 italic leading-relaxed">Enter the exact treatment protocol for this specimen. This will update the record upon approval.</p>
                  </div>
                )}

                {/* Withdrawal Period Regulation */}
                {((selectedRecord.vet_status || selectedRecord.status || "").toLowerCase() === "pending" || (selectedRecord.vet_status || selectedRecord.status || "").toLowerCase() === "not reviewed") && (
                  <div className="space-y-4 pt-4 border-t border-white/5 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Residue Regulatory Limit
                      </div>
                      <span className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">MRL Standards Compliance</span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
                        <span>Withdrawal Period (Days)</span>
                        <span className="text-emerald-500">{withdrawalDays} Days Until Safe</span>
                      </label>
                      <input 
                        type="range" 
                        min="0" 
                        max="60" 
                        step="1"
                        value={withdrawalDays}
                        onChange={(e) => setWithdrawalDays(e.target.value)}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 font-bold px-1">
                        <span>0 DAYS</span>
                        <span>15 DAYS</span>
                        <span>30 DAYS</span>
                        <span>45 DAYS</span>
                        <span>60 DAYS</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-emerald-500/60 italic leading-relaxed">
                      Setting this regulates when the animal is safe for harvest. The system will track the residue safety countdown for the farmer.
                    </p>
                  </div>
                )}
              </div>
              
              
              {((selectedRecord.vet_status || selectedRecord.status || "").toLowerCase() === "pending" || (selectedRecord.vet_status || selectedRecord.status || "").toLowerCase() === "not reviewed") ? (
                <div className="flex gap-4">
                  <button 
                    onClick={() => updateRecordStatus(selectedRecord.record_id, "approved")} 
                    className={`flex-1 rounded-2xl px-4 py-4 text-xs font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${prescribedDrug ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {prescribedDrug ? 'PRESCRIBE & APPROVE' : 'APPROVE & E-SIGN'}
                  </button>
                  <button 
                    onClick={() => updateRecordStatus(selectedRecord.record_id, "rejected")} 
                    className="flex-1 rounded-2xl bg-slate-800 border border-rose-500/30 text-rose-400 px-4 py-4 text-xs font-black hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                  >
                    DECLINE
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl border flex flex-col items-center gap-3 ${(selectedRecord.vet_status || "").toLowerCase() === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                    <div className={`text-sm font-black uppercase tracking-widest ${(selectedRecord.vet_status || "").toLowerCase() === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(selectedRecord.vet_status || "").toUpperCase()} ON {selectedRecord.date || selectedRecord.administration_date}
                    </div>
                    {selectedRecord.digital_signature && (
                      <div className="text-[10px] font-mono text-slate-500 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 w-full text-center truncate">
                        SIG: {selectedRecord.digital_signature}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => { setSelectedRecord(null); }} 
                    className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-white/5"
                  >
                    Close Review
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
  
        {animalHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-slate-900 border border-white/10 p-8 shadow-2xl relative my-auto">
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
  })

export default VetDashboard
