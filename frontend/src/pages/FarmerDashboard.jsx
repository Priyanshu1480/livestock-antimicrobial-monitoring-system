import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Loading from "../components/Loading"
import Button from "../components/Button"

const RAW_API_URL = import.meta.env.VITE_API_URL || ""
const API_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")
  : "http://localhost:5000"
const sidebarItems = ["Add New Treatment", "My Records", "Dose Guide"]
const STEP_LABELS = ["Select Location", "Enter Animal Details", "Identify Problem", "Review & Submit"]

// Countries list with "Other" option
const COUNTRIES_LIST = ["India", "USA", "Canada", "Brazil", "Germany", "Australia", "UK", "China", "South Africa"]

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
  Canada: {
    farms: ["Rocky Mountain Ranch", "Prairie Bison Farm", "Ontario Dairy Co", "British Columbia Pastoral", "Quebec Modern Farm"],
    farmCodes: { "Rocky Mountain Ranch": "FARM501", "Prairie Bison Farm": "FARM502", "Ontario Dairy Co": "FARM503", "British Columbia Pastoral": "FARM504", "Quebec Modern Farm": "FARM505" },
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
  },
  UK: {
    farms: ["Scottish Highlands Farm", "Lake District Pastoral", "English Dairy Co", "Welsh Green Valley", "Northern Ireland Modern"],
    farmCodes: { "Scottish Highlands Farm": "FARM601", "Lake District Pastoral": "FARM602", "English Dairy Co": "FARM603", "Welsh Green Valley": "FARM604", "Northern Ireland Modern": "FARM605" },
    region: "Europe"
  },
  China: {
    farms: ["Inner Mongolia Ranch", "Yangtze Valley Farm", "Sichuan Modern Dairy", "Tibetan Highland Pastoral", "Shanghai Green Farm"],
    farmCodes: { "Inner Mongolia Ranch": "FARM701", "Yangtze Valley Farm": "FARM702", "Sichuan Modern Dairy": "FARM703", "Tibetan Highland Pastoral": "FARM704", "Shanghai Green Farm": "FARM705" },
    region: "Asia"
  },
  "South Africa": {
    farms: ["Kruger Valley Cattle", "Cape Town Dairy", "Johannesburg Modern Farm", "Durban Coastal Ranch", "Pretoria Green Fields"],
    farmCodes: { "Kruger Valley Cattle": "FARM801", "Cape Town Dairy": "FARM802", "Johannesburg Modern Farm": "FARM803", "Durban Coastal Ranch": "FARM804", "Pretoria Green Fields": "FARM805" },
    region: "Africa"
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
  FARM405: [{ id: "COW605", name: "Pastoral Cattle - Perth", type: "Cow" }, { id: "GOAT605", name: "Goat - Perth", type: "Goat" }, { id: "SHEEP605", name: "Sheep - Perth", type: "Sheep" }, { id: "PIG603", name: "Pig - Perth", type: "Pig" }, { id: "BUFFALO605", name: "Buffalo - Perth", type: "Buffalo" }],
  // Canada farms
  FARM501: [{ id: "BUFFALO701", name: "Rocky Buffalo - Bison", type: "Buffalo" }, { id: "COW701", name: "Alpine Cattle", type: "Cow" }, { id: "SHEEP701", name: "Mountain Sheep", type: "Sheep" }, { id: "GOAT701", name: "Alpine Goat", type: "Goat" }, { id: "PIG701", name: "Rocky Pig", type: "Pig" }],
  FARM502: [{ id: "BUFFALO702", name: "Prairie Bison Base", type: "Buffalo" }, { id: "COW702", name: "Prairie Cattle", type: "Cow" }, { id: "SHEEP702", name: "Prairie Sheep", type: "Sheep" }, { id: "GOAT702", name: "Prairie Goat", type: "Goat" }, { id: "POULTRY701", name: "Prairie Chicken", type: "Poultry" }],
  FARM503: [{ id: "COW703", name: "Ontario Dairy - Classic", type: "Cow" }, { id: "SHEEP703", name: "Ontario Sheep", type: "Sheep" }, { id: "GOAT703", name: "Ontario Goat", type: "Goat" }, { id: "PIG702", name: "Ontario Pig", type: "Pig" }, { id: "BUFFALO703", name: "Ontario Buffalo", type: "Buffalo" }],
  FARM504: [{ id: "COW704", name: "BC Pastoral Cattle", type: "Cow" }, { id: "GOAT704", name: "BC Goat", type: "Goat" }, { id: "SHEEP704", name: "Coastal Sheep", type: "Sheep" }, { id: "PIG703", name: "BC Pig", type: "Pig" }, { id: "POULTRY702", name: "BC Chicken", type: "Poultry" }],
  FARM505: [{ id: "COW705", name: "Quebec Modern Dairy", type: "Cow" }, { id: "GOAT705", name: "Quebec Goat", type: "Goat" }, { id: "SHEEP705", name: "Quebec Sheep", type: "Sheep" }, { id: "BUFFALO704", name: "Quebec Buffalo", type: "Buffalo" }, { id: "PIG704", name: "Quebec Pig", type: "Pig" }],
  // UK farms
  FARM601: [{ id: "SHEEP801", name: "Highland Ram", type: "Sheep" }, { id: "COW801", name: "Scottish Cattle", type: "Cow" }, { id: "GOAT801", name: "Scottish Goat", type: "Goat" }, { id: "PIG801", name: "Scottish Pig", type: "Pig" }, { id: "BUFFALO801", name: "Highland Buffalo", type: "Buffalo" }],
  FARM602: [{ id: "SHEEP802", name: "Lake District Sheep", type: "Sheep" }, { id: "COW802", name: "Lake Cattle", type: "Cow" }, { id: "GOAT802", name: "Lake Goat", type: "Goat" }, { id: "POULTRY801", name: "Lake Chicken", type: "Poultry" }, { id: "PIG802", name: "Lake Pig", type: "Pig" }],
  FARM603: [{ id: "COW803", name: "English Dairy Pro", type: "Cow" }, { id: "SHEEP803", name: "English Sheep", type: "Sheep" }, { id: "GOAT803", name: "English Goat", type: "Goat" }, { id: "BUFFALO802", name: "English Buffalo", type: "Buffalo" }, { id: "PIG803", name: "English Pig", type: "Pig" }],
  FARM604: [{ id: "SHEEP804", name: "Welsh Mountain Sheep", type: "Sheep" }, { id: "GOAT804", name: "Welsh Goat", type: "Goat" }, { id: "COW804", name: "Welsh Cattle", type: "Cow" }, { id: "PIG804", name: "Welsh Pig", type: "Pig" }, { id: "BUFFALO803", name: "Welsh Buffalo", type: "Buffalo" }],
  FARM605: [{ id: "COW805", name: "Northern Ireland Dairy", type: "Cow" }, { id: "SHEEP805", name: "NI Sheep", type: "Sheep" }, { id: "GOAT805", name: "NI Goat", type: "Goat" }, { id: "PIG805", name: "NI Pig", type: "Pig" }, { id: "POULTRY802", name: "NI Chicken", type: "Poultry" }],
  // China farms
  FARM701: [{ id: "BUFFALO901", name: "Mongolia Bison", type: "Buffalo" }, { id: "SHEEP901", name: "Mongolian Sheep", type: "Sheep" }, { id: "GOAT901", name: "Mongolian Goat", type: "Goat" }, { id: "COW901", name: "Mongolia Cattle", type: "Cow" }, { id: "HORSE901", name: "Mongolian Horse", type: "Horse" }],
  FARM702: [{ id: "COW902", name: "Yangtze Valley Cattle", type: "Cow" }, { id: "GOAT902", name: "Yangtze Goat", type: "Goat" }, { id: "SHEEP902", name: "Yangtze Sheep", type: "Sheep" }, { id: "PIG901", name: "Yangtze Pig", type: "Pig" }, { id: "BUFFALO902", name: "Yangtze Buffalo", type: "Buffalo" }],
  FARM703: [{ id: "COW903", name: "Sichuan Dairy Modern", type: "Cow" }, { id: "BUFFALO903", name: "Sichuan Buffalo", type: "Buffalo" }, { id: "SHEEP903", name: "Sichuan Sheep", type: "Sheep" }, { id: "GOAT903", name: "Sichuan Goat", type: "Goat" }, { id: "PIG902", name: "Sichuan Pig", type: "Pig" }],
  FARM704: [{ id: "SHEEP904", name: "Tibetan Plateau Sheep", type: "Sheep" }, { id: "YAK904", name: "Tibetan Yak", type: "Buffalo" }, { id: "GOAT904", name: "Tibetan Goat", type: "Goat" }, { id: "HORSE902", name: "Tibetan Horse", type: "Horse" }, { id: "COW904", name: "Tibetan Cattle", type: "Cow" }],
  FARM705: [{ id: "COW905", name: "Shanghai Green Dairy", type: "Cow" }, { id: "PIG903", name: "Shanghai Pig", type: "Pig" }, { id: "GOAT905", name: "Shanghai Goat", type: "Goat" }, { id: "POULTRY901", name: "Shanghai Chicken", type: "Poultry" }, { id: "BUFFALO904", name: "Shanghai Buffalo", type: "Buffalo" }],
  // South Africa farms
  FARM801: [{ id: "BUFFALO1001", name: "Kruger Beef", type: "Buffalo" }, { id: "COW1001", name: "Kruger Cattle", type: "Cow" }, { id: "SHEEP1001", name: "Kruger Sheep", type: "Sheep" }, { id: "GOAT1001", name: "Kruger Goat", type: "Goat" }, { id: "PIG1001", name: "Kruger Pig", type: "Pig" }],
  FARM802: [{ id: "COW1002", name: "Cape Town Dairy", type: "Cow" }, { id: "SHEEP1002", name: "Cape Sheep", type: "Sheep" }, { id: "GOAT1002", name: "Cape Goat", type: "Goat" }, { id: "PIG1002", name: "Cape Pig", type: "Pig" }, { id: "BUFFALO1002", name: "Cape Buffalo", type: "Buffalo" }],
  FARM803: [{ id: "COW1003", name: "Johannesburg Modern", type: "Cow" }, { id: "BUFFALO1003", name: "JNB Buffalo", type: "Buffalo" }, { id: "SHEEP1003", name: "JNB Sheep", type: "Sheep" }, { id: "GOAT1003", name: "JNB Goat", type: "Goat" }, { id: "POULTRY1001", name: "JNB Chicken", type: "Poultry" }],
  FARM804: [{ id: "COW1004", name: "Durban Coastal Cattle", type: "Cow" }, { id: "GOAT1004", name: "Durban Goat", type: "Goat" }, { id: "SHEEP1004", name: "Durban Sheep", type: "Sheep" }, { id: "PIG1003", name: "Durban Pig", type: "Pig" }, { id: "BUFFALO1004", name: "Durban Buffalo", type: "Buffalo" }],
  FARM805: [{ id: "COW1005", name: "Pretoria Green Fields", type: "Cow" }, { id: "SHEEP1005", name: "Pretoria Sheep", type: "Sheep" }, { id: "GOAT1005", name: "Pretoria Goat", type: "Goat" }, { id: "PIG1004", name: "Pretoria Pig", type: "Pig" }, { id: "BUFFALO1005", name: "Pretoria Buffalo", type: "Buffalo" }]
}

