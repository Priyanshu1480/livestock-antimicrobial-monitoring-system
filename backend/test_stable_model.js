const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testStable() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = "gemini-2.5-flash"; // Stable version from the list

    console.log(`Testing Model: ${modelName}`);
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

testStable();
