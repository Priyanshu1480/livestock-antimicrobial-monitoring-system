const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function debugAll() {
    const apiKey = process.env.GEMINI_API_KEY;
    const models = [
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-3.1-flash-live-preview-preview-12-2025"
    ];
    const versions = ["v1", "v1beta"];

    for (let v of versions) {
        for (let m of models) {
            console.log(`--- Testing ${v} with ${m} ---`);
            try {
                const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
                const body = {
                    contents: [{ parts: [{ text: "Hello" }] }]
                };
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (res.ok) {
                    console.log(`SUCCESS: ${v}/${m} works!`);
                    return { v, m };
                } else {
                    console.log(`FAILED: ${v}/${m} -> ${res.status} ${data.error?.message || JSON.stringify(data)}`);
                }
            } catch (err) {
                console.log(`ERROR: ${v}/${m} -> ${err.message}`);
            }
        }
    }
}

debugAll();