const TREATMENT_GUIDE = {
  Fever: ["Paracetamol", "Oxytetracycline"],
  Infection: ["Penicillin", "Amoxicillin"],
  Cough: ["Doxycycline", "Bromhexine"],
  Wound: ["Oxytetracycline", "Gentamicin"],
  Weakness: ["Vitamin B12", "Probiotic"]
}

// Problem-to-Symptom mapping for smart input guidance - COMPREHENSIVE
const PROBLEM_SYMPTOMS = {
  Fever: ["High temperature", "Loss of appetite", "Weakness", "Lethargy", "Shivering"],
  Infection: ["Swelling", "Discharge", "Pain", "Redness", "Heat in area", "Pus"],
  Weakness: ["Low movement", "Weight loss", "Fatigue", "Poor appetite", "Lethargy"],
  Injury: ["Limping", "Swelling", "Bleeding", "Pain on movement", "Visible wound"],
  "Respiratory Issue": ["Cough", "Difficulty breathing", "Nasal discharge", "Wheezing", "Labored breathing"],
  "Digestive Problem": ["Diarrhea", "Constipation", "Bloating", "Loss of appetite", "Abdominal pain"],
  "Skin Disease": ["Rashes", "Hair loss", "Scabs", "Itching", "Lesions", "Crusting"],
  "Parasite Infection": ["Weight loss", "Poor coat", "Diarrhea", "Lethargy", "Anemia signs"],
  Lameness: ["Limping", "Difficulty walking", "Leg swelling", "Pain on weight bearing"],
  Mastitis: ["Swollen udder", "Reduced milk", "Fever with swelling", "Milk discoloration"],
  Diarrhea: ["Loose stools", "Dehydration", "Lethargy", "Abdominal pain"],
  Pneumonia: ["Cough", "Difficulty breathing", "Lethargy", "Fever", "Nasal discharge"],
  Cough: ["Persistent cough", "Nasal discharge", "Difficulty breathing", "Lethargy"],
  Wound: ["Visible injury", "Bleeding", "Pain", "Swelling", "Discharge"],
  "Oral/Dental Issue": ["Drooling", "Difficulty eating", "Bad breath", "Swelling of jaw"],
  "Eye Infection": ["Discharge", "Redness", "Swelling", "Cloudiness", "Light sensitivity"],
  "Reproductive Issue": ["Infertility", "Abnormal discharge", "Prolonged heat", "Swelling"],
  "Metabolic Disorder": ["Weakness", "Loss of appetite", "Weight loss", "Milk production drop"],
  "Clostridial Disease": ["Sudden death", "Lethargy", "Fever", "Abdominal pain", "Muscle rigidity"]
}

