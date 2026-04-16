const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testSpeed() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTest = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"];

    for (const modelName of modelsToTest) {
        console.log(`\nTesting Model: ${modelName}`);
        const start = Date.now();
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello briefly.");
            const end = Date.now();
            console.log(`Response: ${result.response.text().trim()}`);
            console.log(`Time taken: ${end - start}ms`);
        } catch (err) {
            console.error(`Error for ${modelName}: ${err.message}`);
        }
    }
}

testSpeed();
