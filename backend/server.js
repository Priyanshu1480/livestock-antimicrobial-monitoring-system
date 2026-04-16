const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const { generateResponse } = require("./ai_engine");
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "";
let isDbConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log("✅ MongoDB Connected Successfully");
      isDbConnected = true;
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err.message);
      isDbConnected = false;
    });
} else {
  console.log("⚠️ No MONGODB_URI found in .env. Professional Auth will be disabled.");
}

// User Schema for Professional Auth
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['farmer', 'vet', 'admin'] },
  country: { type: String },
  farm_id: { type: String },
  license_id: { type: String }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const filePath = path.join(__dirname, "data", "records.json");
const farmsFilePath = path.join(__dirname, "data", "farms.json");
const usersFilePath = path.join(__dirname, "data", "users.json");

// Drug database with dosage recommendations (mg/kg per day)
const DRUG_DATABASE = {
  Penicillin: { withdrawal_days: 7, MRL_limit: 50, dosage_mg_kg: 20 },
  Oxytetracycline: { withdrawal_days: 5, MRL_limit: 100, dosage_mg_kg: 25 },
  Amoxicillin: { withdrawal_days: 6, MRL_limit: 60, dosage_mg_kg: 15 },
  Enrofloxacin: { withdrawal_days: 4, MRL_limit: 30, dosage_mg_kg: 10 },
  Streptomycin: { withdrawal_days: 7, MRL_limit: 80, dosage_mg_kg: 20 },
  "Doxycycline": { withdrawal_days: 5, MRL_limit: 90, dosage_mg_kg: 22 },
  "Bromhexine": { withdrawal_days: 3, MRL_limit: 40, dosage_mg_kg: 5 },
  "Gentamicin": { withdrawal_days: 6, MRL_limit: 75, dosage_mg_kg: 8 },
  "Paracetamol": { withdrawal_days: 2, MRL_limit: 150, dosage_mg_kg: 15 },
  "Vitamin B12": { withdrawal_days: 1, MRL_limit: 200, dosage_mg_kg: 1 },
  "Probiotic": { withdrawal_days: 0, MRL_limit: 500, dosage_mg_kg: 2 }
};

// Problem-to-drug mapping with dosage per kg
const PROBLEM_DRUG_MAP = {
  "Fever": { drug: "Paracetamol", dose_per_kg: 10 },
  "Infection": { drug: "Oxytetracycline", dose_per_kg: 5 },
  "Weakness": { drug: "Vitamin B Complex", dose_per_kg: 2 },
  "Injury": { drug: "Meloxicam", dose_per_kg: 0.5 },
  "Respiratory Issue": { drug: "Enrofloxacin", dose_per_kg: 5 },
  "Digestive Problem": { drug: "Probiotics", dose_per_kg: 3 },
  "Skin Disease": { drug: "Ivermectin", dose_per_kg: 0.2 },
  "Parasite Infection": { drug: "Albendazole", dose_per_kg: 7.5 },
  "Lameness": { drug: "Meloxicam", dose_per_kg: 0.5 },
  "Mastitis": { drug: "Penicillin", dose_per_kg: 10 },
  "Diarrhea": { drug: "Electrolytes + Probiotics", dose_per_kg: 5 },
  "Pneumonia": { drug: "Enrofloxacin", dose_per_kg: 5 },
  "Cough": { drug: "Bromhexine", dose_per_kg: 0.5 },
  "Wound": { drug: "Topical Antibiotic", dose_per_kg: 2 },
  "Oral/Dental Issue": { drug: "Amoxicillin", dose_per_kg: 10 },
  "Eye Infection": { drug: "Oxytetracycline", dose_per_kg: 5 },
  "Reproductive Issue": { drug: "Hormonal Therapy", dose_per_kg: 1 },
  "Metabolic Disorder": { drug: "Mineral Supplements", dose_per_kg: 2 },
  "Clostridial Disease": { drug: "Penicillin", dose_per_kg: 10 }
};

// Symptom-to-drug mapping
const SYMPTOM_DRUG_MAP = {
  "Fever": ["Paracetamol", "Oxytetracycline"],
  "Infection": ["Penicillin", "Amoxicillin"],
  "Cough": ["Doxycycline", "Bromhexine"],
  "Wound": ["Oxytetracycline", "Gentamicin"],
  "Weakness": ["Vitamin B12", "Probiotic"],
  "Loose stools": ["Oxytetracycline", "Streptomycin"],
  "Swollen udder": ["Amoxicillin", "Penicillin"],
  "Limping": ["Oxytetracycline", "Penicillin"],
  "Difficulty breathing": ["Doxycycline", "Oxytetracycline"],
  "Hair loss": ["Oxytetracycline", "Enrofloxacin"]
};

