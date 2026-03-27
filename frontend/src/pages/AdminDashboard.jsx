import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, LineChart, Line } from "recharts"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Loading from "../components/Loading"
import jsPDF from "jspdf"

const sections = ["Overview", "Analytics", "Alerts", "Consumer Safety", "Reports"]

function isViolation(record) {
  const overLimit = Number(record.residue_value) > Number(record.MRL_limit)
  const today = new Date().toISOString().slice(0, 10)
  const early = record.withdrawal_end_date ? today < record.withdrawal_end_date : false
  return overLimit || early || record.compliance_status?.toLowerCase() === "violation"
}

// Helper function to calculate withdrawal status
function getWithdrawalStatus(record) {
  const today = new Date();
  const adminDate = record.administration_date || record.date;
  
  if (!adminDate) return { status: "unknown", daysRemaining: 0, percentage: 100 };
  
  // Determine withdrawal period based on drug
  const withdrawalMap = {
    "Penicillin": 7, "Oxytetracycline": 5, "Amoxicillin": 6, "Enrofloxacin": 4,
    "Streptomycin": 7, "Doxycycline": 5, "Bromhexine": 3, "Gentamicin": 6,
    "Paracetamol": 2, "Vitamin B12": 1, "Probiotic": 0
  };
  
  const withdrawalDays = withdrawalMap[record.drug_name] || 5;
  const adminDateObj = new Date(adminDate);
  const withdrawalEndDate = new Date(adminDateObj);
  withdrawalEndDate.setDate(withdrawalEndDate.getDate() + withdrawalDays);
  
  const timeDiff = withdrawalEndDate - today;
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  let status = "safe";
  if (daysRemaining > 0) {
    status = "unsafe";
  }
  
  const percentage = Math.max(0, Math.min(100, ((withdrawalDays - daysRemaining) / withdrawalDays) * 100));
  
  return { 
    status, 
    daysRemaining: Math.max(0, daysRemaining), 
    percentage,
    withdrawalEndDate: withdrawalEndDate.toISOString().split("T")[0],
    withdrawalDays
  };
}

// Helper function to get product availability
function getProductAvailability(record) {
  const today = new Date();
  const adminDate = new Date(record.administration_date || record.date);
  
  const withdrawalMap = {
    "Penicillin": 7, "Oxytetracycline": 5, "Amoxicillin": 6, "Enrofloxacin": 4,
    "Streptomycin": 7, "Doxycycline": 5, "Bromhexine": 3, "Gentamicin": 6,
    "Paracetamol": 2, "Vitamin B12": 1, "Probiotic": 0
  };
  
  const withdrawalDays = withdrawalMap[record.drug_name] || 5;
  const withdrawalEndDate = new Date(adminDate);
  withdrawalEndDate.setDate(withdrawalEndDate.getDate() + withdrawalDays);
  
  // Determine animal type and applicable products
  let products = [];
  const animalType = record.animal_type?.toLowerCase() || "";
  
  if (animalType.includes("cow") || animalType.includes("buffalo")) {
    products = [
      { name: "Milk", canUse: today >= withdrawalEndDate },
      { name: "Meat", canUse: today >= withdrawalEndDate },
      { name: "Dairy Products", canUse: today >= withdrawalEndDate }
    ];
  } else if (animalType.includes("goat") || animalType.includes("sheep")) {
    products = [
      { name: "Milk", canUse: today >= withdrawalEndDate },
      { name: "Meat", canUse: today >= withdrawalEndDate },
      { name: "Cheese", canUse: today >= withdrawalEndDate }
    ];
  } else if (animalType.includes("pig")) {
    products = [
      { name: "Meat", canUse: today >= withdrawalEndDate },
      { name: "Pork", canUse: today >= withdrawalEndDate }
    ];
  } else if (animalType.includes("poultry") || animalType.includes("chicken")) {
    products = [
      { name: "Meat", canUse: today >= withdrawalEndDate },
      { name: "Eggs", canUse: today >= withdrawalEndDate }
    ];
  }
  
  return { 
    withdrawalEndDate: withdrawalEndDate.toISOString().split("T")[0],
    products,
    canUseAll: today >= withdrawalEndDate
  };
}

