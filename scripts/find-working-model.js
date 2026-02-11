
const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
            for (const line of lines) {
                const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
                if (match) process.env[match[1]] = (match[2] || '').replace(/^"|"$/g, '').trim();
            }
        }
    } catch (e) { }
}
loadEnv();

const MODELS = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro"
];

async function testModel(modelName) {
    const apiKey = process.env.GEMINI_API_KEY;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "Hi" }] }]
            })
        });

        if (response.ok) {
            console.log(`✅ ${modelName}: WORKING!`);
            return true;
        } else {
            // console.log(`❌ ${modelName}: ${response.status}`);
            process.stdout.write(`.`); // Compact output
            return false;
        }
    } catch (e) {
        process.stdout.write(`x`);
        return false;
    }
}

async function runTests() {
    console.log(`Testing ${MODELS.length} models with key ending in ...${process.env.GEMINI_API_KEY?.slice(-4)}`);

    for (const model of MODELS) {
        if (await testModel(model)) {
            console.log(`\n🎉 FOUND WORKING MODEL: ${model}`);
            // We found one!
            break;
        }
    }
    console.log("\nDone.");
}

runTests();