// AUTHENTICATION APIs
// POST - Register New User
app.post("/api/register", async (req, res) => {
  try {
    const { name, username, password, role, country, farm_id, license_id } = req.body;
    const normalizedUsername = username.trim().toUpperCase();

    // Validation
    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // -- MongoDB PATH --
    if (isDbConnected) {
      const existing = await User.findOne({ username: normalizedUsername });
      if (existing) return res.status(400).json({ error: "Username already exists" });

      const newUser = new User({
        name,
        username: normalizedUsername,
        password: hashedPassword,
        role,
        country,
        farm_id,
        license_id
      });

      await newUser.save();
      return res.json({ success: true, message: "Registration successful (Database)" });
    }

    // -- FALLBACK: Local JSON PATH --
    if (!fs.existsSync(usersFilePath)) fs.writeFileSync(usersFilePath, "[]");
    let usersData = JSON.parse(fs.readFileSync(usersFilePath, "utf-8") || "[]");

    if (usersData.some(u => u.username === normalizedUsername)) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const newUser = {
      name,
      username: normalizedUsername,
      password: hashedPassword,
      role,
      country,
      farm_id,
      license_id,
      createdAt: new Date().toISOString()
    };

    usersData.push(newUser);
    fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));

    res.json({ success: true, message: "Registration successful (Local Storage)" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", message: err.message });
  }
});

// POST - Professional Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = username.trim().toUpperCase();

    // -- MongoDB PATH --
    if (isDbConnected) {
      const user = await User.findOne({ username: normalizedUsername });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

      return res.json({ 
        success: true, 
        username: user.username, 
        role: user.role, 
        name: user.name,
        country: user.country,
        farm_id: user.farm_id,
        license_id: user.license_id
      });
    }

    // -- FALLBACK: Local JSON PATH --
    if (!fs.existsSync(usersFilePath)) return res.status(401).json({ error: "Invalid credentials" });
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, "utf-8") || "[]");

    const user = usersData.find(u => u.username === normalizedUsername);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      success: true,
      username: user.username,
      role: user.role,
      name: user.name,
      country: user.country || "",
      farm_id: user.farm_id || "",
      license_id: user.license_id || ""
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed", message: err.message });
  }
});

