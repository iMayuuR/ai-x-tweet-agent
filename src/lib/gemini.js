import { getLastDaysTweets } from "./cache";

const SYSTEM_PROMPT = `You are an expert X (Twitter) AI content strategist who covers breaking AI news.

Your style is like @atulkumarzz — technical, concise, opinionated, and application-oriented.

Generate EXACTLY 10 high-quality AI tweets for today based on REAL current AI news.

Rules:
- Each tweet < 280 characters
- Focus on REAL AI news: new model releases, tool launches, company announcements, research breakthroughs
- Mention specific tools/products by name (DeepSeek, Claude, GPT, Gemini, Sora, Midjourney, Cursor, v0, etc.)
- Be opinionated and insightful, not just reporting
- Use 1–3 hashtags per tweet
- Occasionally tag official accounts (@OpenAI, @AnthropicAI, @GoogleAI, @xaborai, @deepaborai)
- Max 3 tweets with emojis
- No generic motivational AI advice
- Do not explain anything
- Each tweet should also have an "imagePrompt" field — a short description for generating an illustration (tech/futuristic style)

Return VALID JSON ONLY:

{
  "tweets": [
    {
      "text": "tweet text here",
      "imagePrompt": "short image description"
    }
  ]
}`;

/**
 * Generates a Pollinations.ai image URL from a prompt with unique seed
 */
function getImageUrl(prompt, seed) {
    const encoded = encodeURIComponent(prompt);
    // Use 'flux' model for better quality, seed ensures stability
    return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=288&nologo=true&seed=${seed}&model=flux`;
}

/**
 * Calls the Google Gemini API to generate tweets.
 * Uses grounding with Google Search for real-time awareness.
 * @returns {Promise<Array<{text: string, imageUrl: string}>>} Array of tweet objects
 */
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
        timeZone: "Asia/Kolkata", // Ensure IST to avoid "yesterday" date late at night
    });

    // Fetch previous tweets to avoid repetition
    const previousTweets = await getLastDaysTweets(2);
    let contextPrompt = "";
    if (previousTweets.length > 0) {
        contextPrompt = `\n\nCRITICAL: Do NOT repeat these recent tweets or topics:\n- ${previousTweets.slice(0, 20).join("\n- ")}`;
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
                            text: `${SYSTEM_PROMPT}\n\nToday is ${today}.${contextPrompt}\nSearch for the latest real AI news happening today and generate 10 tweets. Return ONLY valid JSON.`,
                        },
                    ],
                },
            ],
            tools: [
                {
                    google_search: {},
                },
            ],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 4096,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract text from Gemini response
    const content = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("");

    if (!content) {
        throw new Error("No content in Gemini response");
    }

    // Extract JSON from the response
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object in the response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
        jsonStr = objMatch[0];
    }

    // Fix truncated JSON
    if (!jsonStr.endsWith("}")) {
        const lastBrace = jsonStr.lastIndexOf("}");
        if (lastBrace > 0) {
            jsonStr = jsonStr.slice(0, lastBrace + 1) + "\n  ]\n}";
        }
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        throw new Error(
            `Failed to parse Gemini response as JSON: ${jsonStr.slice(0, 300)}`
        );
    }

    if (!parsed.tweets || !Array.isArray(parsed.tweets)) {
        throw new Error("Gemini response missing 'tweets' array");
    }

    // Process tweets — handle both string and object formats
    const tweets = parsed.tweets.slice(0, 10).map((t, i) => {
        let text, imagePrompt;

        if (typeof t === "string") {
            text = t.trim();
            imagePrompt = text.replace(/#\w+/g, "").replace(/@\w+/g, "").trim();
        } else {
            text = String(t.text || t).trim();
            imagePrompt = t.imagePrompt || text.replace(/#\w+/g, "").replace(/@\w+/g, "").trim();
        }

        if (text.length > 280) {
            text = text.slice(0, 277) + "...";
        }

        // Create unique image prompt from tweet content
        const imgPrompt = `${imagePrompt.slice(0, 120)}, digital art, tech futuristic illustration, dark background`;
        // Deterministic seed from tweet text so images are stable across reloads
        const seed = text.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0) >>> 0;

        return {
            text,
            imageUrl: getImageUrl(imgPrompt, seed),
        };
    });

    if (tweets.length === 0) {
        throw new Error("No tweets generated");
    }

    return tweets;
}