function AdminDashboard({ isDark, onThemeToggle }) {
  const nav = useNavigate()
  const [active, setActive] = useState("Overview")
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const [countryFilter, setCountryFilter] = useState("All")
  const [farmFilter, setFarmFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(false)
  const [animalHistory, setAnimalHistory] = useState(null)

  const sortByDateDesc = (items) => (items || []).slice().sort((a, b) => {
    const da = new Date(a.administration_date || a.date || 0)
    const db = new Date(b.administration_date || b.date || 0)
    return db - da
  })

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/records")
      const data = await res.json()
      setRecords(sortByDateDesc(data))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetch("http://localhost:5000/api/records")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setRecords(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error("Error loading records:", err)
        setRecords([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const summary = useMemo(() => {
    if (!records || !Array.isArray(records)) {
      return { total: 0, violations: 0, safe: 0, pending: 0, byDrug: {}, byCountry: {}, byFarm: {}, weakDates: {}, byAnimal: {}, byProblem: {}, byCountryDetails: {}, byFarmDetails: {} }
    }
    const reviewed = records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected")
    const pending = records.filter(r => !r.vet_status || r.vet_status === "pending").length
    const total = reviewed.length
    const violations = reviewed.filter(r => r.status === "not safe").length
    const safe = total - violations
    
    // Analytics by drug
    const byDrug = reviewed.reduce((acc, r) => { const name = r.drug_name || "Unknown"; acc[name] = (acc[name] || 0) + 1; return acc }, {})
    
    // Analytics by country with details
    const byCountryDetails = {}
    reviewed.forEach(r => {
      const c = r.country || "Unknown"
      if (!byCountryDetails[c]) byCountryDetails[c] = { safe: 0, unsafe: 0, count: 0 }
      byCountryDetails[c].count++
      if (r.status === "safe") byCountryDetails[c].safe++
      else byCountryDetails[c].unsafe++
    })
    const byCountry = Object.entries(byCountryDetails).reduce((acc, [c, v]) => { acc[c] = v.count; return acc }, {})
    
    // Analytics by farm with details
    const byFarmDetails = {}
    reviewed.forEach(r => {
      const f = r.farm_id || "Unknown"
      if (!byFarmDetails[f]) byFarmDetails[f] = { safe: 0, unsafe: 0, count: 0 }
      byFarmDetails[f].count++
      if (r.status === "safe") byFarmDetails[f].safe++
      else byFarmDetails[f].unsafe++
    })
    const byFarm = Object.entries(byFarmDetails).reduce((acc, [f, v]) => { acc[f] = v.count; return acc }, {})
    
    // Top animals treated
    const byAnimal = reviewed.reduce((acc, r) => { const a = r.animal_id || "Unknown"; acc[a] = (acc[a] || 0) + 1; return acc }, {})
    
    // Top problems
    const byProblem = reviewed.reduce((acc, r) => { const p = r.problem || r.symptom || "Unknown"; acc[p] = (acc[p] || 0) + 1; return acc }, {})
    
    const weakDates = reviewed.reduce((acc, r) => { const key = r.administration_date || r.date || "Unknown"; acc[key] = (acc[key] || 0) + 1; return acc }, {})
    return { total, violations, safe, pending, byDrug, byCountry, byFarm, weakDates, byAnimal, byProblem, byCountryDetails, byFarmDetails }
  }, [records])

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase()
    return records.filter((r) => {
      const isReviewed = r.vet_status === "approved" || r.vet_status === "rejected"
      if (!isReviewed) return false
      
      // Search filter
      const inTerm = [r.record_id, r.animal_id, r.farm_id, r.drug_name, r.species, r.country].join(" ").toLowerCase().includes(term)
      if (!inTerm) return false
      
      // Status filter
      if (statusFilter !== "All") {
        if (statusFilter === "Safe" && r.status !== "safe") return false
        if (statusFilter === "Not Safe" && r.status !== "not safe") return false
      }
      
      // Country filter
      if (countryFilter !== "All" && r.country !== countryFilter) return false
      
      // Farm filter
      if (farmFilter !== "All" && r.farm_id !== farmFilter) return false
      
      // Legacy filter
      if (filter === "Violations") return r.status === "not safe"
      if (filter === "Safe") return r.status === "safe"
      return true
    })
  }, [records, search, filter, countryFilter, farmFilter, statusFilter])

  const countryData = useMemo(() => Object.entries(summary.byCountry).map(([country, value]) => ({ country, value })), [summary.byCountry])

  const chartData = useMemo(() => Object.entries(summary.byDrug).map(([drug, value]) => ({ drug, value })), [summary.byDrug])

  // Alert type detection
  const getAlertType = (record) => {
    if (record.vet_status === "rejected") return { type: "Rejected Case", color: "rose", icon: "✗" }
    const sameAnimalViolations = records.filter(r => r.animal_id === record.animal_id && r.status === "not safe").length
    if (sameAnimalViolations > 1) return { type: "Repeated Animal", color: "amber", icon: "🔄" }
    if (Number(record.dose || 0) > 100) return { type: "High Dose", color: "rose", icon: "⚠️" }
    return { type: "Violation", color: "rose", icon: "!" }
  }

  // Enhanced alerts list
  const enhancedAlerts = useMemo(() => {
    return records
      .filter(r => r.status === "not safe" && (r.vet_status === "approved" || r.vet_status === "rejected"))
      .map(r => ({ ...r, alertInfo: getAlertType(r) }))
      .sort((a, b) => {
        const priorityMap = { "Rejected Case": 0, "Repeated Animal": 1, "High Dose": 2, "Violation": 3 }
        return (priorityMap[a.alertInfo.type] || 3) - (priorityMap[b.alertInfo.type] || 3)
      })
      .slice(0, 15)
  }, [records])

  // Consumer Safety Report - Last Dose & Withdrawal Status
  const consumerSafetyData = useMemo(() => {
    const reviewed = records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected");
    
    // Group by animal and get last dose
    const animalLastDose = {};
    reviewed.forEach(r => {
      const animalKey = `${r.farm_id || "Unknown"}__${r.animal_id || "Unknown"}`;
      const adminDate = new Date(r.administration_date || r.date || 0);
      
      if (!animalLastDose[animalKey] || adminDate > new Date(animalLastDose[animalKey].administration_date || 0)) {
        animalLastDose[animalKey] = r;
      }
    });
    
    return Object.values(animalLastDose)
      .map(record => ({
        ...record,
        withdrawalStatus: getWithdrawalStatus(record),
        productAvailability: getProductAvailability(record)
      }))
      .sort((a, b) => new Date(b.administration_date || b.date || 0) - new Date(a.administration_date || a.date || 0));
  }, [records])

  // Safety summary statistics
  const safetySummary = useMemo(() => {
    const canUseMilk = consumerSafetyData.filter(r => r.animal_type?.toLowerCase().includes("cow") || r.animal_type?.toLowerCase().includes("buffalo") || r.animal_type?.toLowerCase().includes("goat") || r.animal_type?.toLowerCase().includes("sheep")).filter(r => r.withdrawalStatus.status === "safe").length;
    const canUseMeat = consumerSafetyData.filter(r => r.withdrawalStatus.status === "safe").length;
    const unsafe = consumerSafetyData.filter(r => r.withdrawalStatus.status === "unsafe").length;
    const avgDaysRemaining = consumerSafetyData.length > 0 ? Math.round(consumerSafetyData.reduce((sum, r) => sum + r.withdrawalStatus.daysRemaining, 0) / consumerSafetyData.length) : 0;
    
    return { canUseMilk, canUseMeat, unsafe, avgDaysRemaining, total: consumerSafetyData.length };
  }, [consumerSafetyData])

  // Reports summary data
  const reportsSummary = useMemo(() => {
    const reviewed = records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected")
    const countryWise = {}
    const problemWise = {}
    
    reviewed.forEach(r => {
      const c = r.country || "Unknown"
      const p = r.problem || r.symptom || "Unknown"
      countryWise[c] = (countryWise[c] || 0) + 1
      problemWise[p] = (problemWise[p] || 0) + 1
    })
    
    return { countryWise, problemWise }
  }, [records])

  const recentActivities = useMemo(() => sortByDateDesc(records).slice(0, 5), [records])
  const topViolations = useMemo(() => records.filter(isViolation).sort((a, b) => new Date(b.administration_date || b.date || 0) - new Date(a.administration_date || a.date || 0)).slice(0, 6), [records])

  // New analytics data
  const uniqueCountries = useMemo(() => Object.keys(summary.byCountryDetails).sort(), [summary.byCountryDetails])
  const uniqueFarms = useMemo(() => Object.keys(summary.byFarmDetails).sort(), [summary.byFarmDetails])
  const topAnimals = useMemo(() => Object.entries(summary.byAnimal).sort((a, b) => b[1] - a[1]).slice(0, 10), [summary.byAnimal])
  const topProblems = useMemo(() => Object.entries(summary.byProblem).sort((a, b) => b[1] - a[1]).slice(0, 8), [summary.byProblem])
  const criticalFarms = useMemo(() => Object.entries(summary.byFarmDetails).filter(([_, v]) => v.unsafe > 0).sort((a, b) => b[1].unsafe - a[1].unsafe).slice(0, 5), [summary.byFarmDetails])
  const farmData = useMemo(() => Object.entries(summary.byFarm).map(([farm, value]) => ({ farm, value })).slice(0, 8), [summary.byFarm])

  const getAnimalHistory = (animalId) => {
    return records
      .filter((r) => r.animal_id === animalId)
      .sort((a, b) => new Date(b.administration_date) - new Date(a.administration_date))
  }

  const getActivityTimeline = useMemo(() => {
    const activities = []
    records.forEach((r) => {
      activities.push({
        date: r.administration_date,
        action: `Farmer submitted record for ${r.animal_id}`,
        type: "submitted",
        record_id: r.record_id
      })
      if (r.vet_status === "approved" || r.vet_status === "rejected") {
        activities.push({
          date: r.administration_date,
          action: `Vet ${r.vet_status} record for animal ${r.animal_id}`,
          type: r.vet_status === "approved" ? "approved" : "rejected",
          record_id: r.record_id
        })
      }
    })
    return activities.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [records])

  const exportReport = () => {
    const csv = [
      ["record_id", "animal_id", "farm_id", "country", "drug_name", "status", "administration_date", "vet_status"].join(","),
      ...records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected").map((r) => [r.record_id, r.animal_id, r.farm_id, r.country, r.drug_name, r.status, r.administration_date, r.vet_status].join(","))
    ].join("\n")
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = href
    a.download = `livestock-report-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text("Admin Report", 10, 10)
    doc.text(`Total Records: ${summary.total}`, 10, 20)
    doc.text(`Violations: ${summary.violations}`, 10, 30)
    doc.text(`Safe: ${summary.safe}`, 10, 40)
    doc.save("admin-report.pdf")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 md:p-5">
      {loading && <Loading />}
      <Navbar role="Admin" homePath="/" onLogout={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); nav("/") }} isDark={isDark} onThemeToggle={onThemeToggle} />
      <div className="mt-4 grid gap-3 md:grid-cols-[250px_1fr]">
        <Sidebar items={sections} active={active} onSelect={setActive} />

        <div className="space-y-3 max-w-7xl">
          <div className="rounded-3xl border border-cyan-300/20 bg-slate-900/70 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Executive Command Center</p>
                <h1 className="text-2xl font-bold">Regulatory SaaS Dashboard</h1>
                <p className="text-slate-300 text-sm">Live compliance and antimicrobial safety monitoring for authorities.</p>
              </div>
              <button onClick={exportReport} className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-2 text-xs font-semibold text-slate-900 shadow hover:scale-105 transition">Export CSV</button>
              <button onClick={exportPDF} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 shadow hover:scale-105 transition">Export PDF</button>
            </div>
          </div>

          {/* ENHANCED FILTER BAR */}
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase text-slate-400">Search Records</label>
                <input
                  type="text"
                  placeholder="Search by animal ID, farm ID, drug name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <div>
                  <label className="text-xs uppercase text-slate-400">Country</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="All">All Countries</option>
                    {uniqueCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Farm</label>
                  <select
                    value={farmFilter}
                    onChange={(e) => setFarmFilter(e.target.value)}
                    className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="All">All Farms</option>
                    {uniqueFarms.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="All">All Status</option>
                    <option value="Safe">Safe</option>
                    <option value="Not Safe">Not Safe</option>
                  </select>
                </div>
                <div className="flex items-end pt-1">
                  <button
                    onClick={() => { setSearch(""); setCountryFilter("All"); setFarmFilter("All"); setStatusFilter("All") }}
                    className="w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-600 transition"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {active === "Overview" && (
          <div className="space-y-3">
            {/* ENHANCED SUMMARY CARDS */}
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg hover:shadow-xl transition">
                <div className="text-xs uppercase text-cyan-400 font-semibold">Total Records</div>
                <div className="mt-2 text-3xl font-bold text-cyan-300">{summary.total + summary.pending}</div>
                <div className="text-xs text-slate-400 mt-1">Submitted & reviewed</div>
              </div>
              <div className="rounded-2xl bg-emerald-900/25 border border-emerald-500/40 p-3 shadow-lg hover:shadow-xl transition">
                <div className="text-xs uppercase text-emerald-400 font-semibold">Safe Records</div>
                <div className="mt-2 text-3xl font-bold text-emerald-300">{summary.safe}</div>
                <div className="text-xs text-slate-400 mt-1">Compliant & approved</div>
              </div>
              <div className="rounded-2xl bg-rose-900/25 border border-rose-500/40 p-3 shadow-lg hover:shadow-xl transition">
                <div className="text-xs uppercase text-rose-400 font-semibold">Not Safe</div>
                <div className="mt-2 text-3xl font-bold text-rose-300">{summary.violations}</div>
                <div className="text-xs text-slate-400 mt-1">Violations detected</div>
              </div>
              <div className="rounded-2xl bg-amber-900/25 border border-amber-500/40 p-3 shadow-lg hover:shadow-xl transition">
                <div className="text-xs uppercase text-amber-400 font-semibold">Pending Review</div>
                <div className="mt-2 text-3xl font-bold text-amber-300">{summary.pending}</div>
                <div className="text-xs text-slate-400 mt-1">Awaiting vet decision</div>
              </div>
            </div>

            {/* COUNTRY-WISE ANALYSIS */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300">Country-wise Breakdown</h3>
                <div className="mt-3 space-y-2">
                  {Object.entries(summary.byCountryDetails).map(([country, details]) => (
                    <div key={country} className="bg-slate-900 rounded-lg p-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-200">{country}</span>
                        <span className="text-xs text-slate-400">{details.count} records</span>
                      </div>
                      <div className="flex gap-1 text-[10px]">
                        <span className="text-emerald-300">✓ {details.safe}</span>
                        <span className="text-rose-300">✗ {details.unsafe}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300">Top Problems Detected</h3>
                <div className="mt-3 space-y-1">
                  {topProblems.slice(0, 6).map(([problem, count]) => (
                    <div key={problem} className="flex justify-between items-center bg-slate-900 rounded p-2 text-xs">
                      <span className="text-slate-300">{problem}</span>
                      <span className="text-amber-400 font-semibold">{count} cases</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FARM & ANIMAL ANALYSIS */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300">Farms with Issues</h3>
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  {criticalFarms.length > 0 ? criticalFarms.map(([farm, details]) => (
                    <div key={farm} className="bg-rose-900/20 rounded p-2 text-xs border-l-2 border-rose-400">
                      <div className="flex justify-between font-semibold">
                        <span className="text-rose-200">{farm}</span>
                        <span className="text-rose-300">{details.unsafe} violations</span>
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5">{details.safe} safe, {details.count} total</div>
                    </div>
                  )) : (
                    <div className="text-slate-400 text-xs text-center py-3">No critical issues detected</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300">Most Treated Animals</h3>
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  {topAnimals.slice(0, 8).map(([animal, count]) => (
                    <div key={animal} className="flex justify-between items-center bg-slate-900 rounded p-2 text-xs">
                      <span className="text-slate-300">{animal}</span>
                      <span className="text-blue-400 font-semibold">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COUNTRY STATUS MAP */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Geographic Status Overview</h2>
                  <p className="text-xs text-slate-400">Records by country compliance status</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
                {["India", "USA", "Germany", "Brazil", "Australia"].map((country) => {
                  const countryRecords = records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected" ? r.country === country : false)
                  const safeCont = countryRecords.filter(r => r.status === "safe").length
                  const unsafeCont = countryRecords.filter(r => r.status === "not safe").length
                  const pendingCont = records.filter(r => r.vet_status !== "approved" && r.vet_status !== "rejected" && r.country === country).length
                  const total = safeCont + unsafeCont + pendingCont
                  
                  let statusColor = "bg-slate-700 border-slate-600"
                  let statusText = "text-slate-300"
                  let iconColor = "text-slate-300"
                  
                  if (total > 0) {
                    if (unsafeCont > 0) {
                      statusColor = "bg-rose-900/30 border-rose-500/50"
                      statusText = "text-rose-200"
                      iconColor = "text-rose-400"
                    } else if (safeCont > 0) {
                      statusColor = "bg-emerald-900/20 border-emerald-500/40"
                      statusText = "text-emerald-200"
                      iconColor = "text-emerald-400"
                    } else if (pendingCont > 0) {
                      statusColor = "bg-amber-900/20 border-amber-500/40"
                      statusText = "text-amber-200"
                      iconColor = "text-amber-400"
                    }
                  }
                  
                  return (
                    <div key={country} className={`rounded-lg border-2 ${statusColor} p-3 transition hover:shadow-lg`}>
                      <h3 className={`font-semibold ${statusText}`}>{country}</h3>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">Safe:</span><span className="text-emerald-400 font-semibold">{safeCont}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Not Safe:</span><span className="text-rose-400 font-semibold">{unsafeCont}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Pending:</span><span className="text-amber-400 font-semibold">{pendingCont}</span></div>
                      </div>
                      <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                        <div className="flex h-full rounded-full overflow-hidden">
                          {safeCont > 0 && <div className="bg-emerald-500" style={{ width: `${total > 0 ? (safeCont / total) * 100 : 0}%` }}></div>}
                          {unsafeCont > 0 && <div className="bg-rose-500" style={{ width: `${total > 0 ? (unsafeCont / total) * 100 : 0}%` }}></div>}
                          {pendingCont > 0 && <div className="bg-amber-500" style={{ width: `${total > 0 ? (pendingCont / total) * 100 : 0}%` }}></div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* COMPREHENSIVE DATA TABLE */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-cyan-300">Complete Records Database</h3>
                <p className="text-xs text-slate-400">Showing {filteredRecords.length} of {records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected").length} reviewed records</p>
              </div>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead className="bg-slate-900 sticky top-0">
                    <tr className="border-b border-slate-700">
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Record</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Country</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Farm</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Animal</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Drug</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Date</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Status</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold text-[10px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredRecords.length > 0 ? filteredRecords.slice(0, 20).map((r) => (
                      <tr key={r.record_id} className={`hover:bg-slate-700/50 ${r.status === "not safe" ? "bg-rose-900/10" : "bg-emerald-900/5"} border-b border-slate-700`}>
                        <td className="px-1.5 py-2 text-cyan-300 font-semibold text-[10px] truncate">{r.record_id}</td>
                        <td className="px-1.5 py-2 text-slate-300 text-[10px] truncate">{r.country || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-300 text-[10px] truncate">{r.farm_id || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-300 text-[10px] truncate">{r.animal_id || "—"}</td>
                        <td className="px-1.5 py-2 text-amber-300 text-[10px] font-semibold truncate">{r.drug_name || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-400 text-[10px] truncate">{r.administration_date || r.date || "—"}</td>
                        <td className="px-1.5 py-2 text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold inline-block truncate max-w-16 ${r.status === "safe" ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
                            {r.status === "safe" ? "SAFE" : "UNSAFE"}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 text-[10px]">
                          <button onClick={() => setAnimalHistory(r.animal_id)} className="text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-slate-600 transition text-[9px] whitespace-nowrap">
                            View
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr className="h-16">
                        <td colSpan="8" className="text-center text-slate-400 text-xs py-4">No records match current filters</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length > 20 && (
                <div className="mt-2 text-center text-xs text-slate-400">
                  Showing 20 of {filteredRecords.length} records • Use filters to narrow down
                </div>
              )}
            </div>
          </div>
          )}

          {active === "Analytics" && (
          <section className="space-y-3">
            {/* EXISTING 4 CHARTS */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <h2 className="text-lg font-semibold mb-3">📊 Core Analytics</h2>
              <div className="grid gap-3 lg:grid-cols-4 h-64">
                <div className="rounded-xl bg-slate-900 p-2 border border-slate-700"><div className="text-xs uppercase text-slate-400 mb-2">Safe vs Violation</div><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={[{ name: "Safe", value: summary.safe }, { name: "Violation", value: summary.violations }]} dataKey="value" cx="50%" cy="50%" outerRadius={60}><Cell fill="#10b981"/><Cell fill="#ef4444"/></Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                <div className="rounded-xl bg-slate-900 p-2 border border-slate-700"><div className="text-xs uppercase text-slate-400 mb-2">Drug usage</div><ResponsiveContainer width="100%" height={180}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="drug" tick={{ fontSize: 10 }} stroke="#cbd5e1" /><YAxis stroke="#cbd5e1" /><Tooltip /><Bar dataKey="value" fill="#0ea5e9" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div>
                <div className="rounded-xl bg-slate-900 p-2 border border-slate-700"><div className="text-xs uppercase text-slate-400 mb-2">Records trend</div><ResponsiveContainer width="100%" height={180}><LineChart data={Object.entries(summary.weakDates).slice(-10).map(([date, count]) => ({ date, count }))}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#cbd5e1" /><YAxis stroke="#cbd5e1" /><Tooltip /><Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
                <div className="rounded-xl bg-slate-900 p-2 border border-slate-700"><div className="text-xs uppercase text-slate-400 mb-2">Country Distribution</div><ResponsiveContainer width="100%" height={180}><BarChart data={countryData.slice(0, 5)}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="country" tick={{ fontSize: 10 }} stroke="#cbd5e1" /><YAxis stroke="#cbd5e1" /><Tooltip /><Bar dataKey="value" fill="#f59e0b" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div>
              </div>
            </div>

            {/* ADDITIONAL ANALYTICS CHARTS */}
            <div className="grid gap-3 lg:grid-cols-2 h-64">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div className="text-xs uppercase text-slate-400 mb-2 font-semibold">Problems Distribution</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProblems.map(([problem, value]) => ({ problem: problem.substring(0, 10), value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="problem" tick={{ fontSize: 9 }} stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ec4899" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div className="text-xs uppercase text-slate-400 mb-2 font-semibold">Farm Activity</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={farmData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="farm" tick={{ fontSize: 9 }} stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#06b6d4" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MINI ANALYTICS CARDS */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-xs uppercase text-slate-400 font-semibold mb-2">Compliance Rate</h3>
                <div className="text-3xl font-bold text-emerald-400">{summary.total > 0 ? Math.round((summary.safe / summary.total) * 100) : 0}%</div>
                <div className="text-xs text-slate-400 mt-1">{summary.safe} safe of {summary.total} reviewed</div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: summary.total > 0 ? `${(summary.safe / summary.total) * 100}%` : "0%" }}></div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-xs uppercase text-slate-400 font-semibold mb-2">Violation Rate</h3>
                <div className="text-3xl font-bold text-rose-400">{summary.total > 0 ? Math.round((summary.violations / summary.total) * 100) : 0}%</div>
                <div className="text-xs text-slate-400 mt-1">{summary.violations} violations of {summary.total} reviewed</div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: summary.total > 0 ? `${(summary.violations / summary.total) * 100}%` : "0%" }}></div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-xs uppercase text-slate-400 font-semibold mb-2">Pending Cases</h3>
                <div className="text-3xl font-bold text-amber-400">{summary.pending}</div>
                <div className="text-xs text-slate-400 mt-1">Awaiting veterinary review</div>
                <div className="mt-2 px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded text-center">
                  {summary.pending === 0 ? "All caught up ✓" : "Action required"}
                </div>
              </div>
            </div>
          </section>
          )}

          {active === "Alerts" && (
          <section className="space-y-3">
            {/* ALERTS STATISTICS CARDS */}
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-rose-900/20 border border-rose-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-rose-400 font-semibold">Total Alerts</div>
                <div className="mt-2 text-3xl font-bold text-rose-300">{enhancedAlerts.length}</div>
                <div className="text-xs text-slate-400 mt-1">Critical issues detected</div>
              </div>
              <div className="rounded-2xl bg-amber-900/20 border border-amber-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-amber-400 font-semibold">Repeated Cases</div>
                <div className="mt-2 text-3xl font-bold text-amber-300">{enhancedAlerts.filter(a => a.alertInfo.type === "Repeated Animal").length}</div>
                <div className="text-xs text-slate-400 mt-1">Same animal violations</div>
              </div>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div className="text-xs uppercase text-slate-400 font-semibold">High Dose Alerts</div>
                <div className="mt-2 text-3xl font-bold text-amber-300">{enhancedAlerts.filter(a => a.alertInfo.type === "High Dose").length}</div>
                <div className="text-xs text-slate-400 mt-1">Dose limit exceeded</div>
              </div>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div className="text-xs uppercase text-slate-400 font-semibold">Rejections</div>
                <div className="mt-2 text-3xl font-bold text-rose-400">{enhancedAlerts.filter(a => a.alertInfo.type === "Rejected Case").length}</div>
                <div className="text-xs text-slate-400 mt-1">Vet rejected records</div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <h2 className="text-lg font-semibold mb-3">Alert Feed - Critical Issues</h2>
              
              {/* ALERT LEGEND */}
              <div className="mb-4 p-3 bg-slate-900 rounded-lg flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-slate-300">Critical (Rejected/High Dose)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-300">Warning (Repeated Animal)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Total:</span>
                  <span className="text-rose-300 font-semibold">{enhancedAlerts.length} alerts</span>
                </div>
              </div>

              {/* ALERTS LIST */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {enhancedAlerts.length > 0 ? enhancedAlerts.map((r) => {
                  const colorMap = {
                    rose: "bg-rose-900/25 border-rose-500/40",
                    amber: "bg-amber-900/25 border-amber-500/40"
                  }
                  const textColorMap = {
                    rose: "text-rose-200",
                    amber: "text-amber-200"
                  }
                  const badgeColorMap = {
                    rose: "bg-rose-900/40 text-rose-300",
                    amber: "bg-amber-900/40 text-amber-300"
                  }
                  
                  return (
                    <div key={`alert-${r.record_id}`} className={`rounded-lg border-2 ${colorMap[r.alertInfo.color]} p-3 transition hover:shadow-lg`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{r.alertInfo.icon}</span>
                          <div>
                            <div className="font-semibold text-slate-100">{r.record_id}</div>
                            <div className={`text-xs font-semibold ${textColorMap[r.alertInfo.color]}`}>{r.alertInfo.type}</div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${badgeColorMap[r.alertInfo.color]}`}>
                          {r.status === "not safe" ? "NOT SAFE" : "VIOLATION"}
                        </span>
                      </div>

                      {/* ALERT DETAILS GRID */}
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-[11px]">
                        <div>
                          <span className="text-slate-400">Country:</span>
                          <div className="text-slate-100 font-semibold">{r.country || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Farm:</span>
                          <div className="text-slate-100 font-semibold">{r.farm_id || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Animal:</span>
                          <div className="text-slate-100 font-semibold">{r.animal_id || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Drug:</span>
                          <div className="text-amber-300 font-semibold">{r.drug_name || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Problem:</span>
                          <div className="text-slate-100">{r.problem || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Symptom:</span>
                          <div className="text-slate-100">{r.symptom || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Dose:</span>
                          <div className="text-slate-100 font-semibold">{r.dose || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Date:</span>
                          <div className="text-slate-100">{r.administration_date || r.date || "—"}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Vet Status:</span>
                          <div className={`text-xs font-semibold px-1.5 py-0.5 rounded text-center ${r.vet_status === "approved" ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
                            {r.vet_status || "pending"}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Final Status:</span>
                          <div className={`text-xs font-semibold ${r.status === "safe" ? "text-emerald-400" : "text-rose-400"}`}>
                            {r.status === "safe" ? "✓ SAFE" : "✗ NOT SAFE"}
                          </div>
                        </div>
                      </div>

                      {/* ACTION BUTTON */}
                      <div className="mt-2 pt-2 border-t border-slate-700/30">
                        <button
                          onClick={() => setAnimalHistory(r.animal_id)}
                          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-700 transition"
                        >
                          📋 View Treatment History
                        </button>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center text-slate-400 py-6 text-sm">✓ No critical alerts at this moment</div>
                )}
              </div>
            </div>
          </section>
          )}

          {active === "Consumer Safety" && (
          <section className="space-y-3">
            {/* CONSUMER SAFETY HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 p-4 shadow-lg">
              <div>
                <h2 className="text-lg font-semibold text-emerald-300">🛡️ Consumer Safety & Withdrawal Status</h2>
                <p className="text-xs text-slate-400 mt-1">Last dose timeline, withdrawal periods, and product availability for consumer protection</p>
              </div>
            </div>

            {/* SAFETY SUMMARY CARDS */}
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-emerald-900/20 border border-emerald-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-emerald-400 font-semibold">Safe to Use Now</div>
                <div className="mt-2 text-3xl font-bold text-emerald-300">{safetySummary.canUseMeat}</div>
                <div className="text-xs text-slate-400 mt-1">Animals cleared for consumption</div>
              </div>
              <div className="rounded-2xl bg-amber-900/20 border border-amber-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-amber-400 font-semibold">Under Withdrawal</div>
                <div className="mt-2 text-3xl font-bold text-amber-300">{safetySummary.unsafe}</div>
                <div className="text-xs text-slate-400 mt-1">Awaiting withdrawal period</div>
              </div>
              <div className="rounded-2xl bg-cyan-900/20 border border-cyan-500/40 p-3 shadow-lg">
                <div className="text-xs uppercase text-cyan-400 font-semibold">Avg Days Remaining</div>
                <div className="mt-2 text-3xl font-bold text-cyan-300">{safetySummary.avgDaysRemaining}</div>
                <div className="text-xs text-slate-400 mt-1">Average withdrawal time</div>
              </div>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div className="text-xs uppercase text-slate-400 font-semibold">Total Tracked</div>
                <div className="mt-2 text-3xl font-bold text-slate-100">{safetySummary.total}</div>
                <div className="text-xs text-slate-400 mt-1">Active records</div>
              </div>
            </div>

            {/* WITHDRAWAL & PRODUCT AVAILABILITY TABLE */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-cyan-300">Last Dose Timeline & Product Availability</h3>
                <p className="text-xs text-slate-400 mt-1">Last administered dosage with withdrawal countdown and consumer product status</p>
              </div>
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full text-left text-[11px] border-collapse table-fixed">
                  <thead className="bg-slate-900 sticky top-0">
                    <tr className="border-b border-slate-700">
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Animal</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Last Drug</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Last Dose Date</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Withdrawal Days</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Days Remaining</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Status</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Can Use</th>
                      <th className="px-1.5 py-2 text-slate-300 font-semibold">Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {consumerSafetyData.length > 0 ? consumerSafetyData.slice(0, 50).map((r) => (
                      <tr key={r.record_id} className={`hover:bg-slate-700/50 border-b border-slate-700 ${r.withdrawalStatus.status === "safe" ? "bg-emerald-900/5" : "bg-amber-900/5"}`}>
                        <td className="px-1.5 py-2 font-semibold text-slate-200 truncate">{r.animal_id || "—"}</td>
                        <td className="px-1.5 py-2 text-amber-300 font-semibold truncate">{r.drug_name || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-300 truncate">{r.administration_date || r.date || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-300 font-semibold">{r.withdrawalStatus.withdrawalDays}d</td>
                        <td className="px-1.5 py-2 text-center">
                          <span className={`font-bold ${r.withdrawalStatus.daysRemaining > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                            {r.withdrawalStatus.daysRemaining > 0 ? `${r.withdrawalStatus.daysRemaining}d` : "0d"}
                          </span>
                        </td>
                        <td className="px-1.5 py-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap ${r.withdrawalStatus.status === "safe" ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"}`}>
                            {r.withdrawalStatus.status === "safe" ? "✓ SAFE" : "⏳ UNSAFE"}
                          </span>
                        </td>
                        <td className="px-1.5 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {r.productAvailability.products.map((prod, idx) => (
                              <span key={idx} className={`text-[9px] px-1 py-0.5 rounded whitespace-nowrap ${prod.canUse ? "bg-emerald-900/40 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                                {prod.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-1.5 py-2">
                          <button 
                            onClick={() => setAnimalHistory(r.animal_id)}
                            className="text-blue-400 hover:text-blue-300 px-1 py-0.5 rounded hover:bg-slate-600 transition text-[9px]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr className="h-16">
                        <td colSpan="8" className="text-center text-slate-400 text-xs py-4">No records available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAILED WITHDRAWAL & PRODUCT STATUS */}
            <div className="grid gap-3 lg:grid-cols-2">
              {/* UPCOMING CLEARANCES */}
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">✓ Ready for Consumer Use</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {consumerSafetyData.filter(r => r.withdrawalStatus.status === "safe").length > 0 ? (
                    consumerSafetyData.filter(r => r.withdrawalStatus.status === "safe").slice(0, 15).map((r) => (
                      <div key={r.record_id} className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-2.5">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <div className="font-semibold text-emerald-200">{r.animal_id}</div>
                            <div className="text-xs text-slate-400">{r.farm_id} • {r.country}</div>
                          </div>
                          <span className="text-xs bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded font-semibold">FREE NOW</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] mt-2 border-t border-emerald-500/20 pt-2">
                          <div><span className="text-slate-400">Drug:</span> <span className="text-white font-semibold">{r.drug_name}</span></div>
                          <div><span className="text-slate-400">Since:</span> <span className="text-white">{r.administration_date || r.date}</span></div>
                          <div><span className="text-slate-400">Products:</span> <span className="text-emerald-300 font-semibold">{r.productAvailability.products.map(p => p.name).join(", ")}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-xs text-center py-4">No animals currently safe for consumption</div>
                  )}
                </div>
              </div>

              {/* PENDING CLEARANCES */}
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-amber-300 mb-3">⏳ Awaiting Consumer Use Clearance</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {consumerSafetyData.filter(r => r.withdrawalStatus.status === "unsafe").length > 0 ? (
                    consumerSafetyData.filter(r => r.withdrawalStatus.status === "unsafe").slice(0, 15).map((r) => (
                      <div key={r.record_id} className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-2.5">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <div className="font-semibold text-amber-200">{r.animal_id}</div>
                            <div className="text-xs text-slate-400">{r.farm_id} • {r.country}</div>
                          </div>
                          <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-1 rounded font-semibold">{r.withdrawalStatus.daysRemaining}d LEFT</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] mt-2 border-t border-amber-500/20 pt-2">
                          <div><span className="text-slate-400">Drug:</span> <span className="text-white font-semibold">{r.drug_name}</span></div>
                          <div><span className="text-slate-400">Dosed:</span> <span className="text-white">{r.administration_date || r.date}</span></div>
                          <div><span className="text-slate-400">Free On:</span> <span className="text-amber-300 font-semibold">{r.withdrawalStatus.withdrawalEndDate}</span></div>
                        </div>
                        <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all" style={{ width: `${r.withdrawalStatus.percentage}%` }}></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-xs text-center py-4">All animals cleared for consumer use!</div>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCT-SPECIFIC AVAILABILITY INSIGHTS */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">📦 Product-Specific Consumer Availability</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-slate-200 mb-2">🥛 Milk & Dairy</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Safe Now:</span>
                      <span className="text-emerald-300 font-semibold">{consumerSafetyData.filter(r => ["Cow", "Buffalo", "Goat", "Sheep"].some(t => r.animal_type?.toLowerCase().includes(t.toLowerCase())) && r.withdrawalStatus.status === "safe").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending:</span>
                      <span className="text-amber-300 font-semibold">{consumerSafetyData.filter(r => ["Cow", "Buffalo", "Goat", "Sheep"].some(t => r.animal_type?.toLowerCase().includes(t.toLowerCase())) && r.withdrawalStatus.status === "unsafe").length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-slate-200 mb-2">🥩 Meat & Poultry</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Safe Now:</span>
                      <span className="text-emerald-300 font-semibold">{consumerSafetyData.filter(r => r.withdrawalStatus.status === "safe").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending:</span>
                      <span className="text-amber-300 font-semibold">{consumerSafetyData.filter(r => r.withdrawalStatus.status === "unsafe").length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-slate-200 mb-2">🥚 Eggs (Poultry Only)</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Safe Now:</span>
                      <span className="text-emerald-300 font-semibold">{consumerSafetyData.filter(r => r.animal_type?.toLowerCase().includes("poultry") && r.withdrawalStatus.status === "safe").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending:</span>
                      <span className="text-amber-300 font-semibold">{consumerSafetyData.filter(r => r.animal_type?.toLowerCase().includes("poultry") && r.withdrawalStatus.status === "unsafe").length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONSUMER SAFETY GUIDELINES */}
            <div className="rounded-2xl bg-gradient-to-r from-rose-900/20 to-rose-900/10 border border-rose-500/30 p-4 shadow-lg">
              <h3 className="font-semibold text-rose-300 text-sm mb-2">⚠️ Consumer Safety Guidelines</h3>
              <ul className="space-y-1.5 text-xs text-rose-200">
                <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Withdrawal Period:</strong> Mandatory period after treatment before product can be sold for human consumption.</span></li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Green Status:</strong> Animal has completed withdrawal period - milk, meat, eggs safe for market.</span></li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Amber Status:</strong> Withdrawal period ongoing - products MUST NOT be sold, only for farm use.</span></li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Residue Risk:</strong> Using animal products during withdrawal can lead to antibiotic residues in human food chain.</span></li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Public Health:</strong> Proper withdrawal adherence prevents antimicrobial resistance in humans.</span></li>
              </ul>
            </div>
          </section>
          )}

          {active === "Reports" && (
          <section className="space-y-3">
            {/* PREMIUM REPORTS HEADER WITH EXPORT OPTIONS */}
            <div className="rounded-2xl bg-gradient-to-r from-cyan-900/20 to-indigo-900/20 border border-cyan-500/30 p-4 shadow-lg">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-cyan-300">📋 Advanced Reports & Analytics</h2>
                  <p className="text-xs text-slate-400 mt-1">Comprehensive data analysis and compliance reporting</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportReport} className="rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-2 font-semibold transition">📥 Export CSV</button>
                  <button onClick={exportPDF} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 font-semibold transition">📄 Export PDF</button>
                </div>
              </div>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-xs">📊</span>
                  <span>{records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected").length} total reviewed</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="text-xs">✓</span>
                  <span>{summary.safe} compliant</span>
                </div>
                <div className="flex items-center gap-2 text-rose-300">
                  <span className="text-xs">⚠️</span>
                  <span>{summary.violations} non-compliant</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="text-xs">⏳</span>
                  <span>{summary.pending} pending</span>
                </div>
              </div>
            </div>

            {/* REPORTS SUMMARY CARDS */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Overall Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                    <span className="text-slate-400">Total Records</span>
                    <span className="text-slate-100 font-semibold">{records.filter(r => r.vet_status === "approved" || r.vet_status === "rejected").length}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                    <span className="text-emerald-400">Safe Records</span>
                    <span className="text-emerald-300 font-semibold">{summary.safe}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                    <span className="text-rose-400">Not Safe Records</span>
                    <span className="text-rose-300 font-semibold">{summary.violations}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                    <span className="text-amber-400">Pending Review</span>
                    <span className="text-amber-300 font-semibold">{summary.pending}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Compliance Metrics</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Safe Rate</span>
                      <span className="text-emerald-400 font-semibold">{summary.total > 0 ? Math.round((summary.safe / summary.total) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: summary.total > 0 ? `${(summary.safe / summary.total) * 100}%` : "0%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Violation Rate</span>
                      <span className="text-rose-400 font-semibold">{summary.total > 0 ? Math.round((summary.violations / summary.total) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: summary.total > 0 ? `${(summary.violations / summary.total) * 100}%` : "0%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PREMIUM INSIGHTS & TRENDS */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl bg-emerald-900/15 border border-emerald-500/30 p-3 shadow-lg">
                <div className="text-xs uppercase text-emerald-400 font-semibold mb-2">✓ System Health</div>
                <div className="text-sm">
                  <div className="text-emerald-300 font-bold text-lg">{summary.total > 0 ? Math.round((summary.safe / summary.total) * 100) : 0}%</div>
                  <div className="text-xs text-slate-400">Compliance rate</div>
                  <div className="mt-2 text-[11px] space-y-1 text-slate-300">
                    <div>• {summary.safe} safe records</div>
                    <div>• {uniqueCountries.length} countries monitored</div>
                    <div>• {uniqueFarms.length} farms tracked</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-rose-900/15 border border-rose-500/30 p-3 shadow-lg">
                <div className="text-xs uppercase text-rose-400 font-semibold mb-2">⚠️ Risk Summary</div>
                <div className="text-sm">
                  <div className="text-rose-300 font-bold text-lg">{summary.violations}</div>
                  <div className="text-xs text-slate-400">Non-compliant records</div>
                  <div className="mt-2 text-[11px] space-y-1 text-slate-300">
                    <div>• {summary.total > 0 ? Math.round((summary.violations / summary.total) * 100) : 0}% of reviewed</div>
                    <div>• {criticalFarms.length} farms with issues</div>
                    <div>• Requires attention</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div className="text-xs uppercase text-cyan-400 font-semibold mb-2">📈 Key Metrics</div>
                <div className="text-sm">
                  <div className="text-cyan-300 font-bold text-lg">{summary.pending}</div>
                  <div className="text-xs text-slate-400">Pending review</div>
                  <div className="mt-2 text-[11px] space-y-1 text-slate-300">
                    <div>• {topProblems[0] ? `Top: ${topProblems[0][0]}` : "No problems"}</div>
                    <div>• {topAnimals[0] ? `Most treated: ${topAnimals[0][0]}` : "No animals"}</div>
                    <div>• Records need approval</div>
                  </div>
                </div>
              </div>
            </div>

            {/* COUNTRY-WISE & PROBLEM-WISE SUMMARIES */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Country-wise Summary</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Object.entries(reportsSummary.countryWise).sort((a, b) => b[1] - a[1]).map(([country, count]) => (
                    <div key={country} className="flex justify-between items-center p-2 rounded bg-slate-900 text-xs hover:bg-slate-800 transition">
                      <span className="text-slate-300">{country}</span>
                      <span className="text-cyan-300 font-semibold">{count} records</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Problem-wise Summary</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Object.entries(reportsSummary.problemWise).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([problem, count]) => (
                    <div key={problem} className="flex justify-between items-center p-2 rounded bg-slate-900 text-xs hover:bg-slate-800 transition">
                      <span className="text-slate-300 truncate">{problem}</span>
                      <span className="text-amber-400 font-semibold ml-2">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* DETAILED RECORDS TABLE */}
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">Detailed Records</h3>
              <div className="overflow-y-auto max-h-96 rounded-lg border border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Record</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Country</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Farm</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Animal</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Drug</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Date</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredRecords.length > 0 ? filteredRecords.slice(0, 20).map((r) => (
                      <tr key={r.record_id} className={`hover:bg-slate-700/30 transition ${r.status === "not safe" ? "bg-rose-900/10" : "bg-emerald-900/5"}`}>
                        <td className="px-3 py-2 text-cyan-300 font-semibold whitespace-nowrap">{r.record_id}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.country || "—"}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.farm_id || "—"}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.animal_id || "—"}</td>
                        <td className="px-3 py-2 text-amber-300 font-semibold whitespace-nowrap">{r.drug_name || "—"}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-[10px]">{r.administration_date || r.date || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${r.status === "safe" ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
                            {r.status === "safe" ? "SAFE" : "NOT SAFE"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => setAnimalHistory(r.animal_id)}
                            className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded hover:bg-slate-600 transition"
                          >
                            📋
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" className="px-3 py-4 text-center text-slate-400 text-xs">No records match current filters</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length > 20 && (
                <div className="mt-2 text-center text-xs text-slate-400">
                  Showing 20 of {filteredRecords.length} records
                </div>
              )}
            </div>
          </section>
          )}
        </div>
      </div>

      {animalHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Treatment History: {animalHistory}</h3>
              <button onClick={() => setAnimalHistory(null)} className="text-xs px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Close</button>
            </div>
            <div className="space-y-2">
              {getAnimalHistory(animalHistory).length > 0 ? (
                getAnimalHistory(animalHistory).map((r) => (
                  <div key={r.record_id} className={`rounded border p-2 text-xs ${r.status === "safe" ? "border-emerald-500/30 bg-emerald-900/10" : r.status === "not safe" ? "border-rose-500/30 bg-rose-900/10" : "border-amber-500/30 bg-amber-900/10"}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{r.record_id}</span>
                      <span className={`text-[10px] px-2 py-1 rounded ${r.status === "safe" ? "text-emerald-300" : r.status === "not safe" ? "text-rose-300" : "text-amber-300"}`}>{r.status || "pending"}</span>
                    </div>
                    <div><span className="text-slate-400">Drug:</span> {r.drug_name}</div>
                    <div><span className="text-slate-400">Problem:</span> {r.problem || r.symptom}</div>
                    <div><span className="text-slate-400">Date:</span> {r.administration_date}</div>
                    {r.vet_notes && <div className="text-slate-300 mt-1 italic text-[11px]">{r.vet_notes}</div>}
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-300 text-xs">No treatment history</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