// POST - AgroLens AI Chat
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, role, image } = req.body;
    let recordsContext = [];
    let systemAnalytics = null;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        
        // Compute pre-aggregated totals for the AI to prevent counting hallucinations
        const totalRecords = data.length;
        const approvedCount = data.filter(r => (r.status || "").toLowerCase() === "approved" || (r.vet_status || "").toLowerCase() === "approved").length;
        const pendingCount = data.filter(r => (r.status || "").toLowerCase() === "pending" || !r.status).length;
        const rejectedCount = data.filter(r => (r.status || "").toLowerCase() === "rejected" || (r.vet_status || "").toLowerCase() === "rejected").length;
        
        systemAnalytics = {
            total_historical_records: totalRecords,
            currently_approved: approvedCount,
            currently_pending: pendingCount,
            currently_rejected: rejectedCount
        };

        // Take the latest 200 records to keep AI speedy but contextual
        recordsContext = data.slice(-200);
    } catch(err) {}

    const { reply, analysis, personaName, personaTitle } = await generateResponse(message, role, recordsContext, image, systemAnalytics);

    res.json({
      success: true,
      reply,
      analysis,
      personaName,
      personaTitle
    });
  } catch (err) {
    res.status(500).json({ error: "AI processing failed", message: err.message });
  }
});
app.get("/api/dosage-recommendation", (req, res) => {
  try {
    const { problem, weight } = req.query;
    const selected = PROBLEM_DRUG_MAP[problem];

    if (!selected) {
      return res.json({
        success: false,
        drug: "Consult Veterinarian",
        recommended_dose: "N/A"
      });
    }

    const weightKg = parseFloat(weight) || 0;
    const dose = (selected.dose_per_kg * weightKg).toFixed(2);
    const drugInfo = DRUG_DATABASE[selected.drug] || { withdrawal_days: 0, MRL_limit: 0 };

    return res.json({
      success: true,
      drug: selected.drug,
      recommended_dose: `${dose} mg`,
      recommendedDose: Number(dose),
      dosageUnit: "mg",
      dosageRange: {
        min: Math.round(Number(dose) * 0.8),
        max: Math.round(Number(dose) * 1.2)
      },
      drugInfo: {
        withdrawal_days: drugInfo.withdrawal_days,
        MRL_limit: drugInfo.MRL_limit,
        withdrawalEndDate: drugInfo.withdrawal_days ? new Date(Date.now() + drugInfo.withdrawal_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : null
      },
      compliance: {
        message: "Consult veterinarian for exact dosage and administration schedule",
        withdrawalPeriod: `${drugInfo.withdrawal_days} days`,
        residueLimit: `${drugInfo.MRL_limit} µg/kg`
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Dosage calculation failed", message: err.message });
  }
});

// GET - All Registered Farms
app.get("/api/farms", (req, res) => {
  try {
    if (!fs.existsSync(farmsFilePath)) {
      fs.writeFileSync(farmsFilePath, "[]");
    }
    const data = JSON.parse(fs.readFileSync(farmsFilePath, "utf-8") || "[]");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch farms" });
  }
});

// POST - Register New Farm
app.post("/api/farms", (req, res) => {
  try {
    const newFarm = {
      id: `FARM-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    let data = [];
    if (fs.existsSync(farmsFilePath)) {
      data = JSON.parse(fs.readFileSync(farmsFilePath, "utf-8") || "[]");
    }
    data.push(newFarm);
    fs.writeFileSync(farmsFilePath, JSON.stringify(data, null, 2));
    res.json(newFarm);
  } catch (err) {
    res.status(500).json({ error: "Farm registration failed" });
  }
});

// DELETE - Remove Farm
app.delete("/api/farms/:id", (req, res) => {
  try {
    const { id } = req.params;
    let data = JSON.parse(fs.readFileSync(farmsFilePath, "utf-8") || "[]");
    data = data.filter(f => f.id !== id);
    fs.writeFileSync(farmsFilePath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Farm deletion failed" });
  }
});

// GET
app.get("/api/records", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(data);
  } catch {
    res.json([]);
  }
});

// GET - Public Safety Verification (Consumer Trust Portal)
app.get("/api/public/verify/:id", (req, res) => {
  try {
    const { id } = req.params;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
    const record = data.find(r => r.record_id === id);

    if (!record) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    // Mask sensitive data for public view
    const publicCertificate = {
      certificate_id: record.record_id,
      token_number: record.token_number,
      animal_id: record.animal_id, // Showing ID for official verification
      animal_type: record.animal_type || "Livestock",
      age_months: record.age_months || 0,
      weight_kg: record.weight_kg || 0,
      administration_date: record.administration_date || record.date,
      drug_name: record.drug_name || "Unknown Agent",
      withdrawal_days: record.withdrawal_days || 0,
      safe_date: record.safe_date,
      mrl_status: record.mrl_status || "Pending",
      residue_value: record.residue_value || 0,
      MRL_limit: record.MRL_limit || 0,
      vet_status: record.vet_status || "pending",
      status: record.status || "Pending",
      farm_name: record.farm_name || "Official Verified Farm",
      digital_signature: record.digital_signature ? "VERIFIED_ELECTRONIC_SIGNATURE" : null,
      farm_region: record.region || record.country || "Global",
      verified_at: new Date().toISOString()
    };

    res.json(publicCertificate);
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// POST
app.post("/api/records", (req, res) => {
  try {
    const newRecord = {
      ...req.body,
      token_number: `TK-${Math.floor(100000 + Math.random() * 900000)}`, // Standardized 6-digit token
      extra_notes: req.body.extra_notes || "",
      vet_notes: req.body.vet_notes || "",
      status: req.body.status || "Pending",
      vet_status: req.body.vet_status || "not reviewed",
      is_read_by_farmer: false
    };

    let data = [];

    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      data = [];
    }

    data.push(newRecord);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Save failed" });
  }
});

// PUT - Update single record
app.put("/api/records/:id", (req, res) => {
  try {
    const recordId = req.params.id;
    const { status, vet_notes, digital_signature, consult_required, is_critical } = req.body;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const index = data.findIndex((r) => r.record_id === recordId);
    if (index === -1) return res.status(404).json({ message: "Record not found" });

    data[index] = {
      ...data[index],
      ...(status !== undefined ? { status } : {}),
      ...(vet_notes !== undefined ? { vet_notes } : {}),
      ...(digital_signature !== undefined ? { digital_signature } : {}),
      ...(consult_required !== undefined ? { consult_required } : {}),
      ...(is_critical !== undefined ? { is_critical } : {}),
      ...(req.body.is_read_by_farmer !== undefined ? { is_read_by_farmer: req.body.is_read_by_farmer } : {}),
      ...(req.body.drug_name !== undefined ? { drug_name: req.body.drug_name } : {}),
      ...(req.body.recommended_dose !== undefined ? { recommended_dose: req.body.recommended_dose } : {}),
      ...(req.body.withdrawal_days !== undefined ? { withdrawal_days: req.body.withdrawal_days } : {}),
      ...(req.body.safe_date !== undefined ? { safe_date: req.body.safe_date } : {}),
      ...(status === "Approved" ? { vet_status: "approved" } : {}),
      ...(status === "Rejected" ? { vet_status: "rejected" } : {})
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json(data[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - Bulk update records
app.put("/api/records-bulk", (req, res) => {
  try {
    const { updates } = req.body; // Array: [{ record_id, status, vet_notes, ... }]
    if (!Array.isArray(updates)) return res.status(400).json({ message: "Invalid updates format" });

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    let updatedCount = 0;

    updates.forEach(update => {
      const idx = data.findIndex(r => r.record_id === update.record_id);
      if (idx !== -1) {
        data[idx] = {
          ...data[idx],
          ...update,
          ...(update.status === "Approved" ? { vet_status: "approved" } : {}),
          ...(update.status === "Rejected" ? { vet_status: "rejected" } : {})
        };
        updatedCount++;
      }
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, updatedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
