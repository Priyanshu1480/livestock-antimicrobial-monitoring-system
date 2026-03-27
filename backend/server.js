const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const filePath = path.join(__dirname, "data", "records.json");

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

// Problem-to-drug mapping with priority
const PROBLEM_DRUG_MAP = {
  "Lameness": ["Oxytetracycline", "Penicillin"],
  "Mastitis": ["Amoxicillin", "Penicillin"],
  "Diarrhea": ["Oxytetracycline", "Streptomycin"],
  "Pneumonia": ["Doxycycline", "Oxytetracycline"],
  "Skin Disease": ["Oxytetracycline", "Enrofloxacin"]
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

// GET - Dosage Recommendation Endpoint
app.get("/api/dosage-recommendation", (req, res) => {
  try {
    const { symptom, problem, weight, age } = req.query;
    const weight_kg = parseFloat(weight) || 50;
    const age_months = parseFloat(age) || 12;

    // Select drug based on symptom or problem
    let suggestedDrug = null;
    
    if (symptom && SYMPTOM_DRUG_MAP[symptom]) {
      suggestedDrug = SYMPTOM_DRUG_MAP[symptom][0];
    } else if (problem && PROBLEM_DRUG_MAP[problem]) {
      suggestedDrug = PROBLEM_DRUG_MAP[problem][0];
    } else {
      // Fallback
      suggestedDrug = "Oxytetracycline";
    }

    // Get drug information
    const drugInfo = DRUG_DATABASE[suggestedDrug] || { dosage_mg_kg: 20, withdrawal_days: 5, MRL_limit: 100 };
    
    // Calculate dosage: base dosage adjusted by age(younger animals may need slight reduction)
    let ageMultiplier = 1.0;
    if (age_months < 6) ageMultiplier = 0.8; // Young animals
    else if (age_months > 36) ageMultiplier = 0.9; // Older animals

    const baseDosage = drugInfo.dosage_mg_kg * weight_kg * ageMultiplier;
    const recommendedDose = Math.round(baseDosage);
    
    // Calculate safe range (±20%)
    const minDose = Math.round(recommendedDose * 0.8);
    const maxDose = Math.round(recommendedDose * 1.2);
    
    // Calculate withdrawal period
    const withdrawalEndDate = new Date();
    withdrawalEndDate.setDate(withdrawalEndDate.getDate() + drugInfo.withdrawal_days);

    return res.json({
      success: true,
      drug: suggestedDrug,
      recommendedDose: recommendedDose,
      dosageUnit: "mg",
      dosageRange: {
        min: minDose,
        max: maxDose
      },
      drugInfo: {
        withdrawal_days: drugInfo.withdrawal_days,
        MRL_limit: drugInfo.MRL_limit,
        withdrawalEndDate: withdrawalEndDate.toISOString().split("T")[0]
      },
      compliance: {
        message: "Ensure animal rest period after treatment",
        withdrawalPeriod: `${drugInfo.withdrawal_days} days`,
        residueLimit: `${drugInfo.MRL_limit} µg/kg`
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Dosage calculation failed", message: err.message });
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

// POST
app.post("/api/records", (req, res) => {
  try {
    const newRecord = req.body;

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

// PUT
app.put("/api/records/:id", (req, res) => {
  try {
    const recordId = req.params.id;
    const updates = req.body;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const index = data.findIndex((r) => r.record_id === recordId);
    if (index === -1) return res.status(404).json({ message: "Record not found" });
    data[index] = { ...data[index], ...updates };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json(data[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
