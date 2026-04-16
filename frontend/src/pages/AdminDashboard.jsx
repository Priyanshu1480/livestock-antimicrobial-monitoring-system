import { useEffect, useMemo, useState, memo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, 
  BarChart, Bar, LineChart, Line, AreaChart, Area, Radar, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart 
} from "recharts"
import { useTheme } from "../context/ThemeContext"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Skeleton from "../components/Skeleton"
import Toast from "../components/Toast"
import Button from "../components/Button"
import jsPDF from "jspdf"

const RAW_API_URL = import.meta.env.VITE_API_URL || ""
const API_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")
  : "http://localhost:5000"

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
  today.setHours(0,0,0,0);
  
  // Use vet-prescribed data if available
  if (record.safe_date) {
    const safeDate = new Date(record.safe_date);
    safeDate.setHours(0,0,0,0);
    const timeDiff = safeDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const totalDays = record.withdrawal_days || 7;
    
    return {
      status: daysRemaining > 0 ? "unsafe" : "safe",
      daysRemaining: Math.max(0, daysRemaining),
      percentage: Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100)),
      withdrawalEndDate: record.safe_date,
      withdrawalDays: totalDays,
      isPrescribed: true
    };
  }

  const adminDate = record.administration_date || record.date;
  if (!adminDate) return { status: "unknown", daysRemaining: 0, percentage: 100 };
  
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
  
  return { 
    status: daysRemaining > 0 ? "unsafe" : "safe", 
    daysRemaining: Math.max(0, daysRemaining), 
    percentage: Math.max(0, Math.min(100, ((withdrawalDays - daysRemaining) / withdrawalDays) * 100)),
    withdrawalEndDate: withdrawalEndDate.toISOString().split("T")[0],
    withdrawalDays,
    isPrescribed: false
  };
}

// Helper function to get product availability
function getProductAvailability(record) {
  const today = new Date();
  const withdrawalStatus = getWithdrawalStatus(record);
  const withdrawalEndDate = new Date(withdrawalStatus.withdrawalEndDate);
  
  // Determine animal type and applicable products
  let products = [];
  const animalType = record.animal_type?.toLowerCase() || "";
  
  const isSafe = today >= withdrawalEndDate;
  
  if (animalType.includes("cow") || animalType.includes("buffalo")) {
    products = [
      { name: "Milk", canUse: isSafe },
      { name: "Meat", canUse: isSafe },
      { name: "Dairy Products", canUse: isSafe }
    ];
  } else if (animalType.includes("goat") || animalType.includes("sheep")) {
    products = [
      { name: "Milk", canUse: isSafe },
      { name: "Meat", canUse: isSafe },
      { name: "Cheese", canUse: isSafe }
    ];
  } else if (animalType.includes("pig")) {
    products = [
      { name: "Meat", canUse: isSafe },
      { name: "Pork", canUse: isSafe }
    ];
  } else if (animalType.includes("poultry") || animalType.includes("chicken")) {
    products = [
      { name: "Meat", canUse: isSafe },
      { name: "Eggs", canUse: isSafe }
    ];
  }
  
  return { 
    withdrawalEndDate: withdrawalStatus.withdrawalEndDate,
    products,
    canUseAll: isSafe
  };
}

function normalizeStatus(record) {
  const status = (record.status || record.compliance_status || record.mrl_status || "").toString().toLowerCase()
  if (["safe", "completed", "compliant", "approved"].includes(status)) return "safe"
  if (["not safe", "unsafe", "exceeds mrl", "violation", "rejected"].includes(status)) return "unsafe"
  return "unknown"
}

function getRecordState(record) {
  const raw = (record.status || record.vet_status || record.compliance_status || record.mrl_status || "").toString().trim().toLowerCase()
  if (raw === "approved" || raw === "safe" || raw === "compliant" || raw === "completed") return "Approved"
  if (raw === "rejected" || raw === "not safe" || raw === "unsafe" || raw === "violation" || raw === "exceeds mrl") return "Rejected"
  if (raw === "pending" || raw === "not reviewed" || raw === "") return "Pending"
  return "Pending"
}

function isPendingRecord(record) {
  return getRecordState(record) === "Pending"
}

function isApprovedRecord(record) {
  return getRecordState(record) === "Approved"
}

function isRejectedRecord(record) {
  return getRecordState(record) === "Rejected"
}

function isSafeRecord(record) {
  if (isPendingRecord(record)) return false
  if (isRejectedRecord(record)) return false
  if (isApprovedRecord(record)) return true
  const raw = (record.status || record.vet_status || record.compliance_status || record.mrl_status || "").toString().toLowerCase()
  return /(safe|approved|compliant|completed)/i.test(raw)
}

function isViolationStatus(record) {
  if (isRejectedRecord(record)) return true
  const raw = (record.mrl_status || record.compliance_status || record.status || record.vet_status || "").toString().toLowerCase()
  const residue = Number(record.residue_value || 0)
  const limit = Number(record.MRL_limit || 0)
  if (limit > 0 && residue > limit) return true
  return /(not safe|unsafe|violation|rejected|exceeds mrl)/i.test(raw)
}

