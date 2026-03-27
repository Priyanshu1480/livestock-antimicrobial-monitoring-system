import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to parse CSV
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

// Load all CSV files
const animals = parseCSV(fs.readFileSync(path.join(__dirname, '../dataset/animals.csv'), 'utf8'));
const drugs = parseCSV(fs.readFileSync(path.join(__dirname, '../dataset/drugs.csv'), 'utf8'));
const farms = parseCSV(fs.readFileSync(path.join(__dirname, '../dataset/farms.csv'), 'utf8'));
const records = parseCSV(fs.readFileSync(path.join(__dirname, '../dataset/records.csv'), 'utf8'));
const users = parseCSV(fs.readFileSync(path.join(__dirname, '../dataset/users.csv'), 'utf8'));

// Create lookup maps
const animalMap = new Map(animals.map(a => [a.animal_id, a]));
const drugMap = new Map(drugs.map(d => [d.drug_id, d]));
const farmMap = new Map(farms.map(f => [f.farm_id, f]));
const userMap = new Map(users.map(u => [u.user_id, u]));

// Combine records with related data
const combinedRecords = records.map(record => {
  const animal = animalMap.get(record.animal_id);
  const drug = drugMap.get(record.drug_id);
  const farm = animal ? farmMap.get(animal.farm_id) : null;
  const owner = farm ? userMap.get(farm.owner_id) : null;

  return {
    record_id: record.record_id,
    animal_id: record.animal_id,
    drug_id: record.drug_id,
    dose: record.dose,
    administration_date: record.administration_date,
    withdrawal_end_date: record.withdrawal_end_date,
    test_date: record.test_date,
    residue_value: parseFloat(record.residue_value) || 0,
    mrl_status: record.mrl_status,
    withdrawal_status: record.withdrawal_status,
    compliance_status: record.compliance_status,
    // Animal details
    animal_type: animal?.species || 'Unknown',
    age_months: animal?.age ? parseInt(animal.age) * 12 : 0,
    health_status: animal?.health_status || 'Unknown',
    // Drug details
    drug_name: drug?.name || 'Unknown',
    withdrawal_days: drug?.withdrawal_days ? parseInt(drug.withdrawal_days) : 0,
    MRL_limit: drug?.MRL_limit ? parseFloat(drug.MRL_limit) : 0,
    // Farm details
    farm_id: animal?.farm_id || 'Unknown',
    farm_name: farm?.farm_name || 'Unknown',
    region: farm?.region || 'Unknown',
    country: farm?.country || 'Unknown',
    // Owner details
    owner_id: farm?.owner_id || 'Unknown',
    owner_name: owner?.name || 'Unknown',
    owner_role: owner?.role || 'Unknown',
    // Status fields for vet actions
    status: record.compliance_status === 'Compliant' ? 'approved' : 'pending',
    vet_suggestion: '',
    // For farmer form compatibility
    animal_count: 1,
    weight_kg: 0,
    symptom: 'Unknown',
    recommended_dose: record.dose,
    date: record.administration_date
  };
});

// Load existing records and merge
let existingRecords = [];
try {
  existingRecords = JSON.parse(fs.readFileSync('./data/records.json', 'utf8'));
} catch (e) {
  console.log('No existing records.json found');
}

// Merge with existing farmer-submitted records
const allRecords = [...combinedRecords, ...existingRecords];

// Write combined data
fs.writeFileSync('./data/records.json', JSON.stringify(allRecords, null, 2));
console.log(`Combined ${combinedRecords.length} CSV records with ${existingRecords.length} existing records`);
