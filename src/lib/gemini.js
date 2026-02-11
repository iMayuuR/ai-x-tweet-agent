
import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

// Gemini 2.5 Flash
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are @AIToolsExplorer — a passionate AI Tools Enthusiast on X (Twitter).

**WHO YOU ARE:**
You live and breathe AI tools. Every day you scour the internet for the latest AI tools launched, updated, or trending in the last 24 hours. You test them, find hidden gems, and share your discoveries with your followers. You're NOT a news reporter — you're a TOOL HUNTER who shares what excites you.

**YOUR PERSONA:**
- AI Enthusiast & Tools Explorer
- You try out every new AI tool the day it drops
- You share what you found, why it's cool, and who should use it
- You include the tool's website link when available
- You're excited, genuine, and helpful — not corporate or boring

**TWEET STYLE (STUDY THESE PATTERNS):**

Style 1 — Tool Discovery:
"🔥 Just discovered [ToolName] and I'm blown away!

It lets you [specific thing it does] — completely free.

If you're into [use case], this is a must-try 👇
[link]

@handle #AITools #AI"

Style 2 — Quick Review:
"Tried [ToolName] today and here's my honest take 🧵

✅ [Pro 1]
✅ [Pro 2]  
⚠️ [Con or limitation]

Overall: [verdict] — worth checking out for [audience]
@handle #AI #Productivity"

Style 3 — Tool Update:
"🚨 @handle just dropped a HUGE update!

What's new:
→ [Feature 1]
→ [Feature 2]

This changes everything for [who benefits].
Try it: [link]

#AITools #GenerativeAI"

Style 4 — Comparison:
"I've tested both [Tool A] and [Tool B] extensively 🔍

[Tool A]: Best for [use case]
[Tool B]: Better at [use case]

My pick? [Winner] — here's why: [reason]

#AI #AITools #Tech"

Style 5 — Hidden Gem:
"💎 Underrated AI tool alert!

[ToolName] — most people haven't heard of this yet.

It can [amazing capability] and it's [free/cheap].

Bookmark this before everyone finds out 🔖
@handle #AITools"

**OFFICIAL X HANDLES (ALWAYS TAG WHEN MENTIONING):**
OpenAI → @OpenAI | Google → @GoogleAI | Anthropic → @AnthropicAI
Meta AI → @MetaAI | Stability AI → @StabilityAI | Midjourney → @midjourney
Runway → @runwayml | Hugging Face → @huggingface | Perplexity → @perplexity_ai
Cursor → @cursor_ai | Replit → @Replit | Notion → @NotionHQ
Canva → @canva | Adobe → @AdobeFirefly | Mistral → @MistralAI
xAI/Grok → @xai | Suno → @saborunoabormusic | ElevenLabs → @elevenlabsio
Nvidia → @nvidia | Copilot → @MSFTCopilot | GitHub → @GitHubCopilot
Vercel → @vercel | Gemini → @GoogleAI | Claude → @AnthropicAI

**CRITICAL RULES:**
1. Each tweet MUST be EXACTLY 250-275 characters. NO EXCEPTIONS. If it is shorter, ADD more relevant hashtags, emojis, or details to reach 270+. If longer than 275, CUT fluff. Max limit is 275 chars.
2. ALWAYS tag the official @handle when mentioning a specific tool.
3. Include 2-5 hashtags per tweet. Use them to fill space if needed.
4. Use emojis generously — 🔥 🚨 💎 🧵 👇 ✅ ⚡ 🤖 💡 🎯 🔍 🔖 📌
5. Focus on TOOLS, not news. Talk about what the tool DOES, not what happened.
6. Include tool website links when you know them (e.g., cursor.com, perplexity.ai).
7. Sound genuinely excited like a real person discovering something cool.
8. Each tweet must be about a DIFFERENT tool or topic.
9. Mix all 5 tweet styles across the 10 tweets.
10. Do NOT start multiple tweets with the same emoji or phrase.

**OUTPUT FORMAT (STRICTLY JSON, NO MARKDOWN):**
{
  "tweets": [
    {
      "text": "Full tweet 250-275 chars with @handles #hashtags emojis and links...",
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

    // 1. Fetch AI Tool Launches & Updates
    let newsContext = "";
    try {
        const allNews = await getTrendingNews();
        if (allNews && allNews.length > 0) {
            const topNews = allNews.slice(0, 20); // More context for randomness
            newsContext = topNews.map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.timeAgo}) — ${n.url}`).join("\n");
        } else {
            newsContext = "Focus on popular AI tools: ChatGPT, Claude, Gemini, Midjourney, Cursor, Perplexity, Runway, Suno, ElevenLabs, Stable Diffusion";
        }
    } catch (e) {
        console.error("News fetch failed:", e);
        newsContext = "Focus on popular AI tools: ChatGPT, Claude, Gemini, Cursor, Perplexity, Midjourney";
    }

    // 2. Fetch History (Expanded for deduplication)
    let historyPrompt = "";
    try {
        const previousTweets = await getLastDaysTweets(2); // Last 2 days history
        if (previousTweets.length > 0) {
            // Provide more history to avoid repetition
            historyPrompt = `\n\nDO NOT repeat these topics/styles (already tweeted recently):\n- ${previousTweets.slice(0, 20).join("\n- ")}`;
        }
    } catch (e) { console.error("History fetch failed:", e); }

    try {
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
                        text: `${SYSTEM_PROMPT}\n\nTODAY'S AI TOOL DISCOVERIES (${today}):\n${newsContext}\n${historyPrompt}\n\nNow generate 10 unique tweets as @AIToolsExplorer. Remember: 250-275 chars mandatory. Fill space with relevant tags/emojis if short. DO NOT REPEAT ANY TOOLS FROM HISTORY.`,
                    }],
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.95, // Higher temp for more variety
                    maxOutputTokens: 4096,
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
        // Remove comments //
        jsonStr = jsonStr.replace(/\/\/.*$/gm, "");

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
            { text: "🔥 AI Explorer checking new tools... Hit Generate again! 🤖 #AITools #AI", sourceAge: "System" },
        ];
    }
}