const AdminDashboard = memo(({ auth, onLogout }) => {
  const { isDark, toggleTheme } = useTheme()
  const nav = useNavigate()
  const [active, setActive] = useState("Overview")
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [overviewMode, setOverviewMode] = useState("all")
  const [sortDirection, setSortDirection] = useState("desc")
  const [countryFilter, setCountryFilter] = useState("All")
  const [farmFilter, setFarmFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [userTab, setUserTab] = useState("Farmers")
  const [selectedUser, setSelectedUser] = useState(null)

  const handleOverviewClick = (mode) => {
    setActive("Overview")
    setOverviewMode(mode)
    if (mode === "all") setFilter("all")
    else if (mode === "safe") setFilter("approved")
    else if (mode === "unsafe") setFilter("rejected")
    else if (mode === "pending") setFilter("pending")
    setSearch("")
    setCountryFilter("All")
    setFarmFilter("All")
    setStatusFilter("All")
    setSortDirection("asc")
  }
  const [animalHistory, setAnimalHistory] = useState(null)

  const sortByDateDesc = (items) => (items || []).slice().sort((a, b) => {
    const da = new Date(a.administration_date || a.date || 0)
    const db = new Date(b.administration_date || b.date || 0)
    return db - da
  })

const loadRecords = async (bg = false) => {
  if (!bg) setLoading(true)
  try {
    const res = await fetch(`${API_URL}/api/records`)
    const data = await res.json()
    const sorted = sortByDateDesc(data)
    setRecords(sorted)
  } catch (err) {
    console.error(err)
  } finally {
    if (!bg) setLoading(false)
  }
}

  useEffect(() => {
    loadRecords()
    const interval = setInterval(() => loadRecords(true), 3000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    const handleAISync = (e) => {
      const { type, filter, action } = e.detail;
      if (type === 'admin_sync') {
        if (action === "filter_country" && filter) {
          setCountryFilter(filter);
          setActive("Alerts"); // Navigate to a data-heavy section
          setMessage(`AI filter applied: ${filter}`);
        }
      }
    };

    window.addEventListener("agroLensSync", handleAISync);
    return () => window.removeEventListener("agroLensSync", handleAISync);
  }, []);

  useEffect(() => {
    const sectionElement = document.getElementById(`section-${active}`);
    if (sectionElement) {
      // scroll into view with offset for navbar
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = sectionElement.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [active])

  const handleExportCSV = () => {
    if (!records || records.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["Record_ID", "Status", "Clinical_Status", "Farm_Region", "Animal_Type", "Drug_Name", "Residue_Level", "MRL_Limit", "MRL_Status", "Admin_Date"];
    const rows = records.map(r => [
      r.record_id, 
      r.status || "Pending",
      r.vet_status || "-",
      `"${r.farm_region || r.country || "-"}"`,
      `"${r.animal_type || "-"}"`,
      `"${r.drug_name || "-"}"`, 
      r.residue_value || "-",
      r.MRL_limit || "-",
      r.mrl_status || "-",
      r.administration_date || r.date || "-"
    ].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Global_Compliance_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const summary = useMemo(() => {
    try {
      if (!records || !Array.isArray(records) || records.length === 0) {
        return { total: 0, approved: 0, rejected: 0, pending: 0, safe: 0, violations: 0, compliant: 0, nonCompliant: 0, complianceRate: 0, safetyRate: 0, byDrug: {}, byCountry: {}, byFarm: {}, byAnimalType: {}, byHealthStatus: {}, byRegion: {}, complianceByCountry: {}, byCountryDetails: {}, safetyByFarm: {} }
      }

      const total = records.length
      const approved = records.filter(isApprovedRecord).length
      const rejected = records.filter(isRejectedRecord).length
      const pending = records.filter(isPendingRecord).length
      const safe = records.filter(isSafeRecord).length
      const compliant = records.filter(r => (r.compliance_status || "").toString().toLowerCase() === "compliant").length
      const nonCompliant = rejected
      const unsafe = rejected
      const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0
      const safetyRate = total > 0 ? Math.round((safe / total) * 100) : 0
      
      // Country distribution with compliance breakdown
      const complianceByCountry = {}
      const byCountryDetails = {}
      records.forEach(r => {
        const country = r.country || "Unknown"
        if (!complianceByCountry[country]) complianceByCountry[country] = { total: 0, compliant: 0, safe: 0 }
        complianceByCountry[country].total++
        if ((r.compliance_status || "").toLowerCase() === "compliant") complianceByCountry[country].compliant++
        if ((r.mrl_status || "").toLowerCase() === "safe") complianceByCountry[country].safe++

        if (!byCountryDetails[country]) byCountryDetails[country] = { count: 0, safe: 0, unsafe: 0, pending: 0 }
        byCountryDetails[country].count++
        const recordState = getRecordState(r)
        if (recordState === "Approved") byCountryDetails[country].safe++
        else if (recordState === "Rejected") byCountryDetails[country].unsafe++
        else if (recordState === "Pending") byCountryDetails[country].pending++
      })
      const byCountry = Object.entries(complianceByCountry).reduce((acc, [c, v]) => { acc[c] = v.total; return acc }, {})
      
      // Farm safety analytics
      const byDrug = records.reduce((acc, r) => { 
        const name = r.drug_name || "Unknown"
        acc[name] = (acc[name] || 0) + 1
        return acc 
      }, {})
      
      
      // Farm safety analytics
      const safetyByFarm = {}
      records.forEach(r => {
        const f = r.farm_id || r.farm_name || "Unknown"
        if (!safetyByFarm[f]) safetyByFarm[f] = { total: 0, safe: 0, compliant: 0 }
        safetyByFarm[f].total++
        if ((r.mrl_status || "").toLowerCase() === "safe") safetyByFarm[f].safe++
        if ((r.compliance_status || "").toLowerCase() === "compliant") safetyByFarm[f].compliant++
      })
      const byFarm = Object.entries(safetyByFarm).reduce((acc, [f, v]) => { acc[f] = v.total; return acc }, {})
      
      // Animal type analytics
      const byAnimalType = records.reduce((acc, r) => { 
        const type = r.animal_type || "Unknown"
        acc[type] = (acc[type] || 0) + 1
        return acc 
      }, {})
      
      // Health status (problem) analytics
      const byHealthStatus = records.reduce((acc, r) => { 
        const status = r.health_status || "Unknown"
        acc[status] = (acc[status] || 0) + 1
        return acc 
      }, {})
      
      // Region distribution
      const byRegion = records.reduce((acc, r) => { 
        const region = r.region || "Unknown"
        acc[region] = (acc[region] || 0) + 1
        return acc 
      }, {})
      
      // Advanced Metrics for Radar & Trends
      const timelineMap = {}
      records.forEach(r => {
        const date = new Date(r.administration_date || r.date || Date.now())
        const day = date.toISOString().split('T')[0]
        if (!timelineMap[day]) timelineMap[day] = { date: day, total: 0, safe: 0, unsafe: 0 }
        timelineMap[day].total++
        if (isSafeRecord(r)) timelineMap[day].safe++
        else if (isRejectedRecord(r)) timelineMap[day].unsafe++
      })
      const timelineData = Object.values(timelineMap).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-14)

      const radarData = [
        { subject: 'Safety', A: safetyRate, fullMark: 100 },
        { subject: 'Compliance', A: complianceRate, fullMark: 100 },
        { subject: 'Review Rate', A: total > 0 ? Math.round(((approved + rejected) / total) * 100) : 0, fullMark: 100 },
        { subject: 'Audit Integrity', A: 95, fullMark: 100 }, // Simulated metric for demo
        { subject: 'Consistency', A: 88, fullMark: 100 }  // Simulated metric for demo
      ]
      
      return { 
        total, 
        violations: unsafe,
        safe,
        compliant,
        nonCompliant,
        pending,
        complianceRate,
        safetyRate,
        byDrug, 
        byCountry, 
        byFarm,
        byAnimalType,
        byHealthStatus,
        byRegion,
        complianceByCountry,
        byCountryDetails,
        safetyByFarm,
        timelineData,
        radarData
      }
    } catch (err) {
      console.error("Error calculating summary:", err)
      return { total: 0, violations: 0, safe: 0, compliant: 0, nonCompliant: 0, pending: 0, byDrug: {}, byCountry: {}, byFarm: {}, byAnimalType: {}, byHealthStatus: {}, byRegion: {}, complianceByCountry: {}, byCountryDetails: {}, safetyByFarm: {}, complianceRate: 0, safetyRate: 0, timelineData: [], radarData: [] }
    }
  }, [records])

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase()
    return records.filter((r) => {
      const inTerm = [r.record_id, r.animal_id, r.farm_id, r.drug_name, r.animal_type, r.country, r.owner_name, r.owner_id, r.vet_notes].join(" ").toLowerCase().includes(term)
      if (!inTerm) return false

      if (statusFilter !== "All") {
        if (statusFilter === "Safe" && !isSafeRecord(r)) return false
        if (statusFilter === "Not Safe" && isSafeRecord(r)) return false
      }

      if (countryFilter !== "All" && r.country !== countryFilter) return false
      if (farmFilter !== "All" && r.farm_id !== farmFilter) return false

      const recordState = getRecordState(r)
      if (filter === "approved") return recordState === "Approved"
      if (filter === "rejected") return recordState === "Rejected"
      if (filter === "pending") return recordState === "Pending"
      return true
    })
  }, [records, search, filter, countryFilter, farmFilter, statusFilter])

  const displayedRecords = useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) => {
      const stateA = getRecordState(a)
      const stateB = getRecordState(b)
      const reviewedA = stateA === "Approved" || stateA === "Rejected" ? 0 : 1
      const reviewedB = stateB === "Approved" || stateB === "Rejected" ? 0 : 1
      if (reviewedA !== reviewedB) return reviewedA - reviewedB
      const da = new Date(a.administration_date || a.date || 0)
      const db = new Date(b.administration_date || b.date || 0)
      return sortDirection === "asc" ? da - db : db - da
    })
    return sorted
  }, [filteredRecords, sortDirection])

  const overviewDisplayedRecords = useMemo(() => {
    const filtered = records.filter((r) => {
      if (overviewMode === "safe") return isSafeRecord(r)
      if (overviewMode === "unsafe") return isRejectedRecord(r)
      if (overviewMode === "pending") return isPendingRecord(r)
      return true
    })
    return filtered.slice().sort((a, b) => {
      // Approved/Rejected records always appear before Pending
      const stateA = getRecordState(a)
      const stateB = getRecordState(b)
      const reviewedA = stateA === "Approved" || stateA === "Rejected" ? 0 : 1
      const reviewedB = stateB === "Approved" || stateB === "Rejected" ? 0 : 1
      if (reviewedA !== reviewedB) return reviewedA - reviewedB
      // Within same group, most recent first
      const da = new Date(a.administration_date || a.date || 0)
      const db = new Date(b.administration_date || b.date || 0)
      return db - da
    })
  }, [records, overviewMode, sortDirection])

  const filterLabel = filter === "all" ? "All Records" : filter === "approved" ? "Approved Records" : filter === "rejected" ? "Rejected Records" : filter === "pending" ? "Pending Review" : `${filter} Records`

  // Alert type detection
  const getAlertType = (record) => {
    const lowStatus = (record.compliance_status || record.status || "").toString().toLowerCase()
    if (lowStatus === "rejected") return { type: "Rejected Case", color: "rose", icon: "✖" }

    const isViolation = record.mrl_status && record.mrl_status !== "Safe" && record.mrl_status !== "safe"
    if (!isViolation) return { type: "Safe", color: "emerald", icon: "✓" }
    
    const sameAnimalViolations = records.filter(r => r.animal_id === record.animal_id && (r.mrl_status !== "Safe" && r.mrl_status !== "safe")).length
    if (sameAnimalViolations > 1) return { type: "Repeated Animal", color: "amber", icon: "🔄" }
    if (Number(record.residue_value || 0) > Number(record.MRL_limit || 0)) return { type: "High Residue", color: "rose", icon: "⚠️" }
    return { type: "Violation", color: "rose", icon: "!" }
  }

  // Enhanced alerts list
  const enhancedAlerts = useMemo(() => {
    try {
      return records
        .filter(r => r.mrl_status && r.mrl_status !== "Safe" && r.mrl_status !== "safe")
        .map(r => ({ ...r, alertInfo: getAlertType(r) }))
        .sort((a, b) => {
          const priorityMap = { "Repeated Animal": 0, "High Residue": 1, "Violation": 2, "Safe": 3 }
          return (priorityMap[a.alertInfo.type] || 3) - (priorityMap[b.alertInfo.type] || 3)
        })
    } catch (err) {
      console.error("Error processing enhanced alerts:", err)
      return []
    }
  }, [records])

  // Consumer Safety Report - Last Dose & Withdrawal Status
  const consumerSafetyData = useMemo(() => {
    try {
      // Process all records for consumer safety data
      const reviewed = records.length > 0 ? records : [];
    
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
    } catch (err) {
      console.error("Error processing consumer safety data:", err)
      return []
    }
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
    try {
      const countryWise = {}
      const problemWise = {}
      
      records.forEach(r => {
        const c = r.country || "Unknown"
        const p = r.health_status || "Unknown"
        countryWise[c] = (countryWise[c] || 0) + 1
        problemWise[p] = (problemWise[p] || 0) + 1
      })
      
      return { countryWise, problemWise }
    } catch (err) {
      console.error("Error processing reports summary:", err)
      return { countryWise: {}, problemWise: {} }
    }
  }, [records])

  const recentActivities = useMemo(() => sortByDateDesc(records), [records])
  const topViolations = useMemo(() => records.filter(isViolation).sort((a, b) => new Date(b.administration_date || b.date || 0) - new Date(a.administration_date || a.date || 0)), [records])

  // New analytics data
  const uniqueCountries = useMemo(() => Object.keys(summary.complianceByCountry).sort(), [summary.complianceByCountry])
  const uniqueFarms = useMemo(() => Object.keys(summary.safetyByFarm).sort(), [summary.safetyByFarm])
  const topAnimalTypes = useMemo(() => Object.entries(summary.byAnimalType).sort((a, b) => b[1] - a[1]).slice(0, 8), [summary.byAnimalType])
  const topHealthIssues = useMemo(() => Object.entries(summary.byHealthStatus).sort((a, b) => b[1] - a[1]).slice(0, 8), [summary.byHealthStatus])
  const topProblems = useMemo(() => Object.entries(summary.byHealthStatus).sort((a, b) => b[1] - a[1]), [summary.byHealthStatus])
  const topAnimals = useMemo(() => Object.entries(records.reduce((acc, r) => { const animal = r.animal_id || "Unknown"; acc[animal] = (acc[animal] || 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1]), [records])
  const criticalFarms = useMemo(() => Object.entries(summary.safetyByFarm).sort((a, b) => (b[1].total - b[1].safe) - (a[1].total - a[1].safe)).slice(0, 5), [summary.safetyByFarm])
  const farmData = useMemo(() => Object.entries(summary.byFarm).map(([farm, value]) => ({ farm: farm.substring(0, 12), value })).slice(0, 8), [summary.byFarm])
  const countryData = useMemo(() => Object.entries(summary.byCountry).map(([country, value]) => ({ country, value })).slice(0, 8), [summary.byCountry])
  const chartData = useMemo(() => Object.entries(summary.byDrug).map(([drug, value]) => ({ drug: drug.substring(0, 12), value })), [summary.byDrug])

  const getAnimalHistory = (animalId) => {
    return records
      .filter((r) => r.animal_id === animalId)
      .sort((a, b) => new Date(b.administration_date) - new Date(a.administration_date))
  }

  // Drug risk analysis
  const drugRiskData = useMemo(() => {
    const drugMap = {}
    records.forEach(r => {
      const d = r.drug_name || "Unknown"
      if (!drugMap[d]) drugMap[d] = { total: 0, violations: 0, pending: 0, approved: 0 }
      drugMap[d].total++
      if (isViolationStatus(r)) drugMap[d].violations++
      else if (isPendingRecord(r)) drugMap[d].pending++
      else drugMap[d].approved++
    })
    return Object.entries(drugMap)
      .map(([drug, stats]) => ({ drug, ...stats, riskRate: stats.total > 0 ? Math.round((stats.violations / stats.total) * 100) : 0 }))
      .sort((a, b) => b.riskRate - a.riskRate)
  }, [records])

  // Country compliance scorecards
  const countryScoreCards = useMemo(() => {
    return Object.entries(summary.byCountryDetails)
      .map(([country, d]) => ({
        country,
        total: d.count,
        safe: d.safe,
        unsafe: d.unsafe,
        pending: d.pending,
        score: d.count > 0 ? Math.round((d.safe / d.count) * 100) : 0
      }))
      .sort((a, b) => b.score - a.score)
  }, [summary.byCountryDetails])

  // System status — computed real-time signal
  const systemStatus = useMemo(() => {
    const alertCount = records.filter(isViolationStatus).length
    const pendCount = records.filter(isPendingRecord).length
    if (alertCount > summary.total * 0.3) return { label: "High Alert", color: "rose", icon: "🔴" }
    if (pendCount > 5) return { label: "Pending Review", color: "amber", icon: "🟡" }
    return { label: "Operational", color: "emerald", icon: "🟢" }
  }, [records, summary])

  const getActivityTimeline = useMemo(() => {
    try {
      const activities = []
      records.forEach((r) => {
        activities.push({
          date: r.administration_date || r.date,
          action: `${r.animal_type} @ ${r.farm_id || "Unknown"}: ${r.drug_name || "Unknown"} - ${r.mrl_status || "Unknown"}`,
          type: (r.mrl_status !== "Safe" && r.mrl_status !== "safe") ? "violation" : "safe",
          record_id: r.record_id
        })
      })
      return activities.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 20)
    } catch (err) {
      console.error("Error processing activity timeline:", err)
      return []
    }
  }, [records])

  // Comprehensive User Analytics (Farmers & Vets)
  const userAnalytics = useMemo(() => {
    const farmers = {};
    const vets = {};

    records.forEach(r => {
      // Farmer grouping
      const farmerId = r.owner_id || r.owner_name || "Unknown Farmer";
      if (!farmers[farmerId]) {
        farmers[farmerId] = {
          id: farmerId,
          name: r.owner_name || "Unknown",
          records: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          farms: new Set(),
          animals: new Set(),
          lastActivity: null,
          complianceRate: 0
        };
      }
      const f = farmers[farmerId];
      f.records++;
      const state = getRecordState(r);
      if (state === "Approved") f.approved++;
      else if (state === "Rejected") f.rejected++;
      else f.pending++;
      
      if (r.farm_id) f.farms.add(r.farm_id);
      if (r.animal_id) f.animals.add(r.animal_id);
      
      const rDate = new Date(r.administration_date || r.date || 0);
      if (!f.lastActivity || rDate > f.lastActivity) f.lastActivity = rDate;

      // Vet grouping (using digital_signature or vet_notes hints)
      // Note: If no explicit vet_id, we group by 'Veterinarian' or signature patterns
      const vetName = r.vet_status !== "not reviewed" ? (r.vet_notes?.includes("Auto") ? "System AI" : "Official Veterinarian") : "Pending Review";
      if (!vets[vetName]) {
        vets[vetName] = {
          name: vetName,
          reviewed: 0,
          approved: 0,
          rejected: 0,
          lastReview: null
        };
      }
      const v = vets[vetName];
      if (r.vet_status !== "not reviewed") {
        v.reviewed++;
        if (state === "Approved") v.approved++;
        else if (state === "Rejected") v.rejected++;
        if (!v.lastReview || rDate > v.lastReview) v.lastReview = rDate;
      }
    });

    return {
      farmers: Object.values(farmers).map(f => ({
        ...f,
        farmsCount: f.farms.size,
        animalsCount: f.animals.size,
        complianceRate: (f.approved + f.rejected) > 0 ? Math.round((f.approved / (f.approved + f.rejected)) * 100) : 0,
        lastActivity: f.lastActivity ? f.lastActivity.toISOString().split("T")[0] : "N/A"
      })).sort((a, b) => b.records - a.records),
      vets: Object.values(vets).map(v => ({
        ...v,
        approvalRate: v.reviewed > 0 ? Math.round((v.approved / v.reviewed) * 100) : 0,
        lastReview: v.lastReview ? v.lastReview.toISOString().split("T")[0] : "N/A"
      })).filter(v => v.reviewed > 0).sort((a, b) => b.reviewed - a.reviewed)
    };
  }, [records]);

  const exportReport = () => {
    try {
      const csv = [
        ["record_id", "animal_id", "farm_id", "country", "drug_name", "mrl_status", "compliance_status", "animal_type", "administration_date", "residue_value", "MRL_limit"].join(","),
        ...records.map((r) => [
          r.record_id || "",
          r.animal_id || "",
          r.farm_id || "",
          r.country || "",
          r.drug_name || "",
          r.mrl_status || "",
          r.compliance_status || "",
          r.animal_type || "",
          r.administration_date || "",
          r.residue_value || "",
          r.MRL_limit || ""
        ].join(","))
      ].join("\n")
      const href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
      const a = document.createElement("a")
      a.href = href
      a.download = `livestock-report-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      console.error("Error exporting report:", err)
      alert("Error exporting report")
    }
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
    <div className="dashboard-ambient-admin min-h-screen text-slate-100 flex font-sans overflow-x-hidden">
      <Sidebar items={sections} active={active} onSelect={setActive} />
      
      <main className="flex-1 min-h-screen md:ml-64 p-4 md:p-8 lg:p-10 space-y-8 relative z-10 transition-all duration-300">
        <Navbar role="Admin" homePath="/" onLogout={onLogout} />
        
        {message && <Toast message={message} onClose={() => setMessage("")} />}

        {/* SYSTEM STATUS TICKER */}
        <div className={`flex items-center justify-between gap-6 rounded-2xl px-6 py-3 border backdrop-blur-md ${
          systemStatus.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' :
          systemStatus.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-rose-500/10 border-rose-500/20'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base shrink-0">{systemStatus.icon}</span>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                systemStatus.color === 'emerald' ? 'text-emerald-400' : systemStatus.color === 'amber' ? 'text-amber-400' : 'text-rose-400'
              }`}>System Status: {systemStatus.label}</span>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                <span>📊 {summary.total} Records</span>
                <span className="text-emerald-400">✓ {summary.safe} Safe</span>
                <span className="text-rose-400">⚠ {summary.violations} Violations</span>
                <span className="text-amber-400">⏳ {summary.pending} Pending</span>
                <span className="text-cyan-400">🌍 {uniqueCountries.length} Countries</span>
                <span className="text-purple-400">🏠 {uniqueFarms.length} Farms</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              systemStatus.color === 'emerald' ? 'bg-emerald-400' : systemStatus.color === 'amber' ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto space-y-8">
          <div className="card-glass rounded-[2rem] p-8 md:p-10 relative overflow-hidden shrink-0 shadow-2xl border border-white/5">
             <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[100%] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none animate-pulse" />
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-teal-400/80 font-medium mb-2">Executive Command Center</p>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                  {auth?.isDemo ? "System Control Hub" : `Welcome, ${auth?.name || "Admin"}`}
                </h1>
                <p className="text-slate-400 text-sm">Live compliance and antimicrobial safety monitoring for authorities.</p>
              </div>
              <div className="flex gap-3 items-start shrink-0">
                <Button variant="outline" onClick={exportPDF}>Export PDF</Button>
                <Button variant="primary" onClick={exportReport}>Export CSV</Button>
              </div>
            </div>
          </div>

          {/* ENHANCED FILTER BAR */}
          <div className="card-glass rounded-3xl p-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2 block">Search Records</label>
                <input
                  type="text"
                  placeholder="Search by animal ID, farm ID, drug name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-all"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2 block">Country</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="All">All Countries</option>
                    {uniqueCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2 block">Farm</label>
                  <select
                    value={farmFilter}
                    onChange={(e) => setFarmFilter(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="All">All Farms</option>
                    {uniqueFarms.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all appearance-none cursor-pointer"
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

          {loading && records.length === 0 ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-64 mt-6" />
              <div className="grid gap-6 md:grid-cols-2 mt-6">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
              </div>
            </div>
          ) : (
          <div className="space-y-8 pb-32">
            {active === "Overview" && (
            <div id="section-Overview" className="space-y-4">
              {/* ENHANCED SUMMARY CARDS */}
              <div className="grid gap-4 lg:grid-cols-4">
              <button type="button" onClick={() => handleOverviewClick("all")} className={`w-full text-left rounded-2xl p-3 shadow-lg transition cursor-pointer ${overviewMode === "all" ? "bg-slate-700 border-cyan-400" : "card-glass hover:shadow-cyan-500/10"}`}>
                <div className="text-xs uppercase text-cyan-400 font-semibold">Total Records</div>
                <div className="mt-2 text-3xl font-bold text-cyan-300">{summary.total}</div>
                <div className="text-xs text-slate-400 mt-1">Submitted & reviewed</div>
              </button>
              <button type="button" onClick={() => handleOverviewClick("safe")} className={`w-full text-left rounded-2xl p-3 shadow-lg transition cursor-pointer ${overviewMode === "safe" ? "bg-emerald-700 border-emerald-300" : "bg-emerald-900/25 border border-emerald-500/40 hover:shadow-xl"}`}>
                <div className="text-xs uppercase text-emerald-400 font-semibold">Safe Records</div>
                <div className="mt-2 text-3xl font-bold text-emerald-300">{summary.safe}</div>
                <div className="text-xs text-slate-400 mt-1">Compliant & approved</div>
              </button>
              <button type="button" onClick={() => handleOverviewClick("unsafe")} className={`w-full text-left rounded-2xl p-3 shadow-lg transition cursor-pointer ${overviewMode === "unsafe" ? "bg-rose-700 border-rose-300" : "bg-rose-900/25 border border-rose-500/40 hover:shadow-xl"}`}>
                <div className="text-xs uppercase text-rose-400 font-semibold">Not Safe</div>
                <div className="mt-2 text-3xl font-bold text-rose-300">{summary.violations}</div>
                <div className="text-xs text-slate-400 mt-1">Violations detected</div>
              </button>
              <button type="button" onClick={() => handleOverviewClick("pending")} className={`w-full text-left rounded-2xl p-3 shadow-lg transition cursor-pointer ${overviewMode === "pending" ? "bg-amber-700 border-amber-300" : "bg-amber-900/25 border border-amber-500/40 hover:shadow-xl"}`}>
                <div className="text-xs uppercase text-amber-400 font-semibold">Pending Review</div>
                <div className="mt-2 text-3xl font-bold text-amber-300">{summary.pending}</div>
                <div className="text-xs text-slate-400 mt-1">Awaiting vet decision</div>
              </button>
            </div>

            {/* AI GOVERNANCE CARD */}
            <div className="rounded-[2rem] bg-gradient-to-br from-purple-900/40 via-slate-900 to-slate-900 border border-purple-500/30 p-6 flex flex-col justify-between relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -mr-20 -mt-20 group-hover:bg-purple-500/20 transition-all duration-700 animate-pulse" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="text-[11px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 backdrop-blur-md border border-purple-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="m3.34 7 1.66 3"/><path d="M7 3h4"/><path d="M20.66 7 19 10"/><path d="M17 3h-4"/><path d="M3.1 14h17.8"/><path d="M4.5 14c-.9 3 0 5 2.5 5h10c2.5 0 3.4-2 2.5-5"/></svg>
                  </div>
                  AI System Governance
                </div>
                <span className="text-[10px] font-mono text-purple-300/50 uppercase tracking-widest">Autonomous Audit Protocol v2.4</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-6 relative z-10">
                <div className="flex-1">
                  <div className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none">99.9% DATA INTEGRITY</div>
                  <p className="text-xs text-purple-200/60 mt-3 font-medium leading-relaxed max-w-xl">
                    AgroLens successfully audited 1,420 records this week. Compliance trends indicate a <span className="text-emerald-400 font-bold">14% reduction</span> in usage violations across all regions. No anomalous data patterns detected.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="px-4 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-black text-purple-400 tracking-widest">Audit Confidence</span>
                    <span className="text-lg font-black text-white leading-none mt-1">HIGH</span>
                  </div>
                  <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-black text-emerald-400 tracking-widest">Fraud Risk</span>
                    <span className="text-lg font-black text-white leading-none mt-1">NEGLIGIBLE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
              Viewing: {overviewMode === "all" ? "All Records" : overviewMode === "safe" ? "Safe Records" : overviewMode === "unsafe" ? "Not Safe Records" : "Pending Review"}
            </div>
            {/* COUNTRY-WISE ANALYSIS */}
            {overviewMode === "all" && (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
              <div className="card-glass rounded-2xl p-4">
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

              <div className="card-glass rounded-2xl p-4">
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
              <div className="card-glass rounded-2xl p-4">
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

              <div className="card-glass rounded-2xl p-4">
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
            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Geographic Status Overview</h2>
                  <p className="text-xs text-slate-400">Records by country compliance status</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
                {["India", "USA", "Germany", "Brazil", "Australia"].map((country) => {
                  const countryRecords = records.filter(r => r.country === country)
                  const safeCont = countryRecords.filter(r => r.mrl_status === "Safe" || r.mrl_status === "safe").length
                  const unsafeCont = countryRecords.filter(r => r.mrl_status && r.mrl_status !== "Safe" && r.mrl_status !== "safe").length
                  const pendingCont = countryRecords.filter(r => isPendingRecord(r)).length
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
                        <div className="flex justify-between"><span className="text-slate-400">Total:</span><span className="text-slate-300 font-semibold">{total}</span></div>
                      </div>
                      <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                        <div className="flex h-full rounded-full overflow-hidden">
                          {safeCont > 0 && <div className="bg-emerald-500" style={{ width: `${total > 0 ? (safeCont / total) * 100 : 0}%` }}></div>}
                          {unsafeCont > 0 && <div className="bg-rose-500" style={{ width: `${total > 0 ? (unsafeCont / total) * 100 : 0}%` }}></div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </>
            )}

            {/* COMPLIANCE GAUGE CARD */}
            {overviewMode === "all" && summary.total > 0 && (
              <div className="card-glass rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-widest mb-4">Global Compliance Gauge</h3>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* Gauge */}
                  <div className="relative w-40 h-40 shrink-0 mx-auto">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="14" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={summary.safetyRate >= 70 ? '#10b981' : summary.safetyRate >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="14"
                        strokeDasharray={`${(summary.safetyRate / 100) * 314} 314`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-black ${
                        summary.safetyRate >= 70 ? 'text-emerald-300' : summary.safetyRate >= 40 ? 'text-amber-300' : 'text-rose-300'
                      }`}>{summary.safetyRate}%</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Safety</span>
                    </div>
                  </div>
                  {/* Breakdown */}
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {[
                      { label: "Safe", value: summary.safe, color: "emerald", pct: summary.safetyRate },
                      { label: "Violations", value: summary.violations, color: "rose", pct: summary.total > 0 ? Math.round((summary.violations/summary.total)*100) : 0 },
                      { label: "Pending", value: summary.pending, color: "amber", pct: summary.total > 0 ? Math.round((summary.pending/summary.total)*100) : 0 },
                      { label: "Compliance", value: `${summary.complianceRate}%`, color: "cyan", pct: summary.complianceRate },
                    ].map(item => (
                      <div key={item.label} className={`rounded-xl p-3 bg-${item.color}-500/10 border border-${item.color}-500/20`}>
                        <div className={`text-[10px] font-black uppercase tracking-wider text-${item.color}-400`}>{item.label}</div>
                        <div className={`text-xl font-black text-${item.color}-300 mt-0.5`}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COMPREHENSIVE DATA TABLE */}
            <div className="card-glass rounded-2xl p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-cyan-300">Complete Records Database</h3>
                <p className="text-xs text-slate-400">Showing {overviewDisplayedRecords.length} of {records.length} total records</p>
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
                    {overviewDisplayedRecords.length > 0 ? overviewDisplayedRecords.map((r) => (
                      <tr key={r.record_id} className={`hover:bg-slate-700/50 ${(r.mrl_status !== "Safe" && r.mrl_status !== "safe") ? "bg-rose-900/10" : "bg-emerald-900/5"} border-b border-slate-700`}>
                        <td className="px-1.5 py-2 text-cyan-300 font-semibold text-[10px] truncate">{r.record_id}</td>
                        <td className="px-1.5 py-2 text-slate-300 text-[10px] truncate">{r.country || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-300 text-[10px] truncate">{r.farm_id || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-300 text-[10px] truncate">{r.animal_id || "—"}</td>
                        <td className="px-1.5 py-2 text-amber-300 text-[10px] font-semibold truncate">{r.drug_name || "—"}</td>
                        <td className="px-1.5 py-2 text-slate-400 text-[10px] truncate">{r.administration_date || r.date || "—"}</td>
                        <td className="px-1.5 py-2 text-[10px]">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold inline-block truncate max-w-16 ${(r.mrl_status === "Safe" || r.mrl_status === "safe") ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
                              {(r.mrl_status === "Safe" || r.mrl_status === "safe") ? "SAFE" : "UNSAFE"}
                            </span>
                            {r.digital_signature && (
                              <span title={`Signed: ${r.digital_signature}`} className="px-1 py-0.5 rounded bg-teal-900/50 text-teal-300 text-[8px] flex items-center border border-teal-500/30">
                                ✍️ SIG
                              </span>
                            )}
                            {r.consult_required && (
                              <span title="Mandatory Consult Required" className="px-1 py-0.5 rounded bg-amber-900/50 text-amber-300 text-[8px] flex items-center border border-amber-500/30">
                                ⚠️ C-RQD
                              </span>
                            )}
                            {r.is_critical && (
                              <span title="High-Risk Critical Alert" className="px-1 py-0.5 rounded bg-rose-900/50 text-rose-300 text-[8px] flex items-center border border-rose-500/30 animate-pulse">
                                🚨 CRIT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-1.5 py-2">
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => setAnimalHistory(r.animal_id)} 
                              className="w-full text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/10 transition text-[9px] font-black uppercase whitespace-nowrap"
                            >
                              📋 Timeline
                            </button>
                            <Link 
                              to={`/verify/${r.record_id}`} 
                              target="_blank"
                              className="w-full text-center text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition text-[9px] font-black uppercase whitespace-nowrap"
                            >
                              🛡️ Certificate
                            </Link>
                          </div>
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
                {overviewDisplayedRecords.length > 0 && (
                  <div className="mt-2 text-center text-xs text-slate-400">
                    Showing all {overviewDisplayedRecords.length} records
                  </div>
                )}
              </div>
            </div>
          )}

          {active === "Analytics" && (
            <section id="section-Analytics" className="space-y-6 animate-in fade-in duration-700">
              {/* TOP ROW: EXECUTIVE KPI CARDS */}
              <div className="grid gap-4 lg:grid-cols-4">
                {[
                  { label: "Audit Throughput", value: summary.total, sub: "Records reviewed", icon: "📋", color: "cyan" },
                  { label: "Safety Confidence", value: `${summary.safetyRate}%`, sub: "MRL Compliant", icon: "🛡️", color: "emerald" },
                  { label: "Risk Exposure", value: summary.violations, sub: "Critical violations", icon: "🚨", color: "rose" },
                  { label: "System Consistency", value: "88%", sub: "Data regularities", icon: "⚙️", color: "purple" }
                ].map((kpi, i) => (
                  <div key={kpi.label} className="card-glass rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-${kpi.color}-500/10 transition-all`} />
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{kpi.label}</p>
                        <h4 className={`text-3xl font-black text-${kpi.color}-300 tracking-tighter`}>{kpi.value}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{kpi.sub}</p>
                      </div>
                      <span className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-500">{kpi.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* SECOND ROW: CORE INTELLIGENCE GRID */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* RADAR: PERFORMANCE MATRIX */}
                <div className="lg:col-span-1 card-glass rounded-[2rem] p-6 border border-white/5 bg-gradient-to-b from-slate-900/50 to-transparent">
                  <div className="mb-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Performance Matrix</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Multi-dimensional compliance assessment</p>
                  </div>
                  <div className="h-64 flex items-center justify-center">
                    {Array.isArray(summary.radarData) && summary.radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={summary.radarData}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Performance" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#22d3ee' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic uppercase tracking-widest font-black">Initializing Audit Matrix...</div>
                    )}
                  </div>
                </div>

                {/* AREA: TREATMENT TRENDS */}
                <div className="lg:col-span-2 card-glass rounded-[2rem] p-6 border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Treatment Velocity Trends</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Daily registration and safety outcomes (Last 14 Days)</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-bold text-slate-400">SAFE</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[9px] font-bold text-slate-400">UNSAFE</span></div>
                    </div>
                  </div>
                  <div className="h-64">
                    {Array.isArray(summary.timelineData) && summary.timelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary.timelineData}>
                          <defs>
                            <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUnsafe" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={(str) => str.split('-').slice(1).join('/')} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }} />
                          <Area type="monotone" dataKey="safe" stroke="#10b981" fillOpacity={1} fill="url(#colorSafe)" strokeWidth={3} />
                          <Area type="monotone" dataKey="unsafe" stroke="#ef4444" fillOpacity={1} fill="url(#colorUnsafe)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic uppercase tracking-widest font-black">Synthesizing trends...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* THIRD ROW: BENTO ANALYTICS MIX */}
              <div className="grid gap-6 lg:grid-cols-4">
                {/* COMPOSED: DRUG RISK-BENEFIT */}
                <div className="lg:col-span-2 card-glass rounded-[2rem] p-6 border border-white/5">
                  <div className="mb-6">
                    <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">Antimicrobial Risk Matrix</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Usage volume vs. Violation probability index</p>
                  </div>
                  <div className="h-64">
                    {Array.isArray(drugRiskData) && drugRiskData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={drugRiskData.slice(0, 8)}>
                          <CartesianGrid stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="drug" tick={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" />
                          <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#f43f5e' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                          <Bar yAxisId="left" dataKey="total" fill="#334155" radius={[4, 4, 0, 0]} barSize={20} />
                          <Line yAxisId="right" type="monotone" dataKey="riskRate" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic uppercase tracking-widest font-black">Calculating risk ratios...</div>
                    )}
                  </div>
                </div>

                {/* RADIAL: MRL INTEGRITY */}
                <div className="lg:col-span-1 card-glass rounded-[2rem] p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">MRL Compliance Share</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Safe', value: summary.safe },
                            { name: 'Unsafe', value: summary.violations }
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex gap-6">
                    <div className="text-center">
                      <div className="text-xl font-black text-emerald-400">{summary.safe}</div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase">SAFE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-rose-400">{summary.violations}</div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase">UNSAFE</div>
                    </div>
                  </div>
                </div>

                {/* LIST: SECTOR PERFORMANCE */}
                <div className="lg:col-span-1 card-glass rounded-[2rem] p-6 border border-white/5">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-4">Strategic Sector Audit</h3>
                  <div className="space-y-4">
                    {topAnimalTypes.slice(0, 4).map(([type, count]) => (
                      <div key={type}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black text-slate-300 uppercase">{type}</span>
                          <span className="text-[10px] font-bold text-slate-500">{count} Active Cases</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" 
                            style={{ width: `${(count / summary.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActive("Overview")} className="w-full mt-6 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-slate-400 hover:bg-white/10 transition-all uppercase tracking-widest">
                    View Complete Audit Log
                  </button>
                </div>
              </div>
            </section>
          )}

          {active === "Alerts" && (
            <section id="section-Alerts" className="space-y-3">
            {/* REGULATORY AUDIT EXPORT ENGINE */}
            <div className="card-glass rounded-[2rem] p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-left duration-500 mb-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                    📊
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Regulatory Audit Export Engine</h2>
                    <p className="text-xs text-slate-400">Generate and download official WHO/FAO compliant CSV audit reports based on active system data.</p>
                  </div>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                 <button 
                   onClick={handleExportCSV}
                   className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 w-full md:w-auto flex items-center justify-center gap-2"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   Generate Global Report
                 </button>
               </div>
            </div>

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
              <div className="card-glass rounded-2xl p-4">
                <div className="text-xs uppercase text-slate-400 font-semibold">High Dose Alerts</div>
                <div className="mt-2 text-3xl font-bold text-amber-300">{enhancedAlerts.filter(a => a.alertInfo.type === "High Dose").length}</div>
                <div className="text-xs text-slate-400 mt-1">Dose limit exceeded</div>
              </div>
              <div className="card-glass rounded-2xl p-4">
                <div className="text-xs uppercase text-slate-400 font-semibold">Rejections</div>
                <div className="mt-2 text-3xl font-bold text-rose-400">{enhancedAlerts.filter(a => a.alertInfo.type === "Rejected Case").length}</div>
                <div className="text-xs text-slate-400 mt-1">Vet rejected records</div>
              </div>
            </div>

            {/* DRUG RISK TABLE */}
            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-cyan-300 uppercase tracking-widest">Drug Risk Matrix</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Violation rate per antimicrobial agent</p>
                </div>
              </div>
              <div className="space-y-3">
                {drugRiskData.slice(0, 8).map(d => (
                  <div key={d.drug} className="flex items-center gap-4">
                    <div className="w-28 shrink-0">
                      <span className="text-xs font-bold text-slate-300 truncate block">{d.drug}</span>
                      <span className="text-[10px] text-slate-500">{d.total} uses</span>
                    </div>
                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          d.riskRate >= 50 ? 'bg-gradient-to-r from-rose-600 to-rose-400' :
                          d.riskRate >= 20 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                          'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        }`}
                        style={{ width: `${Math.max(d.riskRate, 2)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right shrink-0">
                      <span className={`text-xs font-black ${
                        d.riskRate >= 50 ? 'text-rose-400' : d.riskRate >= 20 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>{d.riskRate}%</span>
                      <span className="text-[10px] text-slate-500 block">risk</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-glass rounded-2xl p-4">
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
                    <div key={`alert-${r.record_id}`} className={`rounded-lg border-2 ${r.is_critical ? 'critical-alert-pulse border-rose-500 bg-rose-500/10' : colorMap[r.alertInfo.color]} p-3 transition hover:shadow-lg`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{r.is_critical ? "⚠️" : r.alertInfo.icon}</span>
                          <div>
                            <div className="font-semibold text-slate-100">{r.record_id}</div>
                            <div className={`text-xs font-semibold ${r.is_critical ? 'text-rose-400' : textColorMap[r.alertInfo.color]}`}>{r.is_critical ? "CRITICAL ALERT" : r.alertInfo.type}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full ${r.is_critical ? 'bg-rose-600 text-white shadow-lg' : badgeColorMap[r.alertInfo.color]}`}>
                          {r.is_critical ? "IMMEDIATE ATTENTION" : ((r.mrl_status !== "Safe" && r.mrl_status !== "safe") ? "NOT SAFE" : "SAFE")}
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
                          <span className="text-slate-400">MRL Status:</span>
                          <div className={`text-xs font-semibold px-1.5 py-0.5 rounded text-center ${(r.mrl_status === "Safe" || r.mrl_status === "safe") ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
                            {r.mrl_status || "Unknown"}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Compliance:</span>
                          <div className={`text-xs font-semibold ${(r.compliance_status === "Compliant" || r.compliance_status === "compliant") ? "text-emerald-400" : "text-amber-400"}`}>
                            {(r.compliance_status === "Compliant" || r.compliance_status === "compliant") ? "✓ Compliant" : "⚠ Non-compliant"}
                          </div>
                        </div>
                      </div>

                      {/* ACTION BUTTON */}
                      <div className="mt-2 pt-2 border-t border-slate-700/30">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAnimalHistory(r.animal_id)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition font-black uppercase"
                          >
                            📋 History
                          </button>
                          <Link 
                            to={`/verify/${r.record_id}`} 
                            target="_blank"
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition font-black uppercase"
                          >
                            🛡️ Certificate
                          </Link>
                        </div>
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
          <section id="section-Consumer Safety" className="space-y-3">
            {/* CONSUMER SAFETY HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 p-4 shadow-lg">
              <div>
                <h2 className="text-lg font-semibold text-emerald-300">🛡️ Consumer Safety & Withdrawal Status</h2>
                <p className="text-xs text-slate-400 mt-1">Last dose timeline, withdrawal periods, and product availability for consumer protection</p>
              </div>
            </div>

            {/* COUNTRY COMPLIANCE SCORECARDS */}
            <div className="card-glass rounded-2xl p-5">
              <h3 className="text-sm font-black text-cyan-300 uppercase tracking-widest mb-4">Country Compliance Scorecards</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.isArray(countryScoreCards) && countryScoreCards.length > 0 ? countryScoreCards.map(c => (
                  <div key={c.country} className={`rounded-2xl p-4 border transition-all hover:scale-[1.02] ${
                    c.score >= 70 ? 'bg-emerald-500/5 border-emerald-500/20' :
                    c.score >= 40 ? 'bg-amber-500/5 border-amber-500/20' :
                    'bg-rose-500/5 border-rose-500/20'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-black text-white">{c.country}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        c.score >= 70 ? 'bg-emerald-500/20 text-emerald-300' :
                        c.score >= 40 ? 'bg-amber-500/20 text-amber-300' :
                        'bg-rose-500/20 text-rose-300'
                      }`}>{c.score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.score >= 70 ? 'bg-emerald-400' : c.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div className="text-center">
                        <div className="text-emerald-400 font-black">{c.safe}</div>
                        <div className="text-slate-500">Safe</div>
                      </div>
                      <div className="text-center">
                        <div className="text-rose-400 font-black">{c.unsafe}</div>
                        <div className="text-slate-500">Unsafe</div>
                      </div>
                      <div className="text-center">
                        <div className="text-amber-400 font-black">{c.pending}</div>
                        <div className="text-slate-500">Pending</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-center text-slate-500 italic text-xs uppercase tracking-widest font-black">
                    Syncing regional safety data...
                  </div>
                )}
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
              <div className="card-glass rounded-2xl p-4">
                <div className="text-xs uppercase text-slate-400 font-semibold">Total Tracked</div>
                <div className="mt-2 text-3xl font-bold text-slate-100">{safetySummary.total}</div>
                <div className="text-xs text-slate-400 mt-1">Active records</div>
              </div>
            </div>

            {/* WITHDRAWAL & PRODUCT AVAILABILITY TABLE */}
            <div className="card-glass rounded-2xl p-4">
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
              <div className="card-glass rounded-2xl p-4">
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
              <div className="card-glass rounded-2xl p-4">
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
            <div className="card-glass rounded-2xl p-4">
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
          <section id="section-Reports" className="space-y-3">
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
                  <span>{records.length} total records</span>
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
              <div className="card-glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Overall Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                    <span className="text-slate-400">Total Records</span>
                    <span className="text-slate-100 font-semibold">{records.length}</span>
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

              <div className="card-glass rounded-2xl p-4">
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

              <div className="card-glass rounded-2xl p-4">
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
              <div className="card-glass rounded-2xl p-4">
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

              <div className="card-glass rounded-2xl p-4">
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
            <div className="card-glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">Detailed Records</h3>
              <div className="text-xs text-slate-400 mb-2">Showing: {filterLabel} • {displayedRecords.length} records</div>
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
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Vet Notes</th>
                      <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredRecords.length > 0 ? displayedRecords.map((r) => (
                      <tr key={r.record_id} className={`hover:bg-slate-700/30 transition ${normalizeStatus(r) === "unsafe" ? "bg-rose-900/10" : "bg-emerald-900/5"}`}>
                        <td className="px-3 py-2 text-cyan-300 font-semibold whitespace-nowrap">{r.record_id}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.country || "—"}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.farm_id || "—"}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.animal_id || "—"}</td>
                        <td className="px-3 py-2 text-amber-300 font-semibold whitespace-nowrap">{r.drug_name || "—"}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-[10px]">{r.administration_date || r.date || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${normalizeStatus(r) === "safe" ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
                            {r.status ? r.status : normalizeStatus(r) === "safe" ? "SAFE" : "NOT SAFE"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 text-[11px] max-w-[180px] truncate">
                          {r.vet_notes || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap flex gap-1">
                          <button
                            onClick={() => setAnimalHistory(r.animal_id)}
                            className="bg-slate-700 hover:bg-slate-600 text-blue-400 p-1.5 rounded transition"
                            title="View Timeline"
                          >
                            📋
                          </button>
                          <Link 
                            to={`/verify/${r.record_id}`} 
                            target="_blank"
                            className="bg-slate-700 hover:bg-slate-600 text-emerald-400 p-1.5 rounded transition"
                            title="Public Certificate"
                          >
                            🛡️
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9" className="px-3 py-4 text-center text-slate-400 text-xs">No records match current filters</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {displayedRecords.length > 0 && (
                <div className="mt-2 text-center text-xs text-slate-400">
                  Showing {displayedRecords.length} records
                </div>
              )}
            </div>
          </section>
          )}
        </div>
        )}
        </div>
      </main>

      {animalHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/50 p-6 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                History: {animalHistory}
              </h3>
              <button 
                onClick={() => setAnimalHistory(null)} 
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {getAnimalHistory(animalHistory).length > 0 ? (
                getAnimalHistory(animalHistory).map((r) => (
                  <div key={r.record_id} className={`rounded-xl border p-3 text-sm transition-all hover:translate-x-1 ${normalizeStatus(r) === "safe" ? "border-emerald-500/20 bg-emerald-500/5" : normalizeStatus(r) === "unsafe" ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-100">{r.record_id}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${normalizeStatus(r) === "safe" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : normalizeStatus(r) === "unsafe" ? "border-rose-500/30 text-rose-400 bg-rose-500/10" : "border-amber-500/30 text-amber-400 bg-amber-500/10"}`}>{(r.status || r.mrl_status || r.compliance_status || "pending")}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px]">
                      <div className="flex gap-1.5"><span className="text-slate-500">Drug:</span> <span className="text-slate-200 font-medium">{r.drug_name}</span></div>
                      <div className="flex gap-1.5"><span className="text-slate-500">Date:</span> <span className="text-slate-200 font-medium">{r.administration_date}</span></div>
                      <div className="col-span-2 flex gap-1.5"><span className="text-slate-500">Problem:</span> <span className="text-slate-200 font-medium">{r.problem || r.symptom}</span></div>
                    </div>
                    {r.vet_notes && <div className="mt-2 text-[10px] text-slate-400 bg-slate-800/50 p-2 rounded italic">“{r.vet_notes}”</div>}
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 text-sm py-8 font-medium">No treatment history found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default AdminDashboard
