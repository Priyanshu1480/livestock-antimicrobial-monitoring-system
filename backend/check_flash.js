const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const models = data.models.map(m => m.name);
        console.log("Found models:", models);
        const hasFlash = models.includes("models/gemini-1.5-flash");
        console.log(`Has models/gemini-1.5-flash: ${hasFlash}`);
    } catch (err) {
        console.error("Error:", err);
    }
}

checkModel();