// Animal types list
const ANIMAL_TYPES_LIST = ["Cow", "Buffalo", "Goat", "Sheep", "Pig", "Chicken", "Horse", "Donkey"]

// Expanded problems list
const PROBLEMS_LIST = [
  "Fever",
  "Infection", 
  "Weakness",
  "Injury",
  "Respiratory Issue",
  "Digestive Problem",
  "Skin Disease",
  "Parasite Infection",
  "Lameness",
  "Mastitis",
  "Diarrhea",
  "Pneumonia",
  "Cough",
  "Wound",
  "Oral/Dental Issue",
  "Eye Infection",
  "Reproductive Issue",
  "Metabolic Disorder",
  "Clostridial Disease"
]

function isViolation(record) {
  const overdose = Number(record.dose_mg_kg) > 35
  const early = record.withdrawal_end_date ? new Date().toISOString().slice(0, 10) < record.withdrawal_end_date : false
  const residue = Number(record.residue_value || 0)
  const overLimit = Number(record.MRL_limit || 50) > 0 ? residue > Number(record.MRL_limit || 50) : false
  return overdose || early || overLimit || record.compliance_status?.toLowerCase() === "violation"
}

const initialModel = { 
  age: "6", 
  weight: "100", 
  symptom: "", 
  problem: "", 
  date: new Date().toISOString().split("T")[0],
  extra_notes: ""
}

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
  
  // Simplified state management - FIXED
  const [country, setCountry] = useState("")
  const [customCountry, setCustomCountry] = useState("")
  const [farmId, setFarmId] = useState("")
  const [customFarm, setCustomFarm] = useState("")
  const [animalId, setAnimalId] = useState("")
  const [animalType, setAnimalType] = useState("")
  const [customAnimalType, setCustomAnimalType] = useState("")
  const [formErrors, setFormErrors] = useState({})

  const animalTypeName = animalType === "Other" ? customAnimalType : animalType
  const animalIdPrefix = animalTypeName ? animalTypeName.trim().slice(0, 3).toUpperCase() : ""

  useEffect(() => {
    if (!animalIdPrefix) return
    setAnimalId((prev) => {
      const previous = String(prev || "")
      const suffix = previous.startsWith(animalIdPrefix) ? previous.slice(animalIdPrefix.length) : previous
      return animalIdPrefix + suffix
    })
  }, [animalIdPrefix])

  const finalCountry = country === "Other" ? customCountry : country
  const finalFarm = country === "Other" ? customFarm : (farmId === "Other" ? customFarm : farmId)
  const finalAnimalId = animalId
  const finalAnimalType = animalType === "Other" ? customAnimalType : animalType

  // Cascading dropdown logic
  const countries = COUNTRIES_LIST
  const farms = country && country !== "Other" ? COUNTRY_DATA[country].farms : []
  const farmCodes = country && country !== "Other" ? COUNTRY_DATA[country].farmCodes : {}
  const availableFarms = farms.map(farm => ({ name: farm, code: farmCodes[farm] }))
  const availableAnimals = farmId && farmId !== "Other" && FARM_ANIMALS[farmId] ? FARM_ANIMALS[farmId] : []
  
  // Debug logging
  console.log("Step:", step, "Country:", country, "CustomCountry:", customCountry, "FinalCountry:", finalCountry)
  console.log("Farm:", farmId, "CustomFarm:", customFarm, "FinalFarm:", finalFarm)
  console.log("AnimalType:", animalType, "CustomAnimalType:", customAnimalType)

  const suggestedDrug = dosageRec ? dosageRec.drug : (model.symptom && TREATMENT_GUIDE[model.symptom] ? TREATMENT_GUIDE[model.symptom][0] : "—")
  const recommendedDose = dosageRec ? `${dosageRec.recommendedDose} ${dosageRec.dosageUnit}` : "—"

  const sortByDateDesc = (items) => {
    return (items || []).slice().sort((a, b) => {
      const da = new Date(a.administration_date || a.date || 0)
      const db = new Date(b.administration_date || b.date || 0)
      return db - da
    })
  }

 const fetchRecords = async () => {
  try {
    const res = await fetch(`${API_URL}/api/records`)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data.slice().reverse() : [])
  } catch (err) {
    console.log(err)
  }
}

