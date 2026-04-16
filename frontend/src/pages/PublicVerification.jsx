import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

const RAW_API_URL = import.meta.env.VITE_API_URL || ""
const API_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")
  : "http://localhost:5000"

const PublicVerification = () => {
  const { id } = useParams()
  const { isDark } = useTheme()
  const [cert, setCert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const role = localStorage.getItem("selectedRole") || ""
  const isVet = role === "Veterinarian"

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to REVOKE this safety certificate? This will invalidate the record globally.")) return;
    try {
      const res = await fetch(`${API_URL}/api/records/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected" })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to revoke certificate");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/verify/${id}`)
        if (!res.ok) throw new Error("Certificate not found or expired")
        const data = await res.json()
        setCert(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCert()
  }, [id])

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  )

  if (error) return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900`}>
      <div className="text-6xl mb-4 text-rose-500">⚠</div>
      <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-rose-600">UNVERIFIED DATA NODE</h2>
      <p className="text-slate-500 text-center max-w-sm mb-6">The certificate ID <b>{id}</b> could not be validated against the AgroLens global registry. Please contact the producer for a valid safety record.</p>
      <Link to="/" className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all">Portal Home</Link>
    </div>
  )

  const isSafe = cert.mrl_status?.toLowerCase() === "safe" || cert.status === "Approved"
  const today = new Date().toISOString().slice(0, 10)
  const isPastWithdrawal = cert.safe_date ? today >= cert.safe_date : true
  const fullyVerified = isSafe && isPastWithdrawal

  return (
    <div className={`min-h-screen p-4 md:p-10 flex flex-col items-center bg-slate-200 font-serif`}>
      {/* NAVIGATION CONTROLS */}
      <div className="max-w-xl w-full flex justify-between items-center mb-6 no-print">
        <button 
          onClick={() => window.history.length > 2 ? window.history.back() : window.close()} 
          className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 bg-white shadow-sm"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          {isVet && fullyVerified && (
            <button 
              onClick={handleRevoke}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-black shadow-lg hover:scale-105 transition-all outline-none"
            >
              ⚠️ REVOKE CERTIFICATE
            </button>
          )}
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-black shadow-lg hover:scale-105 transition-all outline-none"
          >
            🖨️ PRINT OFFICIAL COPY
          </button>
        </div>
      </div>

      {isVet && (
        <div className="max-w-[800px] w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-sm no-print">
          <div className="flex items-start gap-4">
            <div className="text-2xl">🩺</div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">Veterinarian Audit Terminal Active</h3>
              <p className="text-xs text-amber-700 font-medium mb-3">You are viewing this public record in diagnostic mode. The following internal clinical notes are shielded from public view.</p>
              
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Internal Diagnostic Notes</span>
                <p className="text-sm text-slate-700 italic">“{cert.vet_notes || "No clinical notes provided for this record."}”</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THE ACTUAL CERTIFICATE */}
      <div className={`cert-container max-w-[800px] w-full bg-white relative p-1 leading-tight shadow-2xl overflow-hidden print:shadow-none print:m-0`}>
        {/* Certificate Border Decoration */}
        <div className="border-[12px] border-double border-slate-900 p-6 md:p-10 min-h-max md:aspect-[1/1.414] print:aspect-[1/1.414] flex flex-col relative">
          
          {/* Header Section */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-6">
               <div className="w-20 h-20 border-4 border-slate-900 flex items-center justify-center text-3xl font-black text-slate-900 relative">
                 AL
                 <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
               </div>
            </div>
            <h1 className="text-[2.5rem] font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Certificate of Food Safety</h1>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">Official Clearance & Residue Audit</h2>
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className="h-[2px] w-12 bg-slate-300"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticated by AgroLens Monitoring Network</span>
              <span className="h-[2px] w-12 bg-slate-300"></span>
            </div>
          </div>

          {/* Identification Grid */}
          <div className="grid grid-cols-2 gap-10 mb-6 border-y-2 border-slate-100 py-6">
            <div className="space-y-4">
              <section>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Livestock Identification</div>
                <div className="text-xl font-black text-slate-900 italic">#{cert.token_number}</div>
                <div className="text-[10px] text-slate-500 font-bold">Animal ID Ref: <span className="text-slate-800">{cert.animal_id}</span></div>
              </section>
              <section>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Specie / Breed</div>
                <div className="text-xl font-black text-slate-900 uppercase tracking-tighter">{cert.animal_type}</div>
              </section>
            </div>
            <div className="space-y-4">
              <section className="flex gap-8">
                <div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Biometric Age</div>
                   <div className="text-xl font-black text-slate-900">{cert.age_months} <span className="text-xs uppercase text-slate-400">mo</span></div>
                </div>
                <div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Carcass Weight</div>
                   <div className="text-xl font-black text-slate-900">{cert.weight_kg || "—"} <span className="text-xs uppercase text-slate-400">kg</span></div>
                </div>
              </section>
              <section>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin Node</div>
                <div className="text-xl font-black text-slate-900 uppercase tracking-tighter">{cert.farm_name}</div>
                <div className="text-[10px] text-slate-500 font-bold">{cert.farm_region} Global Export Region</div>
              </section>
            </div>
          </div>

          {/* Residue Analysis Section */}
          <div className="mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-[2px] bg-slate-900"></span>
              Residue Analysis Report
            </h3>
            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-center overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rotate-45 translate-x-16 -translate-y-16"></div>
               <div className="flex-1 w-full">
                  <div className="text-[9px] text-slate-400 font-black uppercase mb-3">Antimicrobial Detection</div>
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-lg font-black text-slate-800 uppercase italic tracking-tight">{cert.drug_name}</span>
                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${cert.residue_value <= cert.MRL_limit ? "border-emerald-500 text-emerald-600 bg-emerald-50 shadow-sm" : "border-rose-500 text-rose-600 bg-rose-50"}`}>
                       MRL Status: {cert.residue_value <= cert.MRL_limit ? "CLEARED" : "RESTRICTED"}
                     </div>
                  </div>
                  <div className="flex gap-10">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Detected Level</div>
                      <div className="text-xl font-black text-slate-900">{cert.residue_value} <span className="text-[10px] text-slate-400 uppercase font-black">mg/kg</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Legal Limit (MRL)</div>
                      <div className="text-xl font-black text-slate-900">{cert.MRL_limit} <span className="text-[10px] text-slate-400 uppercase font-black">mg/kg</span></div>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className={`cert-status-banner rounded-[2rem] px-8 py-5 text-center mb-4 border-4 ${fullyVerified ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-rose-600 bg-rose-600 text-white'} shadow-xl`}>
             <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-3 opacity-90">Safety Verdict</div>
             <div className="text-4xl font-black tracking-tighter mb-1 uppercase italic">
               {fullyVerified ? "Clear for Consumption" : "Prohibited for Sale"}
             </div>
             <div className="text-xs font-bold opacity-80 uppercase tracking-widest">
                Safe Harvest Date: {cert.safe_date || "N/A"}
             </div>
          </div>

          {/* Signature & Stamp Section */}
          <div className="flex justify-between items-end mt-auto pt-6 border-t-2 border-slate-100">
             <div className="space-y-4">
                <div className="w-48 border-b-2 border-slate-900 pb-2">
                   <div className="font-serif italic text-2xl text-slate-800 select-none pointer-events-none">
                     {cert.digital_signature ? "Dr. S. Veterinary" : "PENDING_APPROVAL"}
                   </div>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   Authorized Veterinarian Signature <br />
                   <span className="text-slate-900">ID: {cert.certificate_id.slice(0, 8).toUpperCase()}</span>
                </div>
             </div>

             {/* CIRCULAR VET STAMP */}
             <div className="relative group no-print-force">
                <div className={`w-32 h-32 rounded-full border-4 ${fullyVerified ? 'border-rose-700/60' : 'border-slate-500/40'} flex flex-col items-center justify-center text-center p-2 rotate-[-15deg] transition-all`}>
                   <div className={`text-[8px] font-black uppercase tracking-tighter ${fullyVerified ? 'text-rose-700/60' : 'text-slate-500/40'}`}>Veterinary Authority</div>
                   <div className={`font-black text-sm uppercase my-1 ${fullyVerified ? 'text-rose-700/60' : 'text-slate-500/40'}`}>
                      {fullyVerified ? "APPROVED" : "HOLD"}
                   </div>
                   <div className={`text-[8px] font-bold ${fullyVerified ? 'text-rose-700/60' : 'text-slate-500/40'}`}>OFFICIAL SEAL</div>
                   <div className={`mt-1 text-[7px] font-black ${fullyVerified ? 'text-rose-700/60' : 'text-slate-500/40'}`}>AgroLens SafeFood Node #82</div>
                </div>
             </div>
          </div>

          {/* Footer Metadata */}
          <div className="mt-8 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] space-y-2">
             <p>Chain Verification: {cert.certificate_id}</p>
             <p>System Timestamp: {new Date(cert.verified_at).toLocaleString()}</p>
             <p className="pt-4 border-t border-slate-100 max-w-sm mx-auto opacity-50">
               This is a digital safety certificate generated via automated MRL audit. Verify original on agrolens.io/verify/{id}
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicVerification
