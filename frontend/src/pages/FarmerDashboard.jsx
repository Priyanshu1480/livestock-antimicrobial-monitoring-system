import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Loading from "../components/Loading"

const sidebarItems = ["Add New Treatment", "My Records", "Dose Guide"]
const STEP_LABELS = ["Select Location", "Select Animal", "Choose Treatment", "Review & Submit"]

// Expanded hierarchical location data with realistic farm names
const COUNTRY_DATA = {
  India: {
    farms: ["Maharaj Dairy Farm", "Green Valley Farms", "Punjab Modern Farm", "Coastal Livestock", "Highland Pastoral"],
    farmCodes: { "Maharaj Dairy Farm": "FARM001", "Green Valley Farms": "FARM002", "Punjab Modern Farm": "FARM003", "Coastal Livestock": "FARM004", "Highland Pastoral": "FARM005" },
    region: "South Asia"
  },
  USA: {
    farms: ["Prairie Cattle Co", "Midwest Modern Ranch", "Silicon Valley Organics", "Texas Big Sky", "Florida Pasture Lands"],
    farmCodes: { "Prairie Cattle Co": "FARM101", "Midwest Modern Ranch": "FARM102", "Silicon Valley Organics": "FARM103", "Texas Big Sky": "FARM104", "Florida Pasture Lands": "FARM105" },
    region: "North America"
  },
  Germany: {
    farms: ["Bayern Alpine Farm", "North Plains Cooperative", "Rheinland Biotech", "Bavaria Green", "Prussian Heritage"],
    farmCodes: { "Bayern Alpine Farm": "FARM201", "North Plains Cooperative": "FARM202", "Rheinland Biotech": "FARM203", "Bavaria Green": "FARM204", "Prussian Heritage": "FARM205" },
    region: "Europe"
  },
  Brazil: {
    farms: ["Amazon Cattle Ranch", "Cerrado Modern", "São Paulo Organic", "Minas Gerais Traditional", "Rio Verde Sustainable"],
    farmCodes: { "Amazon Cattle Ranch": "FARM301", "Cerrado Modern": "FARM302", "São Paulo Organic": "FARM303", "Minas Gerais Traditional": "FARM304", "Rio Verde Sustainable": "FARM305" },
    region: "South America"
  },
  Australia: {
    farms: ["Outback Station", "Melbourne Modern", "Sydney Coastal Ranch", "Queensland Green", "Perth Pastoral"],
    farmCodes: { "Outback Station": "FARM401", "Melbourne Modern": "FARM402", "Sydney Coastal Ranch": "FARM403", "Queensland Green": "FARM404", "Perth Pastoral": "FARM405" },
    region: "Oceania"
  }
}

