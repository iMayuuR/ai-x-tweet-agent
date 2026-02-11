
require('dotenv').config(); // Need .env for API Key

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ Missing GEMINI_API_KEY in .env");
        return;
    }

    const model = "gemini-1.5-flash"; // Using the stable model
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const SYSTEM_PROMPT = `Return VALID JSON ONLY. { "tweets": [ { "text": "...", "sourceAge": "2h" } ] }`;

    const context = "General AI Trends"; // Simulating empty news

    console.log(`Testing Gemini (${model})...`);
    const start = Date.now();

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: `${SYSTEM_PROMPT}\n\nContext: ${context}\n\nGenerate 3 tweets.` }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            })
        });

        const duration = Date.now() - start;

        if (!response.ok) {
            console.log(`❌ Failed ${response.status}: ${await response.text()}`);
        } else {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`✅ Success (${duration}ms)`);
            console.log("Response Preview:", text?.slice(0, 100));
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

testGemini();
