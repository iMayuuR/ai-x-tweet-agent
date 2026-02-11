
const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env'); // .env is in root, script in scripts/
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
            for (const line of lines) {
                // Match lines like: KEY="value", KEY=value, KEY=value # comment
                const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    let key = match[1];
                    let value = match[2] || '';

                    // Remove end-of-line comments starting with #
                    const commentIndex = value.indexOf('#');
                    if (commentIndex !== -1) {
                        value = value.substring(0, commentIndex);
                    }

                    value = value.trim();

                    // Remove surrounding quotes
                    if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    } else if (value.length > 1 && value.startsWith("'") && value.endsWith("'")) {
                        value = value.slice(1, -1);
                    }
                    process.env[key] = value;
                }
            }
        }
    } catch (e) { }
}
loadEnv();

async function testModel(modelName) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.error("❌ Missing API Key");

    // Log masked key for verification
    const maskedKey = apiKey.length > 10 ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}` : "INV";
    console.log(`Key: ${maskedKey}`);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const start = Date.now();

    try {
        console.log(`Endpoint: ${endpoint.replace(apiKey, "HIDDEN")}`);
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "Hi" }] }]
            })
        });

        const duration = Date.now() - start;
        if (!response.ok) {
            console.log(`❌ ${modelName}: Failed ${response.status} (${duration}ms)`);
            const err = await response.text();
            console.log(`   Internal Error: ${err}`);
        } else {
            console.log(`✅ ${modelName}: Success (${duration}ms)`);
        }
    } catch (e) {
        console.log(`❌ ${modelName}: Error ${e.message}`);
    }
}

async function runTests() {
    console.log("Testing API Connectivity...");
    // 1. High Speed 
    await testModel("gemini-1.5-flash-8b");
    // 2. Stable
    await testModel("gemini-1.5-flash");
    // 3. Legacy (If 1.5 fails)
    await testModel("gemini-pro");
}

runTests();
