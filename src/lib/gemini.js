import { getLastDaysTweets, getRecentRunTweets } from "./cache";
import { getTrendingNews } from "./news";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const TARGET_TWEETS = 10;
const MIN_TWEET_LENGTH = 270;
const MAX_TWEET_LENGTH = 275;
const TARGET_TWEET_LENGTH = 272;
const MIN_HASHTAGS = 1;
const MAX_HASHTAGS = 2;
const MAX_MODEL_ATTEMPTS = 4;
const HISTORY_TWEET_LIMIT = 30;
const DUPLICATE_JACCARD_THRESHOLD = 0.56;

const DEFAULT_HASHTAGS = ["#AITools", "#AIBuilders", "#GenAI"];
const EXPERT_HOOK_WORDS = ["INSIGHT", "SPOTLIGHT", "HOTDROP", "BREAKOUT", "POWERMOVE"];
const LENGTH_FILLERS = [
    "Built for creators shipping faster every day.",
    "Worth testing if you build with AI daily.",
    "Great fit for founders, devs, and marketers.",
    "This workflow saves serious time in real projects.",
];

const MICRO_FILLERS = [
    "Practical edge for daily AI builders.",
    "Fast setup and immediate output quality.",
    "Easy to test and deploy in real workflows.",
    "Strong momentum from early power users.",
];

const ENGAGEMENT_LINES = [
    "This one feels like a serious edge for builders who move fast.",
    "If you create daily, this can instantly raise your execution speed.",
    "Early users are already pushing standout results with this workflow.",
    "This has clear viral potential for creators testing new formats.",
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

const ONE_WORD_PREFIX_RE = /^[A-Z][A-Z0-9]{2,16}:/;
const URL_RE = /https?:\/\/\S+|www\.\S+/gi;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
const FRAGMENT_END_RE = /\b(and|or|with|for|to|in|on|at|from|by|of|is|are|was|were|immediate|setup|output|fast|strong|practical|daily|today|now)\b$/i;

const TOOL_LIBRARY = [
    { name: "ChatGPT", handle: "@OpenAI", link: "https://chatgpt.com", audience: "founders and PMs", useCase: "draft product specs and user stories in minutes", capability: "turn rough notes into clean drafts and action plans" },
    { name: "Claude", handle: "@AnthropicAI", link: "https://claude.ai", audience: "writers and researchers", useCase: "summarize long docs with high context retention", capability: "reason through long inputs with structured output" },
    { name: "Gemini", handle: "@GoogleAI", link: "https://gemini.google.com", audience: "analysts and creators", useCase: "convert research into publish-ready content faster", capability: "blend search context with fast drafting workflows" },
    { name: "Cursor", handle: "@cursor_ai", link: "https://cursor.com", audience: "developers", useCase: "ship features and refactors with less manual boilerplate", capability: "understand codebase context and suggest practical edits" },
    { name: "Perplexity", handle: "@perplexity_ai", link: "https://perplexity.ai", audience: "operators and founders", useCase: "build fast competitive research briefs with citations", capability: "answer research questions with source-backed responses" },
    { name: "Runway", handle: "@runwayml", link: "https://runwayml.com", audience: "video creators", useCase: "prototype ad creatives from text prompts quickly", capability: "generate and edit videos with AI-first controls" },
    { name: "Midjourney", handle: "@midjourney", link: "https://www.midjourney.com", audience: "designers and creators", useCase: "create concept visuals for campaigns and products", capability: "generate high-quality visual styles from short prompts" },
    { name: "Suno", handle: "@suno_ai_", link: "https://suno.com", audience: "music creators", useCase: "draft soundtrack ideas for short videos and reels", capability: "generate full songs from simple text descriptions" },
    { name: "ElevenLabs", handle: "@elevenlabsio", link: "https://elevenlabs.io", audience: "podcasters and marketers", useCase: "create multilingual voiceovers for product content", capability: "produce realistic voice output with clear control" },
    { name: "Hugging Face", handle: "@huggingface", link: "https://huggingface.co", audience: "AI engineers", useCase: "test and compare open models for real tasks", capability: "host, discover, and run open-source AI models fast" },
    { name: "GitHub Copilot", handle: "@GitHubCopilot", link: "https://github.com/features/copilot", audience: "software teams", useCase: "speed up PR cycles and repetitive implementation work", capability: "assist coding workflows directly in the IDE" },
    { name: "Vercel AI SDK", handle: "@vercel", link: "https://sdk.vercel.ai", audience: "app builders", useCase: "ship production AI features with streaming UX quickly", capability: "provide primitives to build reliable AI apps faster" },
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
3) Target ${TARGET_TWEET_LENGTH}-${MAX_TWEET_LENGTH} chars whenever possible.
4) Start every tweet with exactly one uppercase word + colon (example: INSIGHT: ...).
5) Focus on AI tools and AI workflows only. No market/news narration.
6) Every tweet must feel like a practical mini-article compressed for X.
7) Each tweet must mention what the tool does + who should use it + one real use-case.
8) Add tool website link when available.
9) Tag official handle when the tool/company is known.
10) Use emojis naturally.
11) Include ${MIN_HASHTAGS}-${MAX_HASHTAGS} hashtags in each tweet. Do not overstuff hashtags.
12) Every tweet must be unique and start differently.
13) Never output placeholders, incomplete lines, or unfinished sentences.
14) Never use phrasing like breaking, headline, reported, according to, press release, news.

