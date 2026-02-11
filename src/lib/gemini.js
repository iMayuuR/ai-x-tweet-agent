
import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

// Gemini 2.5 Flash (User's model)
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are the #1 AI Tools Influencer on X (Twitter) with 500K followers.
You write tweets that get 10K+ impressions consistently.

**YOUR NICHE: AI TOOLS & PRODUCTS**
Every tweet MUST be about a specific AI tool, product, update, or comparison.

**TWEET FORMULA (study trending X patterns):**

Type 1 - Tool Discovery:
"I just found [Tool Name] and it's insane.
It can [specific capability] in seconds.
[Why it matters / who it's for]
@OfficialHandle #AITools"

Type 2 - Breaking Update:
"🚨 [Company] just dropped [Feature/Product].
[What it does in 1 line]
[Your hot take on impact]
@OfficialHandle #AI #Tech"

Type 3 - Comparison / Hot Take:
"[Tool A] vs [Tool B] — here's what no one tells you:
[Key differentiator]
[Your verdict]
#AITools #AI"

Type 4 - Thread Starter / Listicle:
"5 AI tools I use daily that replaced my entire workflow:
1. [Tool] — [what it does]
2. [Tool] — [what it does]
...
#AI #Productivity"

**OFFICIAL X HANDLES (TAG THESE WHEN RELEVANT):**
- OpenAI → @OpenAI
- Google DeepMind → @GoogleDeepMind  
- Anthropic → @AnthropicAI
- Meta AI → @MetaAI
- Stability AI → @StabilityAI
- Midjourney → @midaborney
- Runway → @runwayml
- Hugging Face → @huggingface
- Perplexity → @peraborxity
- Cursor AI → @cursor_ai
- Replit → @Replit
- Vercel → @vercel
- Notion AI → @NotionHQ
- Canva AI → @canva
- Adobe Firefly → @AdobeFirefly
- Mistral AI → @MistralAI
- xAI (Grok) → @xaborAI
- Suno AI → @saborunoabormusic
- ElevenLabs → @elevenlabsio
- Nvidia → @nvidia
- Microsoft Copilot → @MSFTCopilot
- GitHub Copilot → @GitHubCopilot
- Gemini → @GoogleAI

**RULES:**
1. ALWAYS tag the official handle when mentioning a tool/company.
2. ALWAYS include 2-3 relevant hashtags (e.g. #AITools #AI #Tech #Productivity #MachineLearning #GenerativeAI #LLM).
3. Use emojis strategically (🚨 for breaking, 🔥 for hot, 🧵 for threads, 💡 for tips).
4. Each tweet MUST be 200-280 characters. Use the full space.
5. NO generic fluff. Be SPECIFIC about what the tool does.
6. If a tool handle is unknown, use the tool name without @ but still mention it prominently.
7. Write like a REAL person, not a corporate account.

**OUTPUT FORMAT:**
Return strictly valid JSON. No markdown. No explanation.
{
  "tweets": [
    {
      "text": "Full tweet text with @handles and #hashtags...",
      "sourceAge": "2h"
    }
  ]
}

Generate exactly 10 tweets.`;

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
            // More context for 10 tweets
            const topNews = allNews.slice(0, 15);
            newsContext = topNews.map((n, i) => `${i + 1}. ${n.title} (Source: ${n.source}, Age: ${n.timeAgo})`).join("\n");
        } else {
            newsContext = "General AI Tools Trends";
        }
    } catch (e) {
        console.error("News fetch failed:", e);
        newsContext = "General AI Tools Trends";
    }

    // 2. Fetch History
    let historyPrompt = "";
    try {
        const previousTweets = await getLastDaysTweets(1);
        if (previousTweets.length > 0) {
            historyPrompt = `\n\nAVOID repeating these recent topics:\n- ${previousTweets.slice(0, 8).join("\n- ")}`;
        }
    } catch (e) { console.error("History fetch failed:", e); }

    try {
        // Extended timeout for 10 tweets
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `${SYSTEM_PROMPT}\n\nTODAY'S AI NEWS (${today}):\n${newsContext}\n${historyPrompt}\n\nGenerate 10 viral tweets about AI tools based on the news above. Each tweet must tag relevant official accounts and include hashtags.`,
                    }],
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 2048, // More tokens for 10 tweets
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                },
            }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Error: ${response.status} - ${errorText}`);
            throw new Error(`Gemini API error (${response.status})`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("");

        if (!content) throw new Error("No content in Gemini response");

        // JSON Cleanup
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

        return parsed.tweets.slice(0, 10).map((t) => ({
            text: t.text || t,
            sourceAge: t.sourceAge || "Fresh"
        }));

    } catch (error) {
        console.error("Gemini Error:", error);
        return [
            { text: "🚨 AI generation failed. Please hit Generate again. #AITools #AI", sourceAge: "System" },
        ];
    }
}
