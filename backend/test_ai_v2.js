const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const { generateResponse } = require('./ai_engine');

async function testAI() {
    console.log("Testing AI Connection (v1beta with Fallback)...");
    const roles = ["farmer", "vet", "admin"];
    const mockContext = [
        { record_id: "REC-1", animals: "Cattle", token_number: "TK-12345", status: "Approved" },
        { record_id: "REC-2", animals: "Pig", token_number: "TK-67890", status: "Pending" }
    ];

    for (const role of roles) {
        console.log(`\n--- Testing Role: ${role} ---`);
        try {
            const response = await generateResponse(`Hello, I am testing the ${role} assistant.`, role, mockContext);
            console.log("AI Response:", response.reply);
            if (response.reply.includes("Unable to reach central cognitive servers")) {
                console.error(`FAILED for ${role}: Still getting AI error`);
            } else {
                console.log(`SUCCESS for ${role}: AI is working!`);
            }
        } catch (err) {
            console.error(`Test Error for ${role}:`, err);
        }
    }
}

testAI();