Official handles:
OpenAI=@OpenAI, Google/Gemini=@GoogleAI, Anthropic/Claude=@AnthropicAI, Meta AI=@MetaAI,
Stability AI=@StabilityAI, Midjourney=@midjourney, Runway=@runwayml, Hugging Face=@huggingface,
Perplexity=@perplexity_ai, Cursor=@cursor_ai, Replit=@Replit, Notion=@NotionHQ, Canva=@canva,
Adobe Firefly=@AdobeFirefly, Mistral=@MistralAI, xAI=@xai, Suno=@suno_ai_, ElevenLabs=@elevenlabsio,
NVIDIA=@nvidia, GitHub Copilot=@GitHubCopilot, Vercel=@vercel.

Output format:
{
  "tweets": [
    { "text": "tweet text", "sourceAge": "3h ago" }
  ]
}

Return JSON only, no markdown.`;

function normalizeSourceAge(value, seed = 1) {
    if (!value || typeof value !== "string") {
        return `${Math.max(1, seed)}h ago`;
    }

    const clean = value.trim().toLowerCase();
    if (!clean || clean === "fresh" || clean === "now" || clean === "unknown") {
        return `${Math.max(1, seed)}h ago`;
    }

    const match = clean.match(/(\d+)\s*([smhd])/i);
    if (!match) return `${Math.max(1, seed)}h ago`;

    const amount = Number(match[1]) || 0;
    const unit = match[2].toLowerCase();

    let hours = 1;
    if (unit === "s") hours = 1;
    if (unit === "m") hours = Math.max(1, Math.ceil(amount / 60));
    if (unit === "h") hours = Math.max(1, amount);
    if (unit === "d") hours = Math.max(1, amount * 24);

    return `${hours}h ago`;
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

function cleanSignalTitle(title = "") {
    return title
        .replace(/^show hn:\s*/i, "")
        .replace(/\s*-\s*google news\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function buildToolSignalContext(items = []) {
    if (!items.length) {
        return `24h tool signals unavailable. Prioritize practical tools from: ${TOOL_FALLBACK_CONTEXT}.`;
    }

    return items
        .slice(0, 20)
        .map((item, index) => {
            const title = cleanSignalTitle(item?.title || "Untitled AI tool signal");
            const timeAgo = item?.timeAgo || "fresh";
            const url = item?.url || "";
            return `${index + 1}. Tool: ${title}${url ? ` | URL: ${url}` : ""} | Freshness: ${timeAgo}`;
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

function countMentions(text) {
    const mentions = text.match(/@[a-z0-9_]+/gi);
    return mentions ? mentions.length : 0;
}

function hasEmoji(text) {
    return EMOJI_RE.test(text || "");
}

function extractUrls(text) {
    return (text || "").match(/https?:\/\/\S+|www\.\S+/gi) || [];
}

function normalizeUrlToken(token) {
    return (token || "").replace(/[),.!?;:]+$/g, "").trim();
}

function isLikelyValidUrlToken(token) {
    const raw = normalizeUrlToken(token);
    if (!raw) return false;

    const withProtocol = raw.startsWith("www.") ? `https://${raw}` : raw;
    try {
        const parsed = new URL(withProtocol);
        const host = (parsed.hostname || "").toLowerCase();
        if (!host || !host.includes(".") || host.endsWith(".")) return false;
        if (!/[a-z]/i.test(host)) return false;
        return true;
    } catch {
        return false;
    }
}