const FARM_ANIMALS = {
  FARM001: [{ id: "COW001", name: "Dairy Cow - Bessie", type: "Cow" }, { id: "COW002", name: "Dairy Cow - Daisy", type: "Cow" }, { id: "GOAT001", name: "Goat - Billy", type: "Goat" }, { id: "SHEEP001", name: "Sheep - Woolly", type: "Sheep" }, { id: "BUFFALO001", name: "Buffalo - Big Bob", type: "Buffalo" }],
  FARM002: [{ id: "BUFFALO002", name: "Buffalo - Taurus", type: "Buffalo" }, { id: "COW003", name: "Dairy Cow - Molly", type: "Cow" }, { id: "GOAT002", name: "Goat - Nanny", type: "Goat" }, { id: "PIG001", name: "Pig - Porky", type: "Pig" }, { id: "POULTRY001", name: "Chicken - Hen", type: "Poultry" }],
  FARM003: [{ id: "PIG002", name: "Pig - Hamlet", type: "Pig" }, { id: "POULTRY002", name: "Turkey - Tom", type: "Poultry" }, { id: "SHEEP002", name: "Sheep - Fluffy", type: "Sheep" }, { id: "GOAT003", name: "Goat - Gerty", type: "Goat" }, { id: "BUFFALO003", name: "Buffalo - Raj", type: "Buffalo" }],
  FARM004: [{ id: "COW101", name: "Dairy Cow - Princess", type: "Cow" }, { id: "GOAT101", name: "Goat - Patches", type: "Goat" }, { id: "SHEEP101", name: "Sheep - Floss", type: "Sheep" }, { id: "PIG101", name: "Pig - Peppy", type: "Pig" }, { id: "BUFFALO101", name: "Buffalo - Bear", type: "Buffalo" }],
  FARM005: [{ id: "POULTRY101", name: "Duck - Quackers", type: "Poultry" }, { id: "SHEEP102", name: "Sheep - Curly", type: "Sheep" }, { id: "COW102", name: "Dairy Cow - Bella", type: "Cow" }, { id: "GOAT102", name: "Goat - Penny", type: "Goat" }, { id: "BUFFALO102", name: "Buffalo - Storm", type: "Buffalo" }],
  FARM101: [{ id: "COW201", name: "Beef Cow - Thunder", type: "Cow" }, { id: "COW202", name: "Beef Cow - Lightning", type: "Cow" }, { id: "GOAT201", name: "Goat - Ranch", type: "Goat" }, { id: "BUFFALO201", name: "Buffalo - Ranger", type: "Buffalo" }, { id: "SHEEP201", name: "Sheep - Scout", type: "Sheep" }],
  FARM102: [{ id: "SHEEP202", name: "Sheep - Ranger", type: "Sheep" }, { id: "PIG201", name: "Pig - Rustler", type: "Pig" }, { id: "CHICKEN101", name: "Chicken - Cluck", type: "Chicken" }, { id: "GOAT202", name: "Goat - Ranch", type: "Goat" }, { id: "COW203", name: "Beef Cow - Storm", type: "Cow" }],
  FARM103: [{ id: "COW301", name: "Organic Cow - Sunny", type: "Cow" }, { id: "SHEEP301", name: "Sheep - Organic", type: "Sheep" }, { id: "GOAT301", name: "Goat - Organic", type: "Goat" }, { id: "PIG301", name: "Pig - Organic", type: "Pig" }, { id: "POULTRY301", name: "Chicken - Organic", type: "Poultry" }],
  FARM104: [{ id: "BUFFALO301", name: "Buffalo - Prime", type: "Buffalo" }, { id: "COW302", name: "Beef Cow - Prime", type: "Cow" }, { id: "SHEEP302", name: "Sheep - Prime", type: "Sheep" }, { id: "GOAT302", name: "Goat - Prime", type: "Goat" }, { id: "PIG302", name: "Pig - Prime", type: "Pig" }],
  FARM105: [{ id: "POULTRY302", name: "Chicken - Florida", type: "Poultry" }, { id: "COW303", name: "Dairy Cow - Florida", type: "Cow" }, { id: "GOAT303", name: "Goat - Florida", type: "Goat" }, { id: "BUFFALO302", name: "Buffalo - Florida", type: "Buffalo" }, { id: "SHEEP303", name: "Sheep - Florida", type: "Sheep" }],
  FARM201: [{ id: "COW401", name: "Alpine Cow - Mountain", type: "Cow" }, { id: "GOAT401", name: "Goat - Alpine", type: "Goat" }, { id: "SHEEP401", name: "Sheep - Bayern", type: "Sheep" }, { id: "PIG401", name: "Pig - Alpine", type: "Pig" }, { id: "BUFFALO401", name: "Buffalo - Alpine", type: "Buffalo" }],
  FARM202: [{ id: "SHEEP402", name: "Sheep - North", type: "Sheep" }, { id: "GOAT402", name: "Goat - Plains", type: "Goat" }, { id: "COW402", name: "Dairy Cow - Plains", type: "Cow" }, { id: "POULTRY401", name: "Chicken - Plains", type: "Poultry" }, { id: "PIG402", name: "Pig - Plains", type: "Pig" }],
  FARM203: [{ id: "COW403", name: "Organic Cow - Rhine", type: "Cow" }, { id: "SHEEP403", name: "Sheep - Biotech", type: "Sheep" }, { id: "GOAT403", name: "Goat - Biotech", type: "Goat" }, { id: "BUFFALO402", name: "Buffalo - Biotech", type: "Buffalo" }, { id: "POULTRY402", name: "Chicken - Biotech", type: "Poultry" }],
  FARM204: [{ id: "COW404", name: "Dairy Cow - Green", type: "Cow" }, { id: "GOAT404", name: "Goat - Green", type: "Goat" }, { id: "SHEEP404", name: "Sheep - Green", type: "Sheep" }, { id: "PIG403", name: "Pig - Green", type: "Pig" }, { id: "BUFFALO403", name: "Buffalo - Green", type: "Buffalo" }],
  FARM205: [{ id: "POULTRY403", name: "Chicken - Prussian", type: "Poultry" }, { id: "COW405", name: "Heritage Cow - Prussian", type: "Cow" }, { id: "SHEEP405", name: "Sheep - Heritage", type: "Sheep" }, { id: "GOAT405", name: "Goat - Heritage", type: "Goat" }, { id: "BUFFALO404", name: "Buffalo - Heritage", type: "Buffalo" }],
  FARM301: [{ id: "BUFFALO501", name: "Buffalo - Amazon", type: "Buffalo" }, { id: "COW501", name: "Cattle - Amazon", type: "Cow" }, { id: "GOAT501", name: "Goat - Amazon", type: "Goat" }, { id: "PIG501", name: "Pig - Amazon", type: "Pig" }, { id: "POULTRY501", name: "Chicken - Amazon", type: "Poultry" }],
  FARM302: [{ id: "COW502", name: "Modern Cattle - Cerrado", type: "Cow" }, { id: "SHEEP501", name: "Sheep - Cerrado", type: "Sheep" }, { id: "GOAT502", name: "Goat - Cerrado", type: "Goat" }, { id: "PIG502", name: "Pig - Cerrado", type: "Pig" }, { id: "BUFFALO502", name: "Buffalo - Cerrado", type: "Buffalo" }],
  FARM303: [{ id: "COW503", name: "Organic Cow - São Paulo", type: "Cow" }, { id: "SHEEP502", name: "Sheep - Organic", type: "Sheep" }, { id: "GOAT503", name: "Goat - Organic", type: "Goat" }, { id: "POULTRY502", name: "Chicken - Organic", type: "Poultry" }, { id: "PIG503", name: "Pig - Organic", type: "Pig" }],
  FARM304: [{ id: "COW504", name: "Traditional Cattle - Minas", type: "Cow" }, { id: "GOAT504", name: "Goat - Traditional", type: "Goat" }, { id: "SHEEP503", name: "Sheep - Traditional", type: "Sheep" }, { id: "BUFFALO503", name: "Buffalo - Traditional", type: "Buffalo" }, { id: "PIG504", name: "Pig - Traditional", type: "Pig" }],
  FARM305: [{ id: "COW505", name: "Sustainable Cattle - Rio", type: "Cow" }, { id: "GOAT505", name: "Goat - Sustainable", type: "Goat" }, { id: "SHEEP504", name: "Sheep - Sustainable", type: "Sheep" }, { id: "BUFFALO504", name: "Buffalo - Sustainable", type: "Buffalo" }, { id: "POULTRY503", name: "Chicken - Sustainable", type: "Poultry" }],
  FARM401: [{ id: "BUFFALO601", name: "Outback Buffalo", type: "Buffalo" }, { id: "COW601", name: "Outback Cattle", type: "Cow" }, { id: "SHEEP601", name: "Merino Sheep", type: "Sheep" }, { id: "GOAT601", name: "Goat - Outback", type: "Goat" }, { id: "PIG601", name: "Pig - Outback", type: "Pig" }],
  FARM402: [{ id: "COW602", name: "Modern Cattle - Melbourne", type: "Cow" }, { id: "GOAT602", name: "Goat - Melbourne", type: "Goat" }, { id: "SHEEP602", name: "Sheep - Melbourne", type: "Sheep" }, { id: "BUFFALO602", name: "Buffalo - Melbourne", type: "Buffalo" }, { id: "POULTRY601", name: "Chicken - Melbourne", type: "Poultry" }],
  FARM403: [{ id: "COW603", name: "Coastal Cattle - Sydney", type: "Cow" }, { id: "SHEEP603", name: "Sheep - Coastal", type: "Sheep" }, { id: "GOAT603", name: "Goat - Coastal", type: "Goat" }, { id: "PIG602", name: "Pig - Coastal", type: "Pig" }, { id: "BUFFALO603", name: "Buffalo - Coastal", type: "Buffalo" }],
  FARM404: [{ id: "GOAT604", name: "Goat - Queensland", type: "Goat" }, { id: "COW604", name: "Green Cattle - Queensland", type: "Cow" }, { id: "SHEEP604", name: "Sheep - Queensland", type: "Sheep" }, { id: "BUFFALO604", name: "Buffalo - Queensland", type: "Buffalo" }, { id: "POULTRY602", name: "Chicken - Queensland", type: "Poultry" }],
  FARM405: [{ id: "COW605", name: "Pastoral Cattle - Perth", type: "Cow" }, { id: "GOAT605", name: "Goat - Perth", type: "Goat" }, { id: "SHEEP605", name: "Sheep - Perth", type: "Sheep" }, { id: "PIG603", name: "Pig - Perth", type: "Pig" }, { id: "BUFFALO605", name: "Buffalo - Perth", type: "Buffalo" }]
}

