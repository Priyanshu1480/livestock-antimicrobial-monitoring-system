const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function testV1NoSystemInstruction() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Testing with v1 and NO systemInstruction...");
    try {
        // Use v1 and a newer model name from the list
        // Note: I'll use gemini-1.5-flash if I can find it, or gemini-pro
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }, { apiVersion: 'v1' });
        const prompt = "SYSTEM: You are Barnaby, a farmer. Respond to: Hello!";
        const result = await model.generateContent(prompt);
        console.log("Response:", result.response.text());
        console.log("SUCCESS!");
    } catch (err) {
        console.error("FAILED:", err.message);
    }
}

testV1NoSystemInstruction();
