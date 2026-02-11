import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const TARGET_TWEETS = 10;
const MIN_TWEET_LENGTH = 270;
const MAX_TWEET_LENGTH = 275;
const MAX_MODEL_ATTEMPTS = 3;
const HISTORY_TWEET_LIMIT = 20;
const DUPLICATE_JACCARD_THRESHOLD = 0.62;

const TOOL_FALLBACK_CONTEXT = [
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "cursor.com",
    "perplexity.ai",
    "runwayml.com",
    "midjourney.com",
    "suno.com",
    "elevenlabs.io",
    "huggingface.co",
].join(", ");

const NEWSY_PATTERNS = [
    /\bbreaking\b/i,
    /\bheadline\b/i,
    /\breported?\b/i,
    /\baccording to\b/i,
    /\bnews\b/i,
    /\bpress release\b/i,
];

const SYSTEM_PROMPT = `You are @AIToolsExplorer on X.

Persona:
- AI enthusiast and AI tools explorer.
- You scan launches and updates from the last 24 hours.
- You share practical tool discoveries, not generic AI news.

Voice:
- Excited, useful, and hands-on.
- Use strong emojis naturally.
- Write as a real creator who tests tools.

Hard rules:
1) Return exactly ${TARGET_TWEETS} tweets in JSON.
2) Every tweet must be between ${MIN_TWEET_LENGTH}-${MAX_TWEET_LENGTH} characters.
3) Topic must be AI tools only. No market/news narration.
4) Do not use framing like: breaking, headline, reported, according to, news.
5) Explain what the tool does, who should use it, and one concrete use case.
6) Include the tool link when known.
7) Tag official handles when tool/company is mentioned.
8) Hashtags are optional. Use 0 or 1 hashtag max. Never use hashtags as length filler.
9) If tweet is short, add useful detail, insight, or use-case depth instead of extra hashtags.
10) Start each tweet differently. Avoid repeated openings.

Official handle map:
OpenAI=@OpenAI, Google/Gemini=@GoogleAI, Anthropic/Claude=@AnthropicAI, Meta AI=@MetaAI,
Stability AI=@StabilityAI, Midjourney=@midjourney, Runway=@runwayml, Hugging Face=@huggingface,
Perplexity=@perplexity_ai, Cursor=@cursor_ai, Replit=@Replit, Notion=@NotionHQ, Canva=@canva,
Adobe Firefly=@AdobeFirefly, Mistral=@MistralAI, xAI=@xai, Suno=@suno_ai_, ElevenLabs=@elevenlabsio,
NVIDIA=@nvidia, GitHub Copilot=@GitHubCopilot, Vercel=@vercel.

Output format:
{
  "tweets": [
    { "text": "tweet text", "sourceAge": "2h" }
  ]
}

Return JSON only, no markdown.`;

function buildToolSignalContext(items = []) {
    if (!items.length) {
        return `No strong live tool signals found. Use fresh and practical AI tools from: ${TOOL_FALLBACK_CONTEXT}.`;
    }

    return items
        .slice(0, 15)
        .map((item, index) => {
            const title = item?.title || "Untitled tool signal";
            const source = item?.source || "Unknown";
            const timeAgo = item?.timeAgo || "fresh";
            const url = item?.url || "";

            return `${index + 1}. Tool signal: ${title} | Source: ${source} | Freshness: ${timeAgo}${url ? ` | Link: ${url}` : ""}`;
        })
        .join("\n");
}

function dedupeTexts(items = []) {
    const unique = [];
    const seen = new Set();

    items.forEach((item) => {
        const value = typeof item === "string" ? item.trim() : "";
        if (!value) return;
        const key = value.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(value);
        }
    });

    return unique;
}

function buildHistoryPrompt(previousTweets = [], limit = HISTORY_TWEET_LIMIT) {
    if (!previousTweets.length) return "";
    const recent = dedupeTexts(previousTweets).slice(0, limit);
    if (!recent.length) return "";
    return `\n\nAvoid repeating these previous tweets/topics:\n- ${recent.join("\n- ")}`;
}

function extractJsonObject(rawText) {
    let jsonStr = rawText.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    return jsonStr;
}

function parseTweetsFromContent(content) {
    const jsonStr = extractJsonObject(content);
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        const fixed = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        parsed = JSON.parse(fixed);
    }

    if (!parsed?.tweets || !Array.isArray(parsed.tweets)) {
        throw new Error("Missing 'tweets' array in Gemini response");
    }

    return parsed.tweets;
}