const TREATMENT_GUIDE = {
  Fever: ["Paracetamol", "Oxytetracycline"],
  Infection: ["Penicillin", "Amoxicillin"],
  Cough: ["Doxycycline", "Bromhexine"],
  Wound: ["Oxytetracycline", "Gentamicin"],
  Weakness: ["Vitamin B12", "Probiotic"]
}

// Problem-to-Symptom mapping for smart input guidance
const PROBLEM_SYMPTOMS = {
  Lameness: ["Limping", "Difficulty walking", "Leg swelling"],
  Mastitis: ["Swollen udder", "Reduced milk", "Fever with swelling"],
  Diarrhea: ["Loose stools", "Dehydration", "Lethargy"],
  Pneumonia: ["Cough", "Difficulty breathing", "Lethargy", "Fever"],
  "Skin Disease": ["Rashes", "Hair loss", "Scabs", "Itching"]
}

const ANIMAL_TYPES = ["Cow", "Goat", "Sheep", "Pig", "Poultry", "Buffalo", "Chicken"]
const SYMPTOMS = ["Fever", "Infection", "Cough", "Wound", "Weakness"]
const PROBLEMS = ["Lameness", "Mastitis", "Diarrhea", "Pneumonia", "Skin Disease"]

function isViolation(record) {
  const overdose = Number(record.dose_mg_kg) > 35
  const early = record.withdrawal_end_date ? new Date().toISOString().slice(0, 10) < record.withdrawal_end_date : false
  const residue = Number(record.residue_value || 0)
  const overLimit = Number(record.MRL_limit || 50) > 0 ? residue > Number(record.MRL_limit || 50) : false
  return overdose || early || overLimit || record.compliance_status?.toLowerCase() === "violation"
}