function hasValidUrl(text) {
    const urls = extractUrls(text);
    return urls.some((url) => isLikelyValidUrlToken(url));
}

function stripBrokenUrlTokens(text) {
    const tokens = (text || "").split(/\s+/).filter(Boolean);
    const filtered = [];

    for (const token of tokens) {
        if (/^(https?:\/\/|www\.)/i.test(token) && !isLikelyValidUrlToken(token)) {
            continue;
        }
        filtered.push(token);
    }

    return filtered.join(" ").replace(/\s+/g, " ").trim();
}

function ensureCleanEnding(text) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    output = stripBrokenUrlTokens(output);
    output = output.replace(/\s+(#\w+)$/g, " $1").trim();

    const endsWithAllowed =
        /[.!?]$/.test(output) ||
        /#[a-z0-9_]+$/i.test(output) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(output);

    if (endsWithAllowed) return output;

    output = output.replace(/[,:;]+$/g, "").trim();
    output = output.replace(FRAGMENT_END_RE, "").trim();

    const recheckAllowed =
        /[.!?]$/.test(output) ||
        /#[a-z0-9_]+$/i.test(output) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(output);

    if (recheckAllowed) return output;

    if (output.length < MAX_TWEET_LENGTH) {
        return `${output}.`.trim();
    }

    const cutAt = output.lastIndexOf(" ");
    if (cutAt > 0) {
        const shorter = output.slice(0, cutAt).trim();
        if (!shorter) return output;
        if (/[.!?]$/.test(shorter)) return shorter;
        if (shorter.length < MAX_TWEET_LENGTH) return `${shorter}.`;
        return shorter;
    }

    return output;
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

function ensureOneWordPrefix(text, seed = 0) {
    let output = (text || "").trim();

    output = output.replace(/^[^\w@#]+/u, "").trim();
    output = output.replace(/^[A-Za-z][A-Za-z0-9_-]{1,24}\s+AI\s+tool\s+find:\s*/i, "").trim();
    output = output.replace(/^[A-Za-z][A-Za-z0-9_-]{1,24}:\s*/i, "").trim();
    output = output.replace(/^(INSIGHT|SPOTLIGHT|HOTDROP|BREAKOUT|POWERMOVE)\b\s*/i, "").trim();

    const prefix = pick(EXPERT_HOOK_WORDS, seed).replace(/[^A-Z0-9]/gi, "") || "INSIGHT";
    return `${prefix}: ${output}`.replace(/\s+/g, " ").trim();
}

function ensureEmoji(text, seed = 0) {
    let output = (text || "").trim();
    if (hasEmoji(output)) return output;

    const emoji = pick(
        ["\uD83D\uDE80", "\uD83D\uDD25", "\u26A1", "\uD83E\uDDE0", "\uD83D\uDEE0\uFE0F", "\u2728", "\uD83C\uDFAF"],
        seed
    ) || "\uD83D\uDE80";
    if (ONE_WORD_PREFIX_RE.test(output)) {
        output = output.replace(/^([A-Z][A-Z0-9]{2,16}:\s*)/, `$1${emoji} `);
        return output.trim();
    }

    return `${emoji} ${output}`.trim();
}

function ensureLinkAndMention(text, seed = 0) {
    let output = (text || "").trim();
    const fallbackTool = TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];

    if (!hasValidUrl(output)) {
        output = `${output} Link: ${fallbackTool.link}`.replace(/\s+/g, " ").trim();
    }

    if (countMentions(output) < 1) {
        const mention = fallbackTool.handle || "@OpenAI";
        output = `${output} ${mention}`.replace(/\s+/g, " ").trim();
    }

    return output;
}

function ensureRequiredTokens(text, seed = 0) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    const fallbackTool = TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];
    const linkToken = `Link: ${fallbackTool.link}`;

    if (!hasValidUrl(output)) {
        const reserve = linkToken.length + 1;
        const cap = Math.max(MIN_TWEET_LENGTH - 1, MAX_TWEET_LENGTH - reserve);
        output = trimToMaxLength(output, cap);
        output = `${output} ${linkToken}`.replace(/\s+/g, " ").trim();
    }

    if (countMentions(output) < 1) {
        const mention = fallbackTool.handle || "@OpenAI";
        const reserve = mention.length + 1;
        const cap = Math.max(MIN_TWEET_LENGTH - 1, MAX_TWEET_LENGTH - reserve);
        output = trimToMaxLength(output, cap);
        output = `${output} ${mention}`.replace(/\s+/g, " ").trim();
    }

    return output;
}

function ensureHashtagRange(text, seed = 0) {
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
        const tag = pick(DEFAULT_HASHTAGS, seed + tagIndex) || DEFAULT_HASHTAGS[tagIndex];
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
        output = `${output.slice(0, room).trim()} ${tag}`.trim();
        output = trimToMaxLength(output);
    }

    return output.trim();
}

