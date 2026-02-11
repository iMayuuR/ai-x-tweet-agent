import { getLastDaysTweets } from "./cache";
import { getTrendingNews } from "./news";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const TARGET_TWEETS = 10;
const MIN_TWEET_LENGTH = 270;
const MAX_TWEET_LENGTH = 275;
const MIN_HASHTAGS = 1;
const MAX_HASHTAGS = 2;
const MAX_MODEL_ATTEMPTS = 4;
const HISTORY_TWEET_LIMIT = 30;
const DUPLICATE_JACCARD_THRESHOLD = 0.62;

const DEFAULT_HASHTAGS = ["#AITools", "#AIBuilders", "#GenAI"];
const LENGTH_FILLERS = [
    "Built for creators shipping faster every day ⚡",
    "Worth testing if you build with AI daily 🚀",
    "Great fit for founders, devs, and marketers 🎯",
    "This workflow saves serious time in real projects 💡",
];

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
    /\bjournalists?\b/i,
    /\bmedia\b/i,
    /\bannounced?\b/i,
];

const SYSTEM_PROMPT = `You are @AIToolsExplorer on X.

Persona:
- AI enthusiast, AI tools explorer, and hands-on experimenter.
- You track AI tools launched/updated in the last 24 hours.
- You share practical tool discoveries, not AI news reports.

Voice:
- Energetic and useful, with strong emojis.
- Real creator tone, not corporate tone.

Hard rules:
1) Return exactly ${TARGET_TWEETS} tweets in JSON.
2) Every tweet MUST be ${MIN_TWEET_LENGTH}-${MAX_TWEET_LENGTH} characters.
3) Focus on AI tools and AI workflows only. No market/news narration.
4) Never use phrasing like breaking, headline, reported, according to, press release, news.
5) Each tweet must mention what the tool does + who should use it + one real use-case.
6) Add tool website link when available.
7) Tag official handle when the tool/company is known.
8) Use emojis naturally.
9) Include ${MIN_HASHTAGS}-${MAX_HASHTAGS} hashtags in each tweet. Do not overstuff hashtags.
10) Every tweet must be unique and start differently.

Official handles:
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

function cleanSignalTitle(title = "") {
    return title
        .replace(/^show hn:\s*/i, "")
        .replace(/\s*-\s*google news\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function buildToolSignalContext(items = []) {
    if (!items.length) {
        return `No strong live signals fetched. Use 24h tool activity from: ${TOOL_FALLBACK_CONTEXT}.`;
    }

    return items
        .slice(0, 20)
        .map((item, index) => {
            const title = cleanSignalTitle(item?.title || "Untitled AI tool signal");
            const timeAgo = item?.timeAgo || "fresh";
            const url = item?.url || "";
            return `${index + 1}. 24h tool signal: ${title}${url ? ` | Link: ${url}` : ""} | Age: ${timeAgo}`;
        })
        .join("\n");
}

function buildHistoryPrompt(previousTweets = [], limit = HISTORY_TWEET_LIMIT) {
    if (!previousTweets.length) return "";
    const recent = dedupeTexts(previousTweets).slice(0, limit);
    if (!recent.length) return "";
    return `\n\nDo not repeat these previously used tweets/topics:\n- ${recent.join("\n- ")}`;
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

function trimToMaxLength(text, max = MAX_TWEET_LENGTH) {
    if (text.length <= max) return text;
    const sliced = text.slice(0, max + 1);
    const cutAt = sliced.lastIndexOf(" ");
    const smart = cutAt > 0 ? sliced.slice(0, cutAt) : sliced.slice(0, max);
    return smart.slice(0, max).trim();
}

function ensureHashtagRange(text) {
    let output = text.trim();
    const tags = output.match(/#[a-z0-9_]+/gi) || [];

    if (tags.length > MAX_HASHTAGS) {
        const keep = tags.slice(0, MAX_HASHTAGS);
        output = output.replace(/#[a-z0-9_]+/gi, "").replace(/\s+/g, " ").trim();
        output = `${output} ${keep.join(" ")}`.trim();
    }

    let current = countHashtags(output);
    let tagIndex = 0;

    while (current < MIN_HASHTAGS && tagIndex < DEFAULT_HASHTAGS.length) {
        const tag = DEFAULT_HASHTAGS[tagIndex];
        if (!new RegExp(`\\${tag}\\b`, "i").test(output)) {
            const withTag = `${output} ${tag}`.trim();
            output = trimToMaxLength(withTag);
        }
        current = countHashtags(output);
        tagIndex += 1;
    }

    if (countHashtags(output) < MIN_HASHTAGS) {
        const tag = DEFAULT_HASHTAGS[0];
        const room = Math.max(0, MAX_TWEET_LENGTH - tag.length - 1);
        const head = output.slice(0, room).trim();
        output = `${head} ${tag}`.trim();
        output = trimToMaxLength(output);
    }

    return output.trim();
}

function padToMinimumLength(text) {
    let output = text.trim();
    if (output.length >= MIN_TWEET_LENGTH) return output;

    for (const filler of LENGTH_FILLERS) {
        if (output.length >= MIN_TWEET_LENGTH) break;
        const candidate = `${output} ${filler}`.replace(/\s+/g, " ").trim();
        output = candidate.length <= MAX_TWEET_LENGTH ? candidate : trimToMaxLength(candidate);
    }

    if (output.length < MIN_TWEET_LENGTH) {
        const room = MAX_TWEET_LENGTH - output.length;
        if (room > 0) {
            const buffer = " AI tools explorer mode on ⚙️";
            output = `${output}${buffer.slice(0, room)}`.trim();
        }
    }

    return output;
}

function hardenTweetText(text) {
    let output = (typeof text === "string" ? text : "").replace(/\s+/g, " ").trim();

    output = output.replace(/\b(breaking|headline|reported?|according to|press release|news)\b/gi, "");
    output = output.replace(/\s+/g, " ").trim();

    output = ensureHashtagRange(output);
    output = padToMinimumLength(output);
    output = ensureHashtagRange(output);
    output = trimToMaxLength(output);

    if (output.length < MIN_TWEET_LENGTH) {
        output = padToMinimumLength(output);
        output = trimToMaxLength(output);
    }

    if (countHashtags(output) < MIN_HASHTAGS) {
        output = ensureHashtagRange(output);
    }

    while (output.length < MIN_TWEET_LENGTH) {
        const room = MAX_TWEET_LENGTH - output.length;
        if (room <= 0) break;
        const add = room >= 2 ? " ⚡" : "⚡";
        output = `${output}${add}`.trim();
    }

    return output.trim();
}

function validateTweetText(text) {
    const value = typeof text === "string" ? text.trim() : "";
    const issues = [];

    if (!value) {
        issues.push("empty text");
        return issues;
    }

    const length = value.length;
    const hashtags = countHashtags(value);
    if (length < MIN_TWEET_LENGTH) issues.push(`too short (${length})`);
    if (length > MAX_TWEET_LENGTH) issues.push(`too long (${length})`);
    if (isNewsy(value)) issues.push("newsy framing");
    if (hashtags < MIN_HASHTAGS) issues.push(`missing hashtags (${hashtags})`);
    if (hashtags > MAX_HASHTAGS) issues.push(`too many hashtags (${hashtags})`);

    return issues;
}

function normalizeTweets(rawTweets = []) {
    return rawTweets.slice(0, TARGET_TWEETS).map((tweet) => {
        const base = typeof tweet === "string" ? tweet : tweet?.text || "";
        return {
            text: hardenTweetText(base),
            sourceAge: typeof tweet === "object" ? tweet?.sourceAge || "Fresh" : "Fresh",
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
    nowIso,
    toolSignalContext,
    historyPrompt,
    retryFeedback,
}) {
    const prompt = [
        SYSTEM_PROMPT,
        "",
        `NOW_UTC: ${nowIso}`,
        "",
        "LAST 24H AI TOOL SIGNALS:",
        toolSignalContext,
        historyPrompt,
        "",
        "Task:",
        `Generate ${TARGET_TWEETS} tweets for @AIToolsExplorer.`,
        `Each tweet must be ${MIN_TWEET_LENGTH}-${MAX_TWEET_LENGTH} chars.`,
        "Do not sound like a journalist or news reporter.",
        "Tweets must be practical AI tool discoveries with links and emojis.",
        retryFeedback ? `Fix these issues from previous attempt:\n${retryFeedback}` : "",
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
                    temperature: 0.95,
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
    const nowIso = new Date().toISOString();

    let toolSignalContext = `Fallback 24h AI tool pool: ${TOOL_FALLBACK_CONTEXT}.`;
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
        const previousTweets = await getLastDaysTweets(3);
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
                nowIso,
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
        return lastCandidate.slice(0, TARGET_TWEETS);
    }

    return [
        {
            text: "AI tools radar is warming up right now 🚀 I am still scanning last 24h launches and updates to deliver practical tool picks with direct links, clear use-cases, and creator-first tips. Hit Generate once more for a fresh unique batch ready for your X audience now ⚡ #AITools",
            sourceAge: "System",
        },
    ];
}
