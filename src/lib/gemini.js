
import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

// Reverting to STABLE model to fix 404 errors
const MODEL_NAME = "gemini-1.5-flash";

const SYSTEM_PROMPT = `You are a Ghostwriter for a Silicon Valley Tech Visionary.
Your goal: 3 high-signal, viral tweets about today's AI news.

**Style Guide:**
- **No cringe:** BANNED words: "game-changer", "revolution", "buckle up", "unleash", "world of possibilities".
- **Direct & Punchy:** Start with the insight. Cut the fluff.
- **Insider Tone:** Sound like you are building the future, not just watching it.
- **Skeptical Optimism:** Hype is cheap. Analysis is valuable.

**Tweet Structure:**
1. **The Hook:** A bold claim or surprising fact.
2. **The Meat:** The core update + why it matters.
3. **The Take:** Your unique perspective or prediction.

**Format:**
- Max 280 chars.
- Use line breaks for readability.
- Max 1 tag (e.g. @OpenAI) only if relevant.

**Output:**
Strictly JSON.
{
  "tweets": [
    {
      "text": "Tweet body here...",
      "sourceAge": "2h"
    }
  ]
}`;

export async function generateTweets() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Missing required environment variable: GEMINI_API_KEY");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    // 1. Fetch Trending News
    let newsContext = "";
    try {
        const allNews = await getTrendingNews();
        if (allNews && allNews.length > 0) {
            const topNews = allNews.slice(0, 8);
            newsContext = topNews.map((n, i) => `${i + 1}. ${n.title} (Source: ${n.source}, Age: ${n.timeAgo})`).join("\n");
        } else {
            newsContext = "General AI Trends (Model Reasoning Mode)";
        }
    } catch (e) {
        console.error("News fetch failed:", e);
        newsContext = "General AI Trends";
    }

    // 2. Fetch History
    let historyPrompt = "";
    try {
        const previousTweets = await getLastDaysTweets(1);
        if (previousTweets.length > 0) {
            historyPrompt = `\n\nAVOID these recent topics:\n- ${previousTweets.slice(0, 5).join("\n- ")}`;
        }
    } catch (e) { console.error("History fetch failed:", e); }

    try {
        // Vercel Limit 10s. Set 9s timeout.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `${SYSTEM_PROMPT}\n\nTODAY'S INTEL (${today}):\n${newsContext}\n${historyPrompt}\n\nTask: Draft 3 viral tweets based on the Intel above.`,
                    }],
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 512,
                },
            }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Failed: ${response.status} - ${errorText}`);
            throw new Error(`Gemini API error (${response.status})`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("");

        if (!content) throw new Error("No content in Gemini response");

        // Advanced Cleaning
        let jsonStr = content.trim();
        jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            const fixed = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
            parsed = JSON.parse(fixed);
        }

        if (!parsed.tweets || !Array.isArray(parsed.tweets)) throw new Error("Missing 'tweets' array");

        return parsed.tweets.slice(0, 3).map((t) => ({
            text: t.text || t,
            sourceAge: t.sourceAge || "Fresh"
        }));

    } catch (error) {
        // Fallback
        return [
            { text: "System Update: Checking API Connectivity... 📡", sourceAge: "System" },
            { text: "AI is rebooting. Please generate again in a moment. 🔄", sourceAge: "System" },
            { text: "Experiencing high traffic. Stand by. 🚦", sourceAge: "System" }
        ];
    }
}
