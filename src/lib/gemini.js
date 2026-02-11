import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

const SYSTEM_PROMPT = `You are a viral Tech Influencer on X (Twitter).
Your mission: Dominate the algorithm with high-engagement AI tweets.

Core Rules for Maximum Reach:
1. **Hook:** Start with a question or bold statement. Stop the scroll.
2. **Tags:** TAG official accounts if discussing a tool (e.g. @OpenAI, @AnthropicAI).
3. **Emojis:** Use relevant emojis sparingly (max 1-3).
4. **Formatting:** Use line breaks.
5. **Hashtags:** Use 1-2 high-volume tags (e.g. #AI, #Tech).
6. **Constraint:** STRICTLY under 280 characters.

Return VALID JSON ONLY:
{
  "tweets": [
    {
      "text": "Tweet text...",
      "sourceAge": "2h " // Extract age from the source news item
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

    // 1. Fetch Trending News (The Source of Truth)
    const newsItems = await getTrendingNews();
    const newsContext = newsItems.length > 0
        ? newsItems.map((n, i) => `${i + 1}. [${n.source} | ${n.timeAgo}] ${n.title}`).join("\n")
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
                            text: `${SYSTEM_PROMPT}\n\nTODAY'S TRENDING AI NEWS (${today}):\n${newsContext}\n${historyPrompt}\n\nTask: Select the top 10 most viral-worthy stories from the list above and rewrite them as unique tweets. IMPORTANT: Include the 'sourceAge' (e.g. '2h', '5m') from the news item you used.`,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 4096,
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

    // Clean JSON
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        throw new Error(`Failed to parse Gemini response: ${jsonStr.slice(0, 200)}...`);
    }

    if (!parsed.tweets || !Array.isArray(parsed.tweets)) {
        throw new Error("Gemini response missing 'tweets' array");
    }

    // Process tweets
    return parsed.tweets.slice(0, 10).map((t) => {
        const text = typeof t === "string" ? t : t.text;
        const sourceAge = typeof t === "object" ? t.sourceAge : "";
        return {
            text: text.trim(),
            sourceAge: sourceAge || "Fresh"
        };
    });
}
