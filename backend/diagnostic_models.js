const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnostic() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTest = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-pro",
        "models/gemini-2.5-flash",
        "models/gemini-1.5-flash"
    ];

    for (const modelName of modelsToTest) {
        console.log(`\n--- Testing: ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log(`SUCCESS: ${result.response.text().trim().substring(0, 20)}...`);
        } catch (err) {
            console.error(`FAILED: ${err.message}`);
        }
    }
}

diagnostic();