function padToMinimumLength(text, seed = 0) {
    let output = text.trim();
    if (output.length >= MIN_TWEET_LENGTH) return output;

    const fillers = [...LENGTH_FILLERS, ...ENGAGEMENT_LINES, ...MICRO_FILLERS];
    for (let i = 0; i < fillers.length * 2 && output.length < MIN_TWEET_LENGTH; i += 1) {
        const filler = pick(fillers, seed + i);
        if (!filler) continue;
        const room = MAX_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) continue;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    if (output.length < MIN_TWEET_LENGTH) {
        const room = MAX_TWEET_LENGTH - output.length - 1;
        if (room > 0) {
            const add = "Practical wins for creators shipping daily."
                .slice(0, room)
                .trim();
            output = `${output} ${add}`.replace(/\s+/g, " ").trim();
        }
    }

    return output;
}

function padTowardTargetLength(text, seed = 0) {
    let output = text.trim();
    if (output.length >= TARGET_TWEET_LENGTH) return output;

    for (let i = 0; i < MICRO_FILLERS.length * 2 && output.length < TARGET_TWEET_LENGTH; i += 1) {
        const filler = pick(MICRO_FILLERS, seed + i);
        if (!filler) continue;
        const room = MAX_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) continue;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    return output;
}

function ensureSentenceEnding(text) {
    let output = text.trim();
    if (!output) return output;

    if (/[.!?]$/.test(output)) return output;
    if (/#[a-z0-9_]+$/i.test(output)) return output;
    if (/(https?:\/\/\S+|www\.\S+)$/i.test(output)) return output;

    if (output.length < MAX_TWEET_LENGTH) {
        output = `${output}.`;
    }

    return output;
}

function hardenTweetText(text, seed = 0) {
    let output = (typeof text === "string" ? text : "").replace(/\s+/g, " ").trim();
    output = output.replace(/\b(breaking|headline|reported?|according to|press release|news)\b/gi, "");
    output = output.replace(/\s+/g, " ").trim();

    output = ensureOneWordPrefix(output, seed);
    output = ensureLinkAndMention(output, seed + 1);
    output = ensureRequiredTokens(output, seed + 1);
    output = ensureEmoji(output, seed + 2);
    output = ensureHashtagRange(output, seed + 3);
    output = padTowardTargetLength(output, seed + 4);
    output = padToMinimumLength(output, seed + 5);
    output = ensureSentenceEnding(output);
    output = trimToMaxLength(output);
    output = ensureCleanEnding(output);
    output = ensureRequiredTokens(output, seed + 11);
    output = trimToMaxLength(output);
    output = ensureHashtagRange(output, seed + 6);
    output = ensureCleanEnding(output);

    if (output.length < MIN_TWEET_LENGTH) {
        output = padTowardTargetLength(output, seed + 7);
        output = padToMinimumLength(output, seed + 8);
        output = ensureRequiredTokens(output, seed + 12);
        output = trimToMaxLength(output);
    }

    if (countHashtags(output) < MIN_HASHTAGS) {
        output = ensureHashtagRange(output, seed + 9);
    }

    if (output.length < MIN_TWEET_LENGTH) {
        const room = MAX_TWEET_LENGTH - output.length - 1;
        if (room > 0) {
            const add = "high utility for daily workflows".slice(0, room).trim();
            output = `${output} ${add}`.replace(/\s+/g, " ").trim();
        }
    }

    for (let i = 0; i < 8 && output.length < MIN_TWEET_LENGTH; i += 1) {
        const filler = pick([...MICRO_FILLERS, ...LENGTH_FILLERS], seed + 20 + i);
        if (!filler) break;
        const room = MAX_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) break;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    output = ensureRequiredTokens(output, seed + 13);
    output = ensureHashtagRange(output, seed + 14);
    output = ensureCleanEnding(output);
    output = trimToMaxLength(output);

    if (output.length < MIN_TWEET_LENGTH) {
        output = padToMinimumLength(output, seed + 15);
        output = ensureCleanEnding(output);
        output = trimToMaxLength(output);
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
    if (!ONE_WORD_PREFIX_RE.test(value)) issues.push("missing one-word prefix");
    if (!hasValidUrl(value)) issues.push("missing link");
    if (extractUrls(value).some((url) => !isLikelyValidUrlToken(url))) issues.push("broken link");
    if (countMentions(value) < 1) issues.push("missing account tag");
    if (!hasEmoji(value)) issues.push("missing emoji");
    if (hashtags < MIN_HASHTAGS) issues.push(`missing hashtags (${hashtags})`);
    if (hashtags > MAX_HASHTAGS) issues.push(`too many hashtags (${hashtags})`);

    const trimmedTail = value.replace(/[.!?]+$/g, "").trim();
    const completeEnding =
        /[.!?]$/.test(value) ||
        /#[a-z0-9_]+$/i.test(value) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(value);
    if (!completeEnding) issues.push("incomplete ending");
    if (FRAGMENT_END_RE.test(trimmedTail)) issues.push("truncated ending");

    return issues;
}

function normalizeTweets(rawTweets = []) {
    return rawTweets.slice(0, TARGET_TWEETS).map((tweet, index) => {
        const base = typeof tweet === "string" ? tweet : tweet?.text || "";
        return {
            text: hardenTweetText(base, index),
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
            issues.push(`tweet ${index + 1}: ${tweetIssues.join(", ")} | "${tweet.text.slice(0, 120)}"`);
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
            issues.push(`tweet ${index + 1}: repeats previous generated content | "${tweet.text.slice(0, 120)}"`);
        }
    });

    return issues;
}

function detectHandle(name = "") {
    const value = name.toLowerCase();
    if (value.includes("openai") || value.includes("chatgpt")) return "@OpenAI";
    if (value.includes("claude") || value.includes("anthropic")) return "@AnthropicAI";
    if (value.includes("gemini") || value.includes("google")) return "@GoogleAI";
    if (value.includes("cursor")) return "@cursor_ai";
    if (value.includes("perplexity")) return "@perplexity_ai";
    if (value.includes("runway")) return "@runwayml";
    if (value.includes("midjourney")) return "@midjourney";
    if (value.includes("suno")) return "@suno_ai_";
    if (value.includes("elevenlabs")) return "@elevenlabsio";
    if (value.includes("hugging face")) return "@huggingface";
    if (value.includes("vercel")) return "@vercel";
    if (value.includes("copilot") || value.includes("github")) return "@GitHubCopilot";
    return "";
}

function buildSignalToolOptions(signals = []) {
    return signals.slice(0, 20).map((signal, index) => {
        const title = cleanSignalTitle(signal?.title || "");
        const name = title.split(/[|:,\-]/)[0]?.trim() || `AI Tool ${index + 1}`;
        return {
            name,
            handle: detectHandle(name),
            link: signal?.url || "https://producthunt.com",
            audience: "builders and creators",
            useCase: "test a practical workflow and share results quickly",
            capability: "unlock a fast, usable workflow without heavy setup",
            sourceAge: normalizeSourceAge(signal?.timeAgo, (index % 12) + 1),
        };
    });
}

function pick(arr, index) {
    if (!arr.length) return "";
    return arr[index % arr.length];
}

function buildFallbackTweet(tool, index, entropy = 0) {
    const openers = [
        "\uD83D\uDD25",
        "\uD83D\uDE80",
        "\uD83E\uDD16",
        "\uD83D\uDCA1",
        "\uD83C\uDFAF",
        "\u26A1",
        "\u2728",
        "\uD83D\uDD0D",
        "\uD83D\uDE4C",
        "\uD83D\uDEE0\uFE0F",
    ];

    const proofLines = [
        "I tested it in a real workflow and it felt production-ready.",
        "Hands-on run today: output quality was surprisingly strong.",
        "Used it on a live task and the speed gain was obvious.",
        "Tried a real use-case and it removed manual busywork fast.",
    ];

    const hashtags = [pick(DEFAULT_HASHTAGS, index + entropy), pick(DEFAULT_HASHTAGS, index + entropy + 1)]
        .filter(Boolean)
        .filter((value, idx, self) => self.indexOf(value) === idx)
        .slice(0, 2)
        .join(" ");

    const intro = `${pick(openers, index + entropy)} ${tool.name}${tool.handle ? ` ${tool.handle}` : ""}.`;
    const body = `It helps ${tool.audience} ${tool.useCase}, and the core win is simple: ${tool.capability}.`;
    const proof = pick(proofLines, index + entropy);
    const hype = pick(ENGAGEMENT_LINES, index + entropy);
    const linkLine = `Link: ${tool.link}`;

    return hardenTweetText(`${intro} ${linkLine} ${body} ${proof} ${hype} ${hashtags}`, index + entropy);
}

function buildLocalBackupTweets({ blockedTweets = [], existing = [], signals = [], nowIso = "" }) {
    const signalTools = buildSignalToolOptions(signals);
    const toolPool = [...signalTools, ...TOOL_LIBRARY];
    const output = [];
    const usedTexts = dedupeTexts([...blockedTweets, ...existing.map((item) => item.text)]);
    const entropy = Number((nowIso || "").replace(/\D/g, "").slice(-6)) || Date.now();

    for (let i = 0; i < toolPool.length * 3 && output.length < TARGET_TWEETS; i += 1) {
        const tool = toolPool[i % toolPool.length];
        const text = buildFallbackTweet(tool, i, entropy);
        const issues = validateTweetText(text);
        const duplicateWithOutput = output.some((item) => isNearDuplicate(item.text, text));
        const duplicateWithHistory = usedTexts.some((item) => isNearDuplicate(item, text));

        if (!issues.length && !duplicateWithOutput && !duplicateWithHistory) {
            output.push({ text, sourceAge: normalizeSourceAge(tool?.sourceAge, (i % 12) + 1) });
        }
    }

    for (let i = 0; output.length < TARGET_TWEETS && i < 60; i += 1) {
        const tool = toolPool[(i + entropy) % toolPool.length] || TOOL_LIBRARY[i % TOOL_LIBRARY.length];
        const text = buildFallbackTweet(tool, i + 99, entropy);
        const duplicateWithOutput = output.some((item) => isNearDuplicate(item.text, text));
        const duplicateWithHistory = usedTexts.some((item) => isNearDuplicate(item, text));
        if (!duplicateWithOutput && !duplicateWithHistory && !validateTweetText(text).length) {
            output.push({ text, sourceAge: normalizeSourceAge(tool?.sourceAge, ((i + 4) % 12) + 1) });
        }
    }

    return output.slice(0, TARGET_TWEETS);
}

function ensureExactTenTweets({ candidateTweets = [], blockedTweets = [], signals = [], nowIso = "" }) {
    const accepted = [];
    const historical = dedupeTexts(blockedTweets);

    const tryAdd = (tweet) => {
        if (!tweet) return;
        const baseText = typeof tweet === "string" ? tweet : tweet.text;
        const text = hardenTweetText(baseText, accepted.length + historical.length);
        const issues = validateTweetText(text);
        const duplicateWithAccepted = accepted.some((item) => isNearDuplicate(item.text, text));
        const duplicateWithHistory = historical.some((item) => isNearDuplicate(item, text));
        if (!issues.length && !duplicateWithAccepted && !duplicateWithHistory) {
            accepted.push({
                text,
                sourceAge: normalizeSourceAge(
                    typeof tweet === "object" ? tweet.sourceAge : "",
                    (accepted.length % 12) + 1
                ),
            });
        }
    };

    candidateTweets.forEach(tryAdd);

    if (accepted.length < TARGET_TWEETS) {
        const backup = buildLocalBackupTweets({
            blockedTweets: historical,
            existing: accepted,
            signals,
            nowIso,
        });
        backup.forEach(tryAdd);
    }

    if (accepted.length < TARGET_TWEETS) {
        const nonce = (nowIso || new Date().toISOString()).replace(/\D/g, "").slice(-8);
        for (let i = 0; i < 100 && accepted.length < TARGET_TWEETS; i += 1) {
            const tool = TOOL_LIBRARY[(i + nonce.length) % TOOL_LIBRARY.length];
            const text = hardenTweetText(
                `${tool.name}${tool.handle ? ` ${tool.handle}` : ""} is delivering strong creator momentum right now with practical wins for ${tool.audience}. Real use-case: ${tool.useCase}. Core edge: ${tool.capability}. Link: ${tool.link} ${DEFAULT_HASHTAGS[0]} ${pick(DEFAULT_HASHTAGS, i + 1)}`,
                i + nonce.length
            );
            const duplicateWithAccepted = accepted.some((item) => isNearDuplicate(item.text, text));
            if (!duplicateWithAccepted && !validateTweetText(text).length) {
                accepted.push({
                    text,
                    sourceAge: normalizeSourceAge(tool?.sourceAge, ((i + 5) % 12) + 1),
                });
            }
        }
    }

    while (accepted.length < TARGET_TWEETS) {
        const index = accepted.length;
        const tool = TOOL_LIBRARY[index % TOOL_LIBRARY.length];
        const text = hardenTweetText(
            `${tool.name}${tool.handle ? ` ${tool.handle}` : ""} gives builders a practical speed boost. Best use-case: ${tool.useCase}. Why it hits: ${tool.capability}. Try it now: ${tool.link} ${DEFAULT_HASHTAGS[0]}`,
            index + 200
        );
        accepted.push({
            text,
            sourceAge: normalizeSourceAge(tool?.sourceAge, ((index + 6) % 12) + 1),
        });
    }

    return accepted.slice(0, TARGET_TWEETS);
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
        `Each tweet must be ${MIN_TWEET_LENGTH}-${MAX_TWEET_LENGTH} chars (target ${TARGET_TWEET_LENGTH}-${MAX_TWEET_LENGTH}).`,
        "Every tweet must start with one word prefix + colon (example: INSIGHT: ...).",
        "Do not sound like a journalist or news reporter.",
        "Tweets must be practical AI tool discoveries with links, hashtags, account tags, and emojis.",
        "Use only last-24h AI tool launches/updates from the provided signals.",
        "No incomplete sentence endings and no generic filler output.",
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

    let signals = [];
    let toolSignalContext = `24h AI tool pool fallback: ${TOOL_FALLBACK_CONTEXT}.`;
    try {
        signals = await getTrendingNews();
        toolSignalContext = buildToolSignalContext(signals);
    } catch (error) {
        console.error("Tool signal fetch failed:", error);
    }

    const avoidTweets = dedupeTexts(Array.isArray(options?.avoidTweets) ? options.avoidTweets : []);
    let historyPrompt = "";
    let blockedTweets = [...avoidTweets];
    try {
        const [previousTweets, runTweets] = await Promise.all([
            getLastDaysTweets(3),
            getRecentRunTweets(24, 180),
        ]);
        blockedTweets = dedupeTexts([...avoidTweets, ...runTweets, ...previousTweets]);
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
                return ensureExactTenTweets({
                    candidateTweets,
                    blockedTweets,
                    signals,
                    nowIso,
                });
            }

            retryFeedback = issues.join("\n");
            console.warn(`[Gemini validation] attempt ${attempt} failed:\n${retryFeedback}`);
        } catch (error) {
            retryFeedback = `Attempt ${attempt} failed: ${error.message}`;
            console.error("Gemini attempt error:", error);
        }
    }

    return ensureExactTenTweets({
        candidateTweets: lastCandidate,
        blockedTweets,
        signals,
        nowIso,
    });
}