function countHashtags(text) {
    const tags = text.match(/#[a-z0-9_]+/gi);
    return tags ? tags.length : 0;
}

function isNewsy(text) {
    return NEWSY_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeSimilarityText(text) {
    return (text || "")
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/www\.\S+/g, " ")
        .replace(/[@#]\w+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toTokenSet(text) {
    return new Set(
        normalizeSimilarityText(text)
            .split(" ")
            .filter((token) => token.length > 2)
    );
}

function jaccard(setA, setB) {
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;

    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }

    const union = new Set([...setA, ...setB]).size;
    return union ? intersection / union : 0;
}

function isNearDuplicate(textA, textB) {
    const normalizedA = normalizeSimilarityText(textA);
    const normalizedB = normalizeSimilarityText(textB);

    if (!normalizedA || !normalizedB) return false;
    if (normalizedA === normalizedB) return true;

    if (
        normalizedA.length > 120 &&
        normalizedB.length > 120 &&
        (normalizedA.includes(normalizedB.slice(0, 120)) ||
            normalizedB.includes(normalizedA.slice(0, 120)))
    ) {
        return true;
    }

    const score = jaccard(toTokenSet(normalizedA), toTokenSet(normalizedB));
    return score >= DUPLICATE_JACCARD_THRESHOLD;
}

function validateTweetText(text) {
    const value = typeof text === "string" ? text.trim() : "";
    const issues = [];

    if (!value) {
        issues.push("empty text");
        return issues;
    }

    const length = value.length;
    if (length < MIN_TWEET_LENGTH) issues.push(`too short (${length})`);
    if (length > MAX_TWEET_LENGTH) issues.push(`too long (${length})`);
    if (isNewsy(value)) issues.push("newsy framing");
    if (countHashtags(value) > 1) issues.push("more than one hashtag");

    return issues;
}

function normalizeTweets(rawTweets = []) {
    return rawTweets.slice(0, TARGET_TWEETS).map((tweet) => {
        if (typeof tweet === "string") {
            return { text: tweet.trim(), sourceAge: "Fresh" };
        }

        return {
            text: (tweet?.text || "").trim(),
            sourceAge: tweet?.sourceAge || "Fresh",
        };
    });
}

function collectIssues(tweets = [], blockedTweets = []) {
    const issues = [];

    if (tweets.length !== TARGET_TWEETS) {
        issues.push(`returned ${tweets.length} tweets; expected ${TARGET_TWEETS}`);
    }

    tweets.forEach((tweet, index) => {
        const tweetIssues = validateTweetText(tweet.text);
        if (tweetIssues.length) {
            issues.push(
                `tweet ${index + 1}: ${tweetIssues.join(", ")} | "${tweet.text.slice(0, 120)}"`
            );
        }
    });

    for (let i = 0; i < tweets.length; i += 1) {
        for (let j = i + 1; j < tweets.length; j += 1) {
            if (isNearDuplicate(tweets[i].text, tweets[j].text)) {
                issues.push(`tweet ${i + 1} and tweet ${j + 1}: repetitive/too similar`);
            }
        }
    }

    tweets.forEach((tweet, index) => {
        const repeated = blockedTweets.find((previous) => isNearDuplicate(tweet.text, previous));
        if (repeated) {
            issues.push(
                `tweet ${index + 1}: repeats previous generated content | "${tweet.text.slice(0, 120)}"`
            );
        }
    });

    return issues;
}

async function requestTweets({
    endpoint,
    today,
    toolSignalContext,
    historyPrompt,
    retryFeedback,
}) {
    const prompt = [
        SYSTEM_PROMPT,
        "",
        `DATE: ${today}`,
        "",
        "LAST 24H TOOL SIGNALS (context only; do not write news):",
        toolSignalContext,
        historyPrompt,
        "",
        "Task:",
        `Generate ${TARGET_TWEETS} tweets for @AIToolsExplorer.`,
        `Each tweet must be ${MIN_TWEET_LENGTH}-${MAX_TWEET_LENGTH} chars.`,
        "Tweets must focus on AI tools and practical usage, not news narration.",
        "Include energetic emojis and tool links where possible.",
        retryFeedback ? `Retry fixes from previous attempt:\n${retryFeedback}` : "",
        "",
        "Return JSON only.",
    ]
        .filter(Boolean)
        .join("\n");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 4096,
                    thinkingConfig: {
                        thinkingBudget: 0,
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text)
            .filter(Boolean)
            .join("");

        if (!content) {
            throw new Error("No content in Gemini response");
        }

        return parseTweetsFromContent(content);
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function generateTweets(options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing required environment variable: GEMINI_API_KEY");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    let toolSignalContext = `Fallback AI tool pool: ${TOOL_FALLBACK_CONTEXT}.`;
    try {
        const signals = await getTrendingNews();
        toolSignalContext = buildToolSignalContext(signals);
    } catch (error) {
        console.error("Tool signal fetch failed:", error);
    }

    const avoidTweets = dedupeTexts(Array.isArray(options?.avoidTweets) ? options.avoidTweets : []);
    let historyPrompt = "";
    let blockedTweets = [...avoidTweets];
    try {
        const previousTweets = await getLastDaysTweets(2);
        blockedTweets = dedupeTexts([...avoidTweets, ...previousTweets]);
        historyPrompt = buildHistoryPrompt(blockedTweets, HISTORY_TWEET_LIMIT);
    } catch (error) {
        console.error("History fetch failed:", error);
        historyPrompt = buildHistoryPrompt(avoidTweets, HISTORY_TWEET_LIMIT);
    }

    let retryFeedback = "";
    let lastCandidate = [];

    for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
        try {
            const rawTweets = await requestTweets({
                endpoint,
                today,
                toolSignalContext,
                historyPrompt,
                retryFeedback,
            });

            const candidateTweets = normalizeTweets(rawTweets);
            lastCandidate = candidateTweets;
            const issues = collectIssues(candidateTweets, blockedTweets);

            if (!issues.length) {
                return candidateTweets;
            }

            retryFeedback = issues.join("\n");
            console.warn(`[Gemini validation] attempt ${attempt} failed:\n${retryFeedback}`);
        } catch (error) {
            retryFeedback = `Attempt ${attempt} failed: ${error.message}`;
            console.error("Gemini attempt error:", error);
        }
    }

    if (lastCandidate.length) {
        return lastCandidate;
    }

    return [
        {
            text: "AI generation hiccup right now. Retry once and fresh AI tools picks will load.",
            sourceAge: "System",
        },
    ];
}
