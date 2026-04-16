const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Using API Key:", apiKey ? "FOUND" : "MISSING");
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Listing models...");
        // This might fail if the SDK doesn't support listModels directly on genAI
        // but let's try or use fetch
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("Models found:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error listing models:", err);
    }
}

listModels();
