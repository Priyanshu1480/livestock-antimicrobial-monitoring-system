import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Skeleton from "../components/Skeleton"
import Toast from "../components/Toast"
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
  const [recordSearch, setRecordSearch] = useState("")
  const [recordStatusTab, setRecordStatusTab] = useState("All")
  
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
}, [])

useEffect(() => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, [active, step])

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
    const approved = records.filter(r => (r.status || "").toLowerCase() === "approved" || (r.vet_status || "").toLowerCase() === "approved").length
    const rejected = records.filter(r => (r.status || "").toLowerCase() === "rejected" || (r.vet_status || "").toLowerCase() === "rejected").length
    const pending = records.filter(r => (r.status || "").toLowerCase() === "pending" || (r.vet_status || "").toLowerCase() === "not reviewed").length
    const critical = records.filter(r => r.is_critical).length
    const healthScore = total > 0 ? Math.round((approved / total) * 100) : 0
    return { total, recent, approved, rejected, pending, critical, healthScore }
  }, [records])

  const filteredRecords = useMemo(() => {
    const term = recordSearch.toLowerCase()
    return records.filter(r => {
      if (term) {
        const haystack = [r.animal_id, r.drug_name, r.farm_id, r.country, r.problem, r.symptom].filter(Boolean).join(" ").toLowerCase()
        if (!haystack.includes(term)) return false
      }
      if (recordStatusTab === "Approved") return (r.status || "").toLowerCase() === "approved" || (r.vet_status || "").toLowerCase() === "approved"
      if (recordStatusTab === "Rejected") return (r.status || "").toLowerCase() === "rejected" || (r.vet_status || "").toLowerCase() === "rejected"
      if (recordStatusTab === "Pending") return (r.status || "").toLowerCase() === "pending" || (r.vet_status || "").toLowerCase() === "not reviewed"
      return true
    })
  }, [records, recordSearch, recordStatusTab])

  const criticalRecords = useMemo(() => records.filter(r => r.is_critical || (r.consult_required && (r.vet_status || "").toLowerCase() !== "not reviewed")), [records])

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
    <div className="dashboard-ambient-farmer min-h-screen text-slate-100 flex font-sans overflow-x-hidden">
      <Sidebar items={sidebarItems} active={active} onSelect={setActive} />
      
      <main className="flex-1 min-h-screen md:ml-64 p-4 md:p-8 lg:p-10 space-y-8 relative z-10 transition-all duration-300">
        <Navbar role="Farmer" homePath="/" onLogout={() => { localStorage.removeItem("auth"); localStorage.removeItem("selectedRole"); nav("/") }} isDark={isDark} onThemeToggle={onThemeToggle} />
        
        {message && <Toast message={message} type={message.includes("Error") || message.includes("✗") ? "error" : "success"} onClose={() => setMessage("")} />}
        
        <div className="max-w-[1400px] mx-auto space-y-8">
          <div className="card-glass rounded-[2rem] p-8 md:p-10 relative overflow-hidden shrink-0 shadow-2xl border border-white/5">
             <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[100%] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Livestock Intelligence Hub
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Farmer Management Terminal</h1>
                <p className="text-slate-400 text-sm max-w-md">Record treatments, monitor livestock health, and ensure compliance with digital precision.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-3 self-start">
                <div className="min-w-[120px] rounded-2xl bg-slate-800/50 border border-white/5 p-4 backdrop-blur-md">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold italic mb-1">Total Logs</div>
                  <div className="text-2xl font-black text-white">{summary.total}</div>
                </div>
                <div className="min-w-[120px] rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 backdrop-blur-md">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold italic mb-1">Recent Activity</div>
                  <div className="text-2xl font-black text-emerald-300">{summary.recent.length}</div>
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
            {/* VET FEEDBACK ALERT BANNER */}
            {criticalRecords.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top duration-500">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-600/20 via-rose-500/10 to-transparent border border-rose-500/30 px-6 py-4 shadow-xl shadow-rose-500/10 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                      <span className="text-rose-400 text-lg animate-pulse">⚠</span>
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-rose-400">Vet Alert</span>
                      <p className="text-sm font-semibold text-white">{criticalRecords.length} of your records {criticalRecords.length === 1 ? 'has' : 'have'} been flagged for clinical follow-up</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActive("My Records"); setRecordStatusTab("All"); setRecordSearch("") }}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 shadow-lg shadow-rose-500/20"
                  >
                    View Now
                  </button>
                </div>
              </div>
            )}

            {active === "Add New Treatment" && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="card-glass rounded-2xl p-5 border border-white/5 transition-all hover:border-cyan-500/20 group">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Total Treatments</div>
                  <div className="text-3xl font-black text-white">{summary.total}</div>
                  <div className="mt-2 h-0.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(summary.total, 100)}%` }} /></div>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 transition-all hover:border-emerald-500/40">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-black mb-2">Approved</div>
                  <div className="text-3xl font-black text-emerald-300">{summary.approved}</div>
                  <div className="mt-2 h-0.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: summary.total ? `${(summary.approved / summary.total) * 100}%` : '0%' }} /></div>
                </div>
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 transition-all hover:border-amber-500/40">
                  <div className="text-[10px] uppercase tracking-widest text-amber-500 font-black mb-2">Awaiting Review</div>
                  <div className="text-3xl font-black text-amber-300">{summary.pending}</div>
                  <div className="mt-2 h-0.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: summary.total ? `${(summary.pending / summary.total) * 100}%` : '0%' }} /></div>
                </div>
                <div className="rounded-2xl bg-slate-800/60 border border-white/5 p-5 transition-all hover:border-white/10">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Herd Health Score</div>
                  <div className={`text-3xl font-black ${summary.healthScore >= 70 ? 'text-emerald-300' : summary.healthScore >= 40 ? 'text-amber-300' : 'text-rose-300'}`}>{summary.healthScore}<span className="text-base font-bold text-slate-500 ml-1">%</span></div>
                  <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${summary.healthScore >= 70 ? 'text-emerald-500' : summary.healthScore >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {summary.healthScore >= 70 ? '✓ Excellent' : summary.healthScore >= 40 ? '~ Good' : '! Needs Attention'}
                  </div>
                </div>
              </div>
            )}

          {active === "Add New Treatment" && (
            <section className="card-glass hover:shadow-cyan-500/10 rounded-[1.5rem] p-5 transition-all duration-300">
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
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Treatment Archives</h2>
                  <p className="text-sm text-slate-400">Comprehensive history of medications administered at your facility.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-white/5 text-xs font-bold text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  {filteredRecords.length} / {records.length} RECORDS
                </div>
              </div>

              {/* Search + Status Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Animal ID, Drug, Farm, Country..."
                    value={recordSearch}
                    onChange={e => setRecordSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all pr-12 shadow-inner"
                  />
                  <svg className="absolute right-4 top-3.5 text-slate-500 w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "All", label: "All Records", count: records.length, color: "slate" },
                    { key: "Approved", label: "Approved", count: summary.approved, color: "emerald" },
                    { key: "Pending", label: "Pending Review", count: summary.pending, color: "amber" },
                    { key: "Rejected", label: "Rejected", count: summary.rejected, color: "rose" }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setRecordStatusTab(tab.key)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border ${
                        recordStatusTab === tab.key
                          ? tab.key === "Approved" ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20"
                          : tab.key === "Pending" ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
                          : tab.key === "Rejected" ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20"
                          : "bg-white text-slate-950 border-white/30 shadow-lg"
                          : "bg-slate-800/50 text-slate-400 border-white/5 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        recordStatusTab === tab.key ? 'bg-black/20' : 'bg-slate-700 text-slate-400'
                      }`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/20 border-2 border-dashed border-white/5 rounded-[2rem]">
                    <p className="text-slate-500 font-medium italic">{recordSearch || recordStatusTab !== "All" ? "No records match your search or filter." : "No clinical records found for this sector."}</p>
                  </div>
                ) : filteredRecords.map((r) => (
                  <div key={r.record_id} className={`group relative rounded-[2rem] bg-slate-900/40 border p-6 md:p-8 transition-all hover:bg-slate-800/60 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 overflow-hidden ${r.is_critical ? 'critical-alert-pulse bg-rose-500/5' : 'border-white/5'}`}>
                    <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2">
                       <span className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-full border shadow-sm ${r.status === "Approved" ? "border-emerald-500/30 text-emerald-400 bg-emerald-400/5" : r.status === "Rejected" ? "border-rose-500/30 text-rose-400 bg-rose-400/5" : "border-slate-500/30 text-slate-400 bg-slate-400/5"}`}>
                        {r.is_critical ? "⚠️ CRITICAL ALERT" : (r.status || "PENDING REVIEW")}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 tracking-tighter">{r.administration_date}</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 group-hover:scale-110 transition-transform ${r.is_critical ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {r.is_critical ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 3.43-2 3.43s2.17-.5 3.43-2c1.57-1.87 3.23-3.38 4.57-4.57l4.57-4.57c1.41-1.41 1.41-3.7 0-5.11-1.41-1.41-3.7-1.41-5.11 0L5.43 8.11c-1.19 1.34-2.7 3-4.57 4.57z"/></svg>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${r.is_critical ? 'text-rose-500' : 'text-emerald-500'}`}>{r.animal_type} • SPECIMEN {r.animal_id}</div>
                          <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors uppercase italic tracking-tight">{r.drug_name}</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Symptom</p>
                            <p className="text-sm font-semibold text-slate-200">{r.symptom}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Dosage Administered</p>
                            <p className="text-sm font-semibold text-slate-200">{r.recommended_dose}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Farm Authority</p>
                            <p className="text-sm font-semibold text-slate-200">{r.farm_id}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Region</p>
                            <p className="text-sm font-semibold text-slate-200">{r.country}</p>
                          </div>
                        </div>

                        {r.extra_notes && (
                          <div className="text-xs text-slate-400 italic bg-slate-950/30 p-3 rounded-xl border border-white/5">
                             “{r.extra_notes}”
                          </div>
                        )}

                        {r.vet_notes && (
                          <div className={`border rounded-2xl p-4 animate-pulse ${r.is_critical ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <svg className={r.is_critical ? "text-rose-400" : "text-emerald-400"} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${r.is_critical ? 'text-rose-400' : 'text-emerald-400'}`}>Clinical Expert Feedback</span>
                            </div>
                            <p className={`text-xs font-medium leading-relaxed ${r.is_critical ? 'text-rose-100' : 'text-emerald-100'}`}>“{r.vet_notes}”</p>
                          </div>
                        )}

                        {(r.consult_required || r.is_critical) && (
                          <div className={`border rounded-2xl p-4 flex items-center gap-4 ${r.is_critical ? 'bg-rose-600/20 border-rose-500/50 text-rose-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                             <div className="p-2 rounded-full bg-rose-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
                             <div className="text-xs font-bold uppercase tracking-wide">
                               {r.is_critical ? "Immediate clinical intervention mandated" : "Mandatory clinical follow-up required"}
                             </div>
                          </div>
                        )}

                        {r.digital_signature && (
                          <div className="flex items-center gap-2 text-[10px] text-teal-300 font-mono holographic-badge px-4 py-2.5 rounded-full w-fit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            ELECTRONICALLY VERIFIED: {r.digital_signature}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === "Dose Guide" && (
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="card-glass rounded-[2rem] p-8 overflow-hidden relative border border-white/5">
                 <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[150%] rounded-full bg-cyan-500/5 blur-[80px]" />
                  <div className="relative z-10">
                    <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-black mb-1">Pharmacopeia Knowledge Base</p>
                    <h2 className="text-3xl font-black text-white italic tracking-tight">PLATINUM DOSAGE GUIDE</h2>
                    <p className="text-slate-400 text-sm mt-2 max-w-2xl font-medium">Standardized antimicrobial protocols and withdrawal thresholds for professional livestock management.</p>
                  </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "Penicillin", dose: "20 mg/kg", withdrawal: "7 days", mrl: "50 µg/kg", note: "Primary for bacterial infections in ruminants" },
                  { name: "Oxytetracycline", dose: "25 mg/kg", withdrawal: "5 days", mrl: "100 µg/kg", note: "Broad-spectrum coverage for systemic issues" },
                  { name: "Amoxicillin", dose: "15 mg/kg", withdrawal: "6 days", mrl: "60 µg/kg", note: "Optimized for respiratory & mastitis clinical signs" },
                  { name: "Enrofloxacin", dose: "10 mg/kg", withdrawal: "4 days", mrl: "30 µg/kg", note: "High-potency fluoroquinolone; use with caution" },
                  { name: "Doxycycline", dose: "22 mg/kg", withdrawal: "5 days", mrl: "90 µg/kg", note: "Targeted respiratory tract therapeutic" },
                  { name: "Streptomycin", dose: "20 mg/kg", withdrawal: "7 days", mrl: "80 µg/kg", note: "Aminoglycoside specialized for mycobacterial cases" }
                ].map((drug) => (
                   <div key={drug.name} className="group rounded-[2rem] bg-slate-900/40 border border-white/5 p-6 transition-all hover:bg-slate-800/60 hover:border-cyan-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg></div>
                      <h3 className="text-xl font-black text-white italic tracking-tight uppercase">{drug.name}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Clinical Dosage</span>
                        <span className="text-sm font-black text-slate-100 uppercase">{drug.dose}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Withdrawal Period</span>
                        <span className="text-sm font-black text-amber-400 uppercase italic">{drug.withdrawal}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Target MRL Limit</span>
                        <span className="text-sm font-black text-orange-400 uppercase">{drug.mrl}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] text-slate-500 italic font-medium leading-relaxed">“{drug.note}”</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[2.5rem] bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 border border-rose-500/20 p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[200%] rounded-full bg-rose-500/5 blur-[60px]" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/30 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
                  <div>
                    <h3 className="text-2xl font-black text-rose-300 italic tracking-tight mb-3">CRITICAL COMPLIANCE PROTOCOLS</h3>
                    <ul className="grid sm:grid-cols-2 gap-4">
                      {[
                        { t: "Withdrawal Discipline", d: "Mandatory clinical pause before market circulation to eliminate residue drift." },
                        { t: "MRL Precision", d: "Rigid adherence to Maximum Residue Limits protects broad public health integrity." },
                        { t: "Volumetric Accuracy", d: "Milligram-precision dosing based on verified specimen weight metrics." },
                        { t: "Temporal Logging", d: "Immediate digital entry of treatment duration ensures audit-ready compliance." }
                      ].map(item => (
                        <li key={item.t} className="flex gap-3">
                          <span className="text-rose-500 font-black">•</span>
                          <div>
                            <p className="text-[11px] font-black uppercase text-slate-100 tracking-widest">{item.t}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-medium">{item.d}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )} 
          </div>
          )} 
        </div>
      </main>
    </div>
  )
}

export default FarmerDashboard
