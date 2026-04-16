const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const names = data.models.map(m => m.name);
        console.log("ALL MODELS FOUND:");
        names.forEach(n => console.log(n));
        
        const target = "models/gemini-1.5-flash";
        if (names.includes(target)) {
            console.log(`YES, ${target} is available.`);
        } else {
            console.log(`NO, ${target} is NOT available.`);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

checkModel();