useEffect(() => {
  fetchRecords()
  const interval = setInterval(fetchRecords, 15000)
  window.addEventListener("focus", fetchRecords)
  return () => {
    clearInterval(interval)
    window.removeEventListener("focus", fetchRecords)
  }
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
      
      fetch(`${API_URL}/api/dosage-recommendation?${params}`)
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
    
    // Validation
    const newErrors = {}
    if (!finalCountry) newErrors.country = "Country is required"
    if (!finalFarm) newErrors.farm = "Farm is required"
    if (!finalAnimalId) newErrors.animalId = "Animal ID is required"
    if (!finalAnimalType) newErrors.animalType = "Animal Type is required"
    if (!model.date) newErrors.date = "Date is required"
    if (!model.problem) newErrors.problem = "Problem is required"
    if (!model.symptom) newErrors.symptom = "Symptom is required"
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    const payload = {
      record_id: `FARM-${Date.now()}`,
      country: finalCountry,
      farm_id: finalFarm,
      animal_id: finalAnimalId,
      animal_type: finalAnimalType,
      age_months: model.age,
      weight_kg: model.weight,
      symptom: model.symptom,
      problem: model.problem,
      extra_notes: model.extra_notes || "",
      drug_name: suggestedDrug,
      recommended_dose: recommendedDose,
      compliance_status: "Pending",
      administration_date: model.date || new Date().toISOString().slice(0, 10),
      status: "Pending",
      vet_status: "not reviewed",
      vet_notes: ""
    }

    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setRecords(data.slice().reverse())
      // Reset form
      setModel(initialModel)
      setCountry("")
      setCustomCountry("")
      setFarmId("")
      setCustomFarm("")
      setAnimalId("")
      setAnimalType("")
      setCustomAnimalType("")
      setFormErrors({})
      setStep(1)
      setActive("My Records")
      setMessage("✓ Treatment saved successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      console.log(err)
      setMessage("✗ Error saving treatment. Try again.")
      setTimeout(() => setMessage(""), 3000)
    } finally {
      setLoading(false)
    }
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
              <div className="flex gap-3 flex-wrap">
                <div className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-emerald-500/50 hover:scale-105 transition-all">
                  💉 Treated: {summary.total}
                </div>
                <div className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all">
                  📋 Recent: {summary.recent.length}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3 shadow-lg"><div className="text-xs uppercase text-slate-400">Total Treatments</div><div className="text-2xl font-bold text-cyan-300">{summary.total}</div></div>
            <div className="rounded-2xl bg-cyan-900/15 border border-cyan-400/30 p-3 shadow-lg"><div className="text-xs uppercase text-cyan-200">Recent</div><div className="text-2xl font-bold text-cyan-300">{summary.recent.length}</div></div>
            <div className="rounded-2xl bg-emerald-900/15 border border-emerald-500/30 p-3 shadow-lg"><div className="text-xs uppercase text-emerald-200">Easy Guide</div><div className="text-2xl font-bold text-emerald-300">Beginner</div></div>
          </div>

          {active === "Add New Treatment" && (
            <section className="rounded-2xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg">➕ Add New Treatment Record</h2>
                  <p className="text-xs text-slate-300 mt-1">Step by step guided input for accurate treatment logging.</p>
                </div>
                <span className="text-sm font-semibold text-cyan-300 bg-cyan-900/20 px-3 py-1 rounded-full">Step {step}/4</span>
              </div>
              
              <div className="flex gap-2 mb-4">
                {[1,2,3,4].map(s => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition ${step >= s ? 'bg-cyan-400' : 'bg-slate-700'}`}></div>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                <div className={`rounded-xl px-4 py-3 text-lg font-bold shadow-lg transition-all ${
                  step === 1 ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' :
                  step === 2 ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' :
                  step === 3 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                  'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                }`}>
                  {step === 1 && '📍'} {step === 2 && '🐄'} {step === 3 && '🚨'} {step === 4 && '✓'} {STEP_LABELS[step - 1]}
                </div>
                
                {/* STEP 1: Location Selection */}
                {step === 1 && (
                  <div className="space-y-4">
                    {/* Country Selection */}
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        🌍 Country
                      </label>
                      {country !== "Other" ? (
                        <select 
                          value={country} 
                          onChange={(e) => {
                            setCountry(e.target.value)
                            setFarmId("")
                            setCustomFarm("")
                          }}
                          className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Select Country</option>
                          {COUNTRIES_LIST.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="Other">Other (Enter manually)</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter country name"
                            value={customCountry}
                            onChange={(e) => setCustomCountry(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          />
                          <Button 
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setCountry("")
                              setCustomCountry("")
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      )}
                      {formErrors.country && <div className="text-xs text-rose-400">{formErrors.country}</div>}
                    </div>

                    {/* Farm Selection */}
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        🏠 Farm
                      </label>
                      {!country ? (
                        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded-lg p-2.5">
                          Please select a country first
                        </div>
                      ) : country === "Other" ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter farm name or code"
                            value={customFarm}
                            onChange={(e) => setCustomFarm(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          />
                            <Button 
                              variant="danger"
                              size="sm"
                              onClick={() => setCustomFarm("")}
                            >
                              ✕
                            </Button>
                        </div>
                      ) : (
                        farmId !== "Other" ? (
                          <select 
                            value={farmId} 
                            onChange={(e) => {
                              setFarmId(e.target.value)
                              setAnimalId("")
                            }}
                            className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="">Select Farm</option>
                            {availableFarms.map((f) => (
                              <option key={f.code} value={f.code}>{f.name} ({f.code})</option>
                            ))}
                            <option value="Other">Other Farm (Enter manually)</option>
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Enter farm name or code"
                              value={customFarm}
                              onChange={(e) => setCustomFarm(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                            />
                            <Button 
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setFarmId("")
                                setCustomFarm("")
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        )
                      )}
                      {formErrors.farm && <div className="text-xs text-rose-400">{formErrors.farm}</div>}
                    </div>

                    {/* Summary */}
                    {finalCountry && finalFarm && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-3 text-sm text-emerald-200">
                        ✓ Selected: <strong>{finalCountry}</strong> → <strong>{finalFarm}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: Animal Details */}
                {step === 2 && (
                  <div className="space-y-4">
                    {/* Animal Type */}
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        🐄 Animal Type
                      </label>
                      {animalType !== "Other" ? (
                        <select 
                          value={animalType} 
                          onChange={(e) => setAnimalType(e.target.value)}
                          className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Select Animal Type</option>
                          {ANIMAL_TYPES_LIST.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          <option value="Other">Other (Enter manually)</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter animal type"
                            value={customAnimalType}
                            onChange={(e) => setCustomAnimalType(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          />
                          <Button 
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setAnimalType("")
                              setCustomAnimalType("")
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      )}
                      {formErrors.animalType && <div className="text-xs text-rose-400">{formErrors.animalType}</div>}
                    </div>

                    {/* Animal ID */}
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        🔖 Animal ID / Ear Tag
                      </label>
                      <input 
                        type="text" 
                        placeholder="Enter unique Animal ID (e.g., COW1023, BUFFALO-A45)"
                        value={animalId}
                        onChange={(e) => {
                          let next = String(e.target.value || "")
                          if (animalIdPrefix) {
                            if (!next.toUpperCase().startsWith(animalIdPrefix)) {
                              next = next.replace(new RegExp(`^${animalIdPrefix}`, "i"), "")
                            } else {
                              next = next.slice(animalIdPrefix.length)
                            }
                            next = next.replace(/[^A-Za-z0-9-]/g, "")
                            setAnimalId(animalIdPrefix + next.toUpperCase())
                          } else {
                            setAnimalId(next.toUpperCase())
                          }
                        }}
                        className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                      <p className="text-xs text-slate-400">Required: Use farm ID + animal number format for easy tracking</p>
                      {formErrors.animalId && <div className="text-xs text-rose-400">{formErrors.animalId}</div>}
                    </div>

                    {/* Age & Weight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-200">📅 Age (months)</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="360"
                          value={model.age} 
                          onChange={(e) => setModel(p => ({ ...p, age: e.target.value }))}
                          className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-200">⚖️ Weight (kg)</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="2000"
                          value={model.weight} 
                          onChange={(e) => setModel(p => ({ ...p, weight: e.target.value }))}
                          className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* Treatment Date */}
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        📆 Treatment Date
                      </label>
                      <input 
                        type="date" 
                        value={model.date} 
                        onChange={(e) => setModel(p => ({ ...p, date: e.target.value }))}
                        className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                      {formErrors.date && <div className="text-xs text-rose-400">{formErrors.date}</div>}
                    </div>
                  </div>
                )}

                {/* STEP 3: Problem & Symptoms */}
                {step === 3 && (
                  <div className="space-y-4">
                    {/* Problem Type */}
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        🚨 Problem / Condition
                      </label>
                      <select 
                        value={model.problem} 
                        onChange={(e) => setModel(p => ({ ...p, problem: e.target.value, symptom: "" }))}
                        className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">Select Problem</option>
                        {PROBLEMS_LIST.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400">Choose the main health problem observed</p>
                      {formErrors.problem && <div className="text-xs text-rose-400">{formErrors.problem}</div>}
                    </div>

                    {/* Symptoms (Dynamic) */}
                    {model.problem && (
                      <>
                        <div className="grid gap-3">
                          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            💊 Symptoms (for {model.problem})
                          </label>
                          <select 
                            value={model.symptom} 
                            onChange={(e) => setModel(p => ({ ...p, symptom: e.target.value }))}
                            className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="">Select Symptom</option>
                            {(PROBLEM_SYMPTOMS[model.problem] || []).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-400">Symptoms are dynamically tailored to the selected problem</p>
                          {formErrors.symptom && <div className="text-xs text-rose-400">{formErrors.symptom}</div>}
                        </div>
                        <div className="grid gap-3">
                          <label className="text-sm font-semibold text-slate-200">📝 Additional observations (optional)</label>
                          <textarea
                            value={model.extra_notes}
                            onChange={(e) => setModel(p => ({ ...p, extra_notes: e.target.value }))}
                            placeholder="Additional observations (optional)"
                            rows={4}
                            className="rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* STEP 4: Review & Submit */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-900/10 p-4 space-y-3">
                      <div className="text-sm font-semibold text-cyan-300">📋 Review Your Treatment Record</div>
                      
                      {/* Location Summary */}
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-300">LOCATION</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-400">Country:</div>
                          <div className="font-semibold text-white">{finalCountry}</div>
                          <div className="text-slate-400">Farm:</div>
                          <div className="font-semibold text-white">{finalFarm}</div>
                        </div>
                      </div>

                      {/* Animal Summary */}
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-300">ANIMAL DETAILS</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-400">Animal ID:</div>
                          <div className="font-semibold text-white">{finalAnimalId}</div>
                          <div className="text-slate-400">Type:</div>
                          <div className="font-semibold text-white">{finalAnimalType}</div>
                          <div className="text-slate-400">Age:</div>
                          <div className="font-semibold text-white">{model.age} months</div>
                          <div className="text-slate-400">Weight:</div>
                          <div className="font-semibold text-white">{model.weight} kg</div>
                          <div className="text-slate-400">Date:</div>
                          <div className="font-semibold text-white">{model.date}</div>
                        </div>
                      </div>

                      {/* Condition Summary */}
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-300">CONDITION & TREATMENT</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-400">Problem:</div>
                          <div className="font-semibold text-white">{model.problem}</div>
                          <div className="text-slate-400">Symptom:</div>
                          <div className="font-semibold text-white">{model.symptom}</div>
                          {model.extra_notes && (
                            <>
                              <div className="text-slate-400">Extra Notes:</div>
                              <div className="font-semibold text-white truncate">{model.extra_notes}</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Recommended Treatment */}
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-3 space-y-2">
                        <div className="text-xs font-semibold text-emerald-300">💉 RECOMMENDED TREATMENT</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-300">Drug:</div>
                          <div className="font-bold text-emerald-300 text-lg">{suggestedDrug}</div>
                          <div className="text-slate-300">Dose:</div>
                          <div className="font-bold text-emerald-300 text-lg">{recommendedDose}</div>
                        </div>
                      </div>

                      {/* Dosage Info */}
                      {dosageRec && (
                        <>
                          <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-3">
                            <div className="text-xs text-slate-300 font-semibold uppercase">Safe Dosage Range</div>
                            <div className="mt-2 text-sm font-bold text-amber-300">{dosageRec.dosageRange.min}–{dosageRec.dosageRange.max} {dosageRec.dosageUnit}</div>
                          </div>
                          <div className="rounded-lg border border-orange-500/30 bg-orange-900/10 p-3 space-y-2">
                            <div className="text-xs text-slate-300 font-semibold uppercase">Safety & Compliance Info</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Withdrawal Period:</span>
                                <span className="text-orange-300 font-semibold">{dosageRec.drugInfo.withdrawal_days} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">End Withdrawal:</span>
                                <span className="text-orange-300 font-semibold">{dosageRec.drugInfo.withdrawalEndDate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">MRL Limit:</span>
                                <span className="text-orange-300 font-semibold">{dosageRec.drugInfo.MRL_limit} µg/kg</span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-orange-200 border-t border-orange-500/30 pt-2">
                              ⚠️ {dosageRec.compliance.message}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <Button 
                    variant="secondary" 
                    disabled={step === 1} 
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                  >
                    ← Back
                  </Button>
                  
                  {step < 4 ? (
                    <Button 
                      variant="primary"
                      onClick={() => setStep(s => Math.min(4, s + 1))}
                      disabled={
                        (step === 1 && (!finalCountry || !finalFarm)) ||
                        (step === 2 && (!finalAnimalType || !finalAnimalId)) ||
                        (step === 3 && (!model.problem || !model.symptom))
                      }
                      className="flex-1"
                    >
                      Next →
                    </Button>
                  ) : (
                    <Button 
                      variant="success"
                      onClick={handleSubmit}
                      className="flex-1"
                    >
                      ✓ Submit Treatment Record
                    </Button>
                  )}
                </div>

                {/* Dose Guide Toggle */}
                <div className="pt-2 border-t border-slate-700">
                  <Button 
                    variant="info"
                    size="md"
                    onClick={() => setShowGuide(p => !p)}
                    className="flex items-center gap-2"
                  >
                    {showGuide ? '▼' : '▶'} View Full Dose Guide →
                  </Button>
                  {showGuide && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {guideCards}
                    </div>
                  )}
                </div>
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
                        <div className={r.status === "Rejected" ? "text-rose-400" : r.status === "Approved" ? "text-emerald-400" : "text-slate-400"}>{r.status || r.compliance_status || "Pending"}</div>
                        <div className="text-slate-400">{r.administration_date || "—"}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-400">Animal:</span> <span className="text-white">{r.animal_type || "—"}</span></div>
                      <div><span className="text-slate-400">Drug:</span> <span className="text-white">{r.drug_name || "—"}</span></div>
                      <div><span className="text-slate-400">Symptom:</span> <span className="text-white">{r.symptom || "—"}</span></div>
                      <div><span className="text-slate-400">Dose:</span> <span className="text-white">{r.recommended_dose || "—"}</span></div>
                    </div>
                    {r.extra_notes && <div className="mt-2 text-xs text-slate-400">📝 Extra notes: {r.extra_notes}</div>}
                    {r.vet_notes && <div className="mt-2 text-xs text-emerald-300">💬 Vet note: {r.vet_notes}</div>}
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
