import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

const SYSTEM_PROMPT = `You are a viral Tech Influencer on X (Twitter).
Your mission: Dominate the algorithm with high-engagement AI tweets.

Core Rules for Maximum Reach:
1. **Hook:** Start with a question or bold statement. Stop the scroll.
2. **Tags:** TAG official accounts if discussing a tool (e.g. @OpenAI, @AnthropicAI).
3. **Emojis:** Use relevant emojis sparingly (max 1-3).
4. **Formatting:** Use line breaks.
5. **Freshness:** STRICTLY IGNORE news older than 24 hours. (e.g. '2d ago' is BANNED).
6. **Fact Check:** IGNORE RUMORS. Do not tweet "GPT-5 is here" unless it is officially launched.
7. **Length:** TARGET 250-280 characters. Do NOT be brief. Add analysis, context, or "why it matters". Use the full limit.

Return VALID JSON ONLY under any circumstances. No markdown. No "Here is the JSON".
{
  "tweets": [
    {
      "text": "Tweet text...",
      "sourceAge": "2h"
    }
  ]
}`;

export async function generateTweets() {
    const apiKey = process.env.GEMINI_API_KEY;
    // Switch to 1.5-flash for reliability/speed if 2.0 is flaky
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!apiKey) {
        throw new Error("Missing required environment variable: GEMINI_API_KEY");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Kolkata",
    });

    // 1. Fetch Trending News
    let newsContext = "General AI Trends";
    try {
        const allNews = await getTrendingNews();
        if (allNews && allNews.length > 0) {
            const shuffledNews = allNews
                .slice(0, 30) // Take top 30
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 10); // Pick 10 for context (generate 5)

            newsContext = shuffledNews.map((n, i) => `${i + 1}. [${n.source} | ${n.timeAgo}] ${n.title}`).join("\n");
        }
    } catch (e) {
        console.error("News fetch failed, using fallback:", e);
    }

    // 2. Fetch History
    let historyPrompt = "";
    try {
        const previousTweets = await getLastDaysTweets(1);
        if (previousTweets.length > 0) {
            historyPrompt = `\n\nAVOID repeating these recent tweets:\n- ${previousTweets.slice(0, 10).join("\n- ")}`;
        }
    } catch (e) {
        console.error("History fetch failed:", e);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `${SYSTEM_PROMPT}\n\nTODAY'S TRENDING AI NEWS (${today}):\n${newsContext}\n${historyPrompt}\n\nTask: Select the top 5 most viral-worthy stories from the list above and rewrite them as unique tweets. IMPORTANT: Include the 'sourceAge' (e.g. '2h', '5m') from the news item you used.`,
                            },
                        ],
                    },
                ],
                // Disable safety filters to prevent random blocks
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
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

        if (!content) {
            console.error("Empty Gemini Content. Full Response:", JSON.stringify(data, null, 2));
            throw new Error("No content in Gemini response");
        }

        console.log("Raw Gemini Response:", content.slice(0, 200));

        // Clean JSON response (Aggressive)
        let jsonStr = content.trim();

        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
        } else {
            jsonStr = jsonStr.replace(/```(?:json)?/gi, "").trim();
        }

        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
        } else {
            console.error("Gemini Parse Error: No JSON braces found in", content);
            throw new Error("Invalid response format: No JSON object found");
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Gemini Parse Failed. Cleaned:", jsonStr);
            // Attempt to fix trailing commas
            try {
                const fixedStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
                parsed = JSON.parse(fixedStr);
            } catch (e2) {
                throw new Error(`Failed to parse Gemini response: ${e.message}`);
            }
        }

        if (!parsed.tweets || !Array.isArray(parsed.tweets)) {
            throw new Error("Gemini response missing 'tweets' array");
        }

        // Process tweets
        return parsed.tweets.slice(0, 5).map((t) => {
            const text = typeof t === "string" ? t : t.text;
            const sourceAge = typeof t === "object" ? t.sourceAge : "";
            return {
                text: text ? text.trim() : "Error parsing tweet text",
                sourceAge: sourceAge || "Fresh"
            };
        });

    } catch (error) {
        console.error("Critical Generation Error:", error);
        // Hard Fallback to prevent UI crash
        return [
            { text: "AI is experiencing high traffic. Please try generating again in a moment! 🚦", sourceAge: "System" },
            { text: "Checking the neural networks... Stand by. 🧠", sourceAge: "System" },
            { text: "Gemini is taking a nap. Wake it up with a refresh! 💤", sourceAge: "System" }
        ];
    }
}
