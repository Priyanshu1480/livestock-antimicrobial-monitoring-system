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

// GET - Dosage Recommendation Endpoint
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
    const newRecord = {
      ...req.body,
      extra_notes: req.body.extra_notes || "",
      vet_notes: req.body.vet_notes || "",
      status: req.body.status || "Pending",
      vet_status: req.body.vet_status || "not reviewed"
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
    const { status, vet_notes, digital_signature, consult_required } = req.body;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const index = data.findIndex((r) => r.record_id === recordId);
    if (index === -1) return res.status(404).json({ message: "Record not found" });

    data[index] = {
      ...data[index],
      ...(status !== undefined ? { status } : {}),
      ...(vet_notes !== undefined ? { vet_notes } : {}),
      ...(digital_signature !== undefined ? { digital_signature } : {}),
      ...(consult_required !== undefined ? { consult_required } : {}),
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
