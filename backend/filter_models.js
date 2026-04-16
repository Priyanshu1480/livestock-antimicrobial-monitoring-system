const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function filterModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const flashModels = data.models.filter(m => m.name.includes("flash"));
        console.log("FLASH MODELS:");
        flashModels.forEach(m => console.log(m.name));
    } catch (err) {
        console.error("Error:", err);
    }
}

filterModels();
