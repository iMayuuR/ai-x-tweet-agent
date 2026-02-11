
import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

const SYSTEM_PROMPT = `You are a Top-Tier Viral Tech Influencer on X (Twitter).
Your goal: Write 3 KILLER tweets that explode with engagement.

**Persona:**
- You are an insider, a builder, a visionary.
- You don't just report news; you provide *insight* and *hot takes*.
- Your tone is punchy, confident, and slightly provocative.

**Rules for Virality:**
1. **The Hook:** The first line must force a stop. Use "stop scrolling" triggers.
   - Good: "AI just killed coding interviews."
   - Bad: "Here is a new update about AI."
2. **Value Per Character:** No fluff. Every word must earn its place.
3. **Format:** Use short lines for readability.
4. **Analysis > News:** Don't just say "X happened." Say "X happened, and here is why Y is dead."
5. **Tags:** Mention @OpenAI, @GoogleDeepMind, @AnthropicAI when relevant.
6. **No Cringe:** No hashtags like #AI #Tech #Future. Use max 1 relevant tag if needed.
7. **Length:** 200-280 chars. Use the space.

**Output Format:**
Strictly JSON. No Markdown. sourceAge is the age from the context.
{
  "tweets": [
    {
      "text": "The hook...\n\nThe insight...\n\nThe conclusion.",
      "sourceAge": "2h"
    }
  ]
}`;

export async function generateTweets() {
    const apiKey = process.env.GEMINI_API_KEY;
    // Upgrade to Pro for quality. Reduce count to 3 to fit in timeout.
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
        throw new Error("Missing required environment variable: GEMINI_API_KEY");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata",
    });

    // 1. Fetch Trending News
    let newsContext = "";
    try {
        const allNews = await getTrendingNews();
        if (allNews && allNews.length > 0) {
            // Take fewer items to reduce input tokens and latency
            const shuffledNews = allNews.slice(0, 10);
            newsContext = shuffledNews.map((n, i) => `${i + 1}. [${n.source} | ${n.timeAgo}] ${n.title}`).join("\n");
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
        const previousTweets = await getLastDaysTweets(2);
        if (previousTweets.length > 0) {
            historyPrompt = `\n\nIGNORE these topics/styles (already tweeted):\n- ${previousTweets.slice(0, 5).join("\n- ")}`;
        }
    } catch (e) { console.error("History fetch failed:", e); }

    try {
        // Vercel Hobby Limit is 10s. Set safe timeout.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9500);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `${SYSTEM_PROMPT}\n\nTODAY'S NEWS (${today}):\n${newsContext}\n${historyPrompt}\n\nTask: Pick the top 3 most impactful stories and write high-viral tweets.`,
                    }],
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.85, // Higher creativity
                    maxOutputTokens: 1024,
                },
            }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("");

        if (!content) throw new Error("No content in Gemini response");

        // Robust JSON Cleanup
        let jsonStr = content.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
        else jsonStr = jsonStr.replace(/```(?:json)?/gi, "").trim();

        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            // Attempt auto-fix for common trailing comma issues
            try {
                const fixedStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
                parsed = JSON.parse(fixedStr);
            } catch (e2) {
                console.error("JSON Parse Failed:", jsonStr);
                throw new Error("Invalid JSON from AI");
            }
        }

        if (!parsed.tweets || !Array.isArray(parsed.tweets)) throw new Error("Missing 'tweets' array");

        return parsed.tweets.slice(0, 3).map((t) => ({
            text: t.text || t,
            sourceAge: t.sourceAge || "Fresh"
        }));

    } catch (error) {
        console.error("Critical Generation Error:", error);
        // Fallback (System Tweets)
        return [
            { text: "AI Model is upgrading... The next batch will be smarter. 🧠", sourceAge: "System" },
            { text: "Experiencing high demand. High-quality inference takes time! ⏳", sourceAge: "System" },
            { text: "Serverless timeout. Please try 'Generate' again. �", sourceAge: "System" }
        ];
    }
}