const initialModel = { country: "", farmId: "", animalId: "", animalType: "", age: "6", weight: "100", symptom: "", problem: "", date: new Date().toISOString().split("T")[0] }

function FarmerDashboard({ isDark, onThemeToggle }) {
  const nav = useNavigate()
  const [active, setActive] = useState("Add New Treatment")
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [step, setStep] = useState(1)
  const [model, setModel] = useState(initialModel)
  const [showGuide, setShowGuide] = useState(false)
  const [dosageRec, setDosageRec] = useState(null)
  const [dosageLoading, setDosageLoading] = useState(false)

  // Cascading dropdown logic
  const countries = Object.keys(COUNTRY_DATA)
  const farms = model.country ? COUNTRY_DATA[model.country].farms : []
  const farmCodes = model.country ? COUNTRY_DATA[model.country].farmCodes : {}
  const availableFarms = farms.map(farm => ({ name: farm, code: farmCodes[farm] }))
  const availableAnimals = model.farmId && FARM_ANIMALS[model.farmId] ? FARM_ANIMALS[model.farmId] : []

  console.log("Farmer Debug:", { country: model.country, farm: model.farmId, availableAnimals, FARM_ANIMALS });

  const suggestedDrug = dosageRec ? dosageRec.drug : (model.symptom && TREATMENT_GUIDE[model.symptom] ? TREATMENT_GUIDE[model.symptom][0] : "—")
  const recommendedDose = dosageRec ? `${dosageRec.recommendedDose} ${dosageRec.dosageUnit}` : "—"

  const sortByDateDesc = (items) => {
    return (items || []).slice().sort((a, b) => {
      const da = new Date(a.administration_date || a.date || 0)
      const db = new Date(b.administration_date || b.date || 0)
      return db - da
    })
  }

  useEffect(() => {
    fetch("http://localhost:5000/api/records")
      .then(res => res.json())
      .then(data => setRecords(data.slice().reverse()))
      .catch(err => console.log(err));
  }, []);

  // Fetch dosage recommendation when symptom/weight/age changes
  useEffect(() => {
    if (model.symptom && model.weight && model.weight > 0) {
      setDosageLoading(true);
      const params = new URLSearchParams({
        symptom: model.symptom,
        problem: model.problem,
        weight: model.weight,
        age: model.age || "12"
      });
      
      fetch(`http://localhost:5000/api/dosage-recommendation?${params}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDosageRec(data);
          }
        })
        .catch(err => console.log("Dosage fetch error:", err))
        .finally(() => setDosageLoading(false));
    } else {
      setDosageRec(null);
    }
  }, [model.symptom, model.weight, model.age, model.problem]);

  const summary = useMemo(() => {
    const total = records.length
    const recent = records.slice(-4)
    return { total, recent }
  }, [records])

  const latest = useMemo(() => records.slice(-3).reverse(), [records])

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      record_id: `FARM-${Date.now()}`,
      country: model.country,
      farm_id: model.farmId,
      animal_id: model.animalId,
      animal_type: model.animalType,
      age_months: model.age,
      weight_kg: model.weight,
      symptom: model.symptom,
      problem: model.problem,
      drug_name: suggestedDrug,
      recommended_dose: recommendedDose,
      compliance_status: "Pending",
      administration_date: model.date || new Date().toISOString().slice(0, 10),
      status: "pending",
      vet_status: "not reviewed"
    }

    await fetch("http://localhost:5000/api/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
     .then(data => setRecords(data.slice().reverse()))
     .catch(err => console.log(err));

    setModel(initialModel);
    setStep(1);
    setActive("My Records");
    setMessage("✓ Treatment saved successfully!");
  };

  const guideCards = Object.entries(TREATMENT_GUIDE).map(([symptom, drugs]) => (
    <div key={symptom} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
      <div className="font-semibold">{symptom}</div>
      <div className="mt-1 text-slate-300">{drugs.join(" / ")}</div>
    </div>
  ))


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-900 text-slate-100 p-3 md:p-5">
      <Navbar role="Farmer" homePath="/" onLogout={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); nav("/") }} isDark={isDark} onThemeToggle={onThemeToggle} />
      <div className="mt-4 grid gap-3 md:grid-cols-[250px_1fr]">
        <Sidebar items={sidebarItems} active={active} onSelect={setActive} />

        <div className="space-y-3">
          {loading && <Loading />}

          <div className="rounded-3xl border border-emerald-400/20 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-cyan-300">Farm Intelligence</p>
                <h1 className="text-2xl font-bold">Farmer Safety Command</h1>
                <p className="text-slate-300 text-sm">Submit and monitor medication records from your farm.</p>
              </div>
              <div className="flex gap-2">
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs">Treated {summary.total}</div>
                <div className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs">Recent {summary.recent.length}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg"><div className="text-xs uppercase text-slate-400">Total Treatments</div><div className="text-2xl font-bold text-cyan-300">{summary.total}</div></div>
            <div className="rounded-2xl bg-cyan-900/15 border border-cyan-400/30 p-3 shadow-lg"><div className="text-xs uppercase text-cyan-200">Recent</div><div className="text-2xl font-bold text-cyan-300">{summary.recent.length}</div></div>
            <div className="rounded-2xl bg-emerald-900/15 border border-emerald-500/30 p-3 shadow-lg"><div className="text-xs uppercase text-emerald-200">Easy Guide</div><div className="text-2xl font-bold text-emerald-300">Beginner</div></div>
          </div>

          {active === "Add New Treatment" && (
            <section className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">Add New Treatment</h2><p className="text-xs text-slate-300">Step by step guided input.</p></div><span className="text-xs text-cyan-300">Step {step}/4</span></div>
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{STEP_LABELS[step - 1]}</div>
                
                {step === 1 && (
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs uppercase text-slate-300 font-semibold">Country</label>
                      <select value={model.country} onChange={(e) => setModel((p) => ({ ...p, country: e.target.value, farmId: "", animalId: "" }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm">
                        <option value="">Select Country</option>
                        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    
                    {model.country && (
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Farm</label>
                        <select value={model.farmId} onChange={(e) => setModel((p) => ({ ...p, farmId: e.target.value, animalId: "" }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm">
                          <option value="">Select Farm</option>
                          {availableFarms.map((f) => <option key={f.code} value={f.code}>{f.name} ({f.code})</option>)}
                        </select>
                      </div>
                    )}
                    
                    {model.farmId && (
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Animal</label>
                        <select value={model.animalId} onChange={(e) => { const animal = availableAnimals.find(a => a.id === e.target.value); setModel((p) => ({ ...p, animalId: e.target.value, animalType: animal?.type || "" })); }} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm">
                          <option value="">Select Animal</option>
                          {availableAnimals.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                        </select>
                      </div>
                    )}

                    {model.animalId && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-2 text-xs text-emerald-200">
                        ✓ Selected: {model.country} → {model.farmId} → {model.animalId}
                      </div>
                    )}
                  </div>
                )}
                
                {step === 2 && (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Animal Type</label>
                        <input type="text" value={model.animalType} disabled className="rounded-lg border border-slate-600 bg-slate-700 p-2 text-sm text-slate-300" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Treatment Date</label>
                        <input type="date" value={model.date} onChange={(e) => setModel((p) => ({ ...p, date: e.target.value }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Age (months)</label>
                        <input type="number" min="1" value={model.age} onChange={(e) => setModel((p) => ({ ...p, age: e.target.value }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Weight (kg)</label>
                        <input type="number" min="1" value={model.weight} onChange={(e) => setModel((p) => ({ ...p, weight: e.target.value }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
                
                {step === 3 && (
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs uppercase text-slate-300 font-semibold">Problem Type</label>
                      <select value={model.problem} onChange={(e) => setModel((p) => ({ ...p, problem: e.target.value, symptom: "" }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm">
                        <option value="">Select Problem</option>
                        {PROBLEMS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    
                    {model.problem && (
                      <div className="grid gap-2">
                        <label className="text-xs uppercase text-slate-300 font-semibold">Symptom (based on problem)</label>
                        <select value={model.symptom} onChange={(e) => setModel((p) => ({ ...p, symptom: e.target.value }))} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm">
                          <option value="">Select Symptom</option>
                          {PROBLEM_SYMPTOMS[model.problem]?.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <p className="text-xs text-slate-400">Symptoms are tailored to the selected problem</p>
                      </div>
                    )}
                  </div>
                )}
                
                {step === 4 && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-900/10 p-3 space-y-3">
                    <div className="text-sm font-semibold text-cyan-200">Review Treatment Suggestion</div>
                    <div className="space-y-2 text-xs">
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2">
                        <div className="text-slate-400">Location</div>
                        <div className="font-semibold text-white">{model.country} → {model.farmId} → {model.animalId}</div>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2">
                        <div className="text-slate-400">Animal</div>
                        <div className="font-semibold text-white">{model.animalType} (Age: {model.age} mo, Weight: {model.weight}kg)</div>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2">
                        <div className="text-slate-400">Condition</div>
                        <div className="font-semibold text-white">Problem: {model.problem || "—"}</div>
                        <div className="font-semibold text-white">Symptom: {model.symptom || "—"}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-slate-700 bg-slate-900 p-2"><div className="text-slate-400">Suggested Drug</div><div className="text-lg font-semibold text-emerald-300">{suggestedDrug}</div></div>
                        <div className="rounded-lg border border-slate-700 bg-slate-900 p-2"><div className="text-slate-400">Dose</div><div className="text-lg font-semibold text-emerald-300">{recommendedDose}</div></div>
                      </div>
                      {dosageRec && (
                        <>
                          <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-2">
                            <div className="text-slate-300 font-semibold text-[10px] uppercase">Dosage Range (Safe)</div>
                            <div className="mt-1 text-sm font-bold text-amber-300">{dosageRec.dosageRange.min}–{dosageRec.dosageRange.max} {dosageRec.dosageUnit}</div>
                          </div>
                          <div className="rounded-lg border border-orange-500/30 bg-orange-900/10 p-2">
                            <div className="text-slate-300 font-semibold text-[10px] uppercase mb-1">Safety & Compliance</div>
                            <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between"><span className="text-slate-400">Withdrawal Period:</span><span className="text-orange-300 font-semibold">{dosageRec.drugInfo.withdrawal_days} days</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">End Withdrawal:</span><span className="text-orange-300 font-semibold">{dosageRec.drugInfo.withdrawalEndDate}</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">{dosageRec.drugInfo.MRL_limit} µg/kg</span></div>
                            </div>
                            <div className="mt-1.5 text-[10px] text-orange-200 border-t border-orange-500/30 pt-1">
                              ⚠️ {dosageRec.compliance.message}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-3">
                  <button disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))} className="rounded-lg border border-slate-600 px-3 py-2 bg-slate-700 text-xs hover:bg-slate-600 transition">Back</button>
                  {step < 4 ? <button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step === 1 && !model.animalId} className="rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:scale-105 transition disabled:opacity-50">Next</button> : <button onClick={handleSubmit} className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:scale-105 transition">Submit Treatment</button>}
                </div>
                <div className="mt-2"><button type="button" onClick={() => setShowGuide((p) => !p)} className="text-xs text-cyan-300 underline">View Dose Guide →</button></div>
                {showGuide && <div className="mt-2 grid gap-2 md:grid-cols-2">{guideCards}</div>}
              </div>
            </section>
          )}

          {active === "My Records" && (
            <section className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">My Records</h2><p className="text-xs text-slate-300">Recent treatments submitted from your farm.</p></div><span className="text-xs text-cyan-300">{records.length} total</span></div>
              <div className="mt-3 grid gap-2">
                {records.length === 0 ? <div className="text-slate-300 text-xs">No records yet.</div> : records.slice(0, 10).map((r) => (
                  <div key={r.record_id} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-cyan-300">{r.record_id}</div>
                        <div className="text-slate-400 mt-1">{r.country || "—"} → {r.farm_id || "—"} → {r.animal_id || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className={r.compliance_status === "Violation" ? "text-rose-400" : "text-emerald-400"}>{r.compliance_status || "Pending"}</div>
                        <div className="text-slate-400">{r.administration_date || "—"}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-400">Animal:</span> <span className="text-white">{r.animal_type || "—"}</span></div>
                      <div><span className="text-slate-400">Drug:</span> <span className="text-white">{r.drug_name || "—"}</span></div>
                      <div><span className="text-slate-400">Symptom:</span> <span className="text-white">{r.symptom || "—"}</span></div>
                      <div><span className="text-slate-400">Dose:</span> <span className="text-white">{r.recommended_dose || "—"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === "Dose Guide" && (
            <section className="space-y-3">
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                <div>
                  <h2 className="font-semibold text-lg text-cyan-300">Antimicrobial Dosage & Safety Guide</h2>
                  <p className="text-xs text-slate-300 mt-1">Recommended dosages, withdrawal periods, and residue limits per drug. Ensure animal welfare by following guidelines.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-cyan-300 text-sm">Penicillin</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Dosage:</span><span className="text-white font-semibold">20 mg/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Withdrawal:</span><span className="text-amber-300 font-semibold">7 days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">50 µg/kg</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">For bacterial infections in cattle, sheep, goats</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-cyan-300 text-sm">Oxytetracycline</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Dosage:</span><span className="text-white font-semibold">25 mg/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Withdrawal:</span><span className="text-amber-300 font-semibold">5 days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">100 µg/kg</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">Broad-spectrum antibiotic for various infections</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-cyan-300 text-sm">Amoxicillin</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Dosage:</span><span className="text-white font-semibold">15 mg/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Withdrawal:</span><span className="text-amber-300 font-semibold">6 days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">60 µg/kg</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">Beta-lactam antibiotic for respiratory & mastitis</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-cyan-300 text-sm">Enrofloxacin</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Dosage:</span><span className="text-white font-semibold">10 mg/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Withdrawal:</span><span className="text-amber-300 font-semibold">4 days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">30 µg/kg</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">Fluoroquinolone for serious infections</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-cyan-300 text-sm">Doxycycline</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Dosage:</span><span className="text-white font-semibold">22 mg/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Withdrawal:</span><span className="text-amber-300 font-semibold">5 days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">90 µg/kg</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">Tetracycline for respiratory infections</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="font-semibold text-cyan-300 text-sm">Streptomycin</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Dosage:</span><span className="text-white font-semibold">20 mg/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Withdrawal:</span><span className="text-amber-300 font-semibold">7 days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MRL Limit:</span><span className="text-orange-300 font-semibold">80 µg/kg</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">Aminoglycoside for tuberculosis-like infections</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-rose-900/20 to-rose-900/10 border border-rose-500/30 p-4 shadow-lg">
                <h3 className="font-semibold text-rose-300 text-sm mb-2">Critical Safety Information</h3>
                <ul className="space-y-1.5 text-xs text-rose-200">
                  <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Withdrawal Period:</strong> Mandatory rest period before animal can be sold/consumed. Violating this causes residue violations.</span></li>
                  <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>MRL (Maximum Residue Limit):</strong> Safe residue level in food. Exceeding this endangers public health.</span></li>
                  <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Dosage Calculation:</strong> Based on weight (kg) × dosage (mg/kg). Always follow weight accurately.</span></li>
                  <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Age Adjustments:</strong> Young animals (&lt;6 months) may need 20% less; older animals may need 10% less.</span></li>
                  <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span><span><strong>Record Everything:</strong> Keep detailed records of all treatments for regulatory compliance.</span></li>
                </ul>
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
            <h2 className="font-semibold">Quick Insights</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {latest.length === 0 && <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300">No records yet.</div>}
              {latest.map((r) => (
                <div key={`ins-${r.record_id}`} className="rounded-xl border border-cyan-500/20 bg-slate-900 p-2 text-xs">
                  <div className="font-semibold">{r.record_id}</div>
                  <div>{r.animal_id || r.animal_type} • {r.drug_name}</div>
                  <div className={isViolation(r) ? "text-rose-300" : "text-emerald-300"}>{isViolation(r) ? "Violation" : "Safe"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Treatment Timeline</h3><span className="text-xs text-slate-300">Latest entries</span></div>
            <ul className="mt-2 space-y-1 text-xs">
              {latest.map((r) => (
                <li key={`tl-${r.record_id}`} className="rounded-lg border border-slate-700 bg-slate-900 p-2"><div className="font-semibold">{r.record_id}</div><div>{r.administration_date || "N/A"} • {r.drug_name || "Unknown"} • {r.withdrawal_end_date || "No date"}</div></li>
              ))}
              {!latest.length && <li className="text-slate-300">No timeline data yet.</li>}
            </ul>
          </section>

          {message && <div className="rounded-xl border border-slate-600 bg-slate-800 p-2 text-sm">{message}</div>}
        </div>
      </div>
    </div>
  )
}

export default FarmerDashboard
