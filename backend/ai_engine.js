const { GoogleGenerativeAI } = require('@google/generative-ai');

const PERSONAS = {
    farmer: {
        name: "AgroLens AI",
        title: "Farm Intelligence Assistant",
        greeting: "Hello, I am the AgroLens AI. How can I help you with your livestock records today?",
        style: "Direct, professional, factual, very helpful, similar to standard Gemini.",
        bio: "An advanced intelligence model designed to assist with livestock monitoring.",
        domain: "Agricultural Support"
    },
    vet: {
        name: "AgroLens AI",
        title: "Clinical Assistant",
        greeting: "Hello, Doctor. I am the AgroLens AI. I am ready to assist with clinical diagnosis.",
        style: "Direct, professional, medical, factual, similar to standard Gemini.",
        bio: "An advanced intelligence model assisting veterinary professionals.",
        domain: "Clinical Governance"
    },
    admin: {
        name: "AgroLens AI",
        title: "Systems Intelligence",
        greeting: "Hello, Administrator. AgroLens AI is online and ready to assist.",
        style: "Direct, professional, concise, similar to standard Gemini.",
        bio: "An advanced intelligence model for system auditing.",
        domain: "System Integrity"
    }
};

async function generateResponse(message, role = "farmer", recordsContext = [], imageBase64 = null, systemAnalytics = null) {
    const persona = PERSONAS[role] || PERSONAS.farmer;
    const lowerMessage = message.toLowerCase();

    // Fast-path for simple greetings
    if ((lowerMessage === "hello" || lowerMessage === "hi" || lowerMessage === "hey")) {
        return {
            reply: persona.greeting,
            analysis: null,
            personaName: persona.name,
            personaTitle: persona.title
        };
    }
    
    if ((lowerMessage.includes("who are you") || lowerMessage.includes("introduce yourself"))) {
        return {
            reply: `I am ${persona.name}, your ${persona.title}. ${persona.bio} I specialize in ${persona.domain}.`,
            analysis: null,
            personaName: persona.name,
            personaTitle: persona.title
        };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return {
            reply: `[System Module Alert]: Gemini API Key is missing! To enable ${persona.name}'s full cognitive knowledge base, please add your GEMINI_API_KEY to the backend/.env file.`,
            analysis: null,
            personaName: persona.name,
            personaTitle: persona.title
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey); 
        
        // Priority list of universally STABLE models for this specific API Hub
        const STABLE_MODELS = [
            "gemini-2.5-flash", 
            "gemini-flash-latest",
            "gemini-2.0-flash"
        ];

        let responseText = "";
        let lastError = null;

        const systemInstruction = `You are ${persona.name}, ${persona.title}. 
Role: ${persona.domain}
Bio: ${persona.bio}
Style: ${persona.style}. 

CRITICAL: STAY IN CHARACTER AT ALL TIMES.
Context: You have access to recent livestock records. Use them to answer questions about specific cases (TK-#####).

SYNCHRONIZATION PROTOCOL:
- Farmers: mention "fever", "mastitis", "pneumonia", "cough", "infection", or "wound" for diagnosis triggers.
- Vets: Use the format "TK-#####" for caseIDs.
- Keep answers brief & practical (3-4 sentences).`;

        for (const modelName of STABLE_MODELS) {
            try {
                // Remove systemInstruction from config to avoid 400 Bad Request on older models like gemini-pro
                const model = genAI.getGenerativeModel({ model: modelName });
                
                // Inject the live records so the AI stops hallucinating metrics
                const databaseDump = recordsContext && recordsContext.length > 0 
                     ? JSON.stringify(recordsContext) 
                     : "No live database records available.";

                const analyticsDump = systemAnalytics ? `Total System Records: ${systemAnalytics.total_historical_records}\nTotal Approved: ${systemAnalytics.currently_approved}\nTotal Pending: ${systemAnalytics.currently_pending}\nTotal Rejected: ${systemAnalytics.currently_rejected}` : "No pre-computed analytics available.";

                // Prepend system instruction to guarantee compatibility across all model generations
                const safePrompt = `${systemInstruction}\n\n====================\nPRE-COMPUTED DATABASE ANALYTICS (Use these for counting aggregations):\n${analyticsDump}\n\n====================\nLIVE DATABASE RECORDS (Answer questions based on this exact data ONLY):\n${databaseDump}\n\n====================\nUSER MESSAGE:\n${message}`;
                const contents = [{ role: "user", parts: [{ text: safePrompt }] }];
                
                const result = await model.generateContent({ contents });
                responseText = result.response.text();
                if (responseText) break; 
            } catch (err) {
                console.warn(`Fallback triggered: ${modelName} failed.`, err.message);
                lastError = err;
            }
        }

        // --- LOCAL FALLBACK ENGINE (If Cloud Fails) ---
        if (!responseText) {
            console.log("Cloud API failed. Activating Local Intelligence Fallback...");
            const offlineResponses = {
                farmer: {
                    fever: "I reckon that animal's got a fever. Best track it with CaseID TK-FEVER. Use Paracetamol as recommended.",
                    mastitis: "Sounds like mastitis to me. Keep 'em clean and check the udders. Suggest Penicillin treatment.",
                    cough: "A nasty cough in the herd needs attention. Check CaseID TK-COUGH. Bromhexine might help.",
                    pneumonia: "Pneumonia is serious business. Isolate the animal and use Enrofloxacin immediately.",
                    infection: "Infections spread quick. Oxytetracycline is our best bet here.",
                    wound: "Clean that wound up good. A topical antibiotic will have 'em fixed in no time."
                },
                vet: "Clinical analysis requires an active cloud connection. Please verify MRL compliance manually for now.",
                admin: "System Core in fallback mode. Governance protocols maintained. Complex database queries unavailable."
            };

            // Enhanced keyword matching for Farmer
            if (role === "farmer") {
                const triggerWords = ["fever", "mastitis", "cough", "pneumonia", "infection", "wound"];
                const match = triggerWords.find(word => lowerMessage.includes(word));
                if (match) {
                    responseText = offlineResponses.farmer[match];
                } else if (lowerMessage.includes("record") || lowerMessage.includes("how many") || lowerMessage.includes("approved")) {
                    responseText = "I'm sorry, I can't look up specific database records right now because my cloud connection to the Gemini API is down due to Quota Limits. Want me to help diagnose a basic symptom instead?";
                } else {
                    responseText = "I didn't quite catch that. I currently have a weak cloud connection, but I can still help you diagnose symptoms like fever, cough, or infections!";
                }
            } else {
                responseText = offlineResponses[role] || "System operating in localized mode. Please try again when the cloud connection restores.";
            }
            
            // Append a subtle note for transparency
            responseText += " [Local Instance: API Quota Exceeded/Down]";
        }

        // Enhanced Analysis (Works for both Cloud and Local)
        let analysis = null;
        
        const diseaseKeywords = [
            { key: "fever", drug: "Paracetamol" },
            { key: "cough", drug: "Bromhexine" },
            { key: "mastitis", drug: "Penicillin" },
            { key: "pneumonia", drug: "Enrofloxacin" },
            { key: "infection", drug: "Oxytetracycline" },
            { key: "wound", drug: "Topical Antibiotic" }
        ];

        for (let d of diseaseKeywords) {
            if (lowerMessage.includes(d.key) || responseText.toLowerCase().includes(d.key)) {
                if (role === "farmer") {
                   analysis = {
                       type: "farmer_sync",
                       problem: d.key.charAt(0).toUpperCase() + d.key.slice(1),
                       symptom: message,
                       suggestedDrug: d.drug
                   };
                }
                break;
            }
        }

        // Vet Analysis
        if (role === "vet") {
            const caseMatch = lowerMessage.match(/tk-\w+/i) || responseText.match(/tk-\w+/i);
            if (caseMatch) {
                analysis = {
                    type: "vet_sync",
                    caseId: caseMatch[0].toUpperCase(),
                    notes: `AI Suggestion: ${responseText.slice(0, 50)}...`,
                    suggestedDrug: diseaseKeywords.find(d => responseText.toLowerCase().includes(d.key))?.drug || ""
                };
            }
        }

        // Admin Analysis
        if (role === "admin" && !analysis) {
            const locations = ["India", "USA", "Canada", "Brazil", "Germany", "Australia", "UK", "China", "South Africa"];
            const locMatch = locations.find(l => lowerMessage.includes(l.toLowerCase()));
            if (locMatch) {
                analysis = {
                    type: "admin_sync",
                    filter: locMatch,
                    action: "filter_country"
                };
            }
        }

        return {
            reply: responseText,
            analysis: analysis,
            personaName: persona.name,
            personaTitle: persona.title
        };

    } catch (error) {
        // This catch handles catastrophic failures (like syntax errors), 
        // but regular API failures are now handled by the fallback above.
        console.error("AI Engine Internal Error:", error);
        return {
            reply: `[System Stability Mode]: I'm having trouble connecting right now, but I'm still here to help with livestock records. How can I assist?`,
            analysis: null,
            personaName: persona.name,
            personaTitle: persona.title
        };
    }
}

module.exports = { generateResponse };
