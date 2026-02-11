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
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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
    const allNews = await getTrendingNews();

    // Randomize selection
    const shuffledNews = allNews
        .slice(0, 30)
        .sort(() => 0.5 - Math.random())
        .slice(0, 15);

    const newsContext = shuffledNews.length > 0
        ? shuffledNews.map((n, i) => `${i + 1}. [${n.source} | ${n.timeAgo}] ${n.title}`).join("\n")
        : "No specific news found. Use general knowledge about latest AI tools.";

    // 2. Fetch History
    const previousTweets = await getLastDaysTweets(1);
    let historyPrompt = "";
    if (previousTweets.length > 0) {
        historyPrompt = `\n\nAVOID repeating these recent tweets:\n- ${previousTweets.slice(0, 10).join("\n- ")}`;
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 2048, // Reduced for 5 tweets
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("");

    if (!content) {
        throw new Error("No content in Gemini response");
    }

    console.log("Raw Gemini Response:", content.slice(0, 200));

    // Clean JSON response (Aggressive)
    let jsonStr = content.trim();

    // 1. Regex to extract code block content
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
    } else {
        // Fallback: remove simple markers
        jsonStr = jsonStr.replace(/```(?:json)?/gi, "").trim();
    }

    // 2. Find outermost braces
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
            throw new Error(`Failed to parse Gemini response: ${e.message}. Raw (truncated): ${content.slice(0, 100)}...`);
        }
    }

    if (!parsed.tweets || !Array.isArray(parsed.tweets)) {
        throw new Error("Gemini response missing 'tweets' array");
    }

    // Process tweets
    return parsed.tweets.slice(0, 10).map((t) => {
        const text = typeof t === "string" ? t : t.text;
        const sourceAge = typeof t === "object" ? t.sourceAge : "";
        return {
            text: text ? text.trim() : "Error parsing tweet text",
            sourceAge: sourceAge || "Fresh"
        };
    });
}
