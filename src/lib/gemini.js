import { getLastDaysTweets, getRecentRunTweets } from "./cache";
import { getTrendingNews } from "./news";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash"; // Deployed

const TARGET_TWEETS = 10;
const MAX_TWEET_LENGTH = 268;
const MAX_RAW_TWEET_LENGTH = 420;
const X_MAX_TWEET_LENGTH = 280;
const X_URL_LENGTH = 23;
const TARGET_X_MIN = 260;
const TARGET_X_MAX = 268;
const MIN_BODY_CORE_LENGTH = 210;
const TARGET_BODY_CORE_LENGTH = 235;
const MIN_HASHTAGS = 1;
const MAX_HASHTAGS = 2;
const MAX_MODEL_ATTEMPTS = 4;
const HISTORY_TWEET_LIMIT = 30;
const DUPLICATE_JACCARD_THRESHOLD = 0.56;

const DEFAULT_HASHTAGS = [
    "#AITools", "#AIBuilders", "#GenAI", "#AIGeneration", "#MachineLearning",
    "#DeepLearning", "#LLM", "#OpenSource", "#TechNews", "#Innovation",
    "#Startup", "#Coding", "#DevTools", "#ProductHunt", "#ShowHN"
];
const TRENDING_AI_HASHTAGS = [
    "#AI", "#GenAI", "#LLM", "#ChatGPT", "#Claude", "#Gemini", "#Cursor",
    "#Perplexity", "#Midjourney", "#Suno", "#Runway", "#HuggingFace",
    "#OpenSource", "#AIAgent", "#Copilot", "#Vercel", "#Replit"
];
const EXPERT_HOOK_WORDS = [
    "FRESH", "LATEST", "NEW", "JUST", "DROPPED", "SPOTTED", "FOUND",
    "INSIGHT", "SPOTLIGHT", "HOTDROP", "BREAKOUT", "POWERMOVE", "BUILDER", "LAUNCH"
];
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
const URL_RE = /https?:\/\/\S+|www\.\S+/i;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
const EMOJI_GLOBAL_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu;
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
    { name: "Replit", handle: "@Replit", link: "https://replit.com", audience: "full-stack devs", useCase: "deploy prototypes from a single browser tab", capability: "code, collaborate, and ship in one unified environment" },
    { name: "Canva", handle: "@canva", link: "https://canva.com", audience: "marketers", useCase: "create on-brand assets without deep design skills", capability: "generate and edit visual content with simple AI tools" },
    { name: "Mistral", handle: "@MistralAI", link: "https://mistral.ai", audience: "developers", useCase: "run efficient open models on local hardware", capability: "deploy high-performance models with low latency" },
    { name: "Synthesia", handle: "@synthesiaIO", link: "https://www.synthesia.io", audience: "L&D teams", useCase: "turn text scripts into training videos instantly", capability: "generate AI avatars that speak multiple languages" },
    { name: "Jasper", handle: "@heyjasperai", link: "https://www.jasper.ai", audience: "marketing teams", useCase: "scale blog and social content production", capability: "generate on-brand marketing copy at scale" },
    { name: "Notion AI", handle: "@NotionHQ", link: "https://www.notion.so", audience: "knowledge workers", useCase: "organize workspace notes into clear summaries", capability: "analyze and generate text directly in your docs" },
    { name: "Leonardo", handle: "@LeonardoAi_", link: "https://leonardo.ai", audience: "game artists", useCase: "generate assets for game environments quickly", capability: "create consistent visual assets with fine-tuned models" },
];

const SYSTEM_PROMPT = `You are @AIToolsExplorer - an AI EXPERIMENTER who shares FRESH discoveries.

🎯 YOUR JOB: Find and tweet about FRESH tools from the SIGNAL LIST below.

📋 SIGNAL LIST FORMAT:
"1. [GitHub] repo-name - description | url | 2h ago"
"2. [ProductHunt] ToolName - what it does | url | 5h ago"  
"3. [HackerNews] ProjectName | url | 8h ago"

✅ ALLOWED (only if in signal list with X < 24h):
- New tools from GitHub/HackerNews/ProductHunt
- NEW UPDATES to known tools (ChatGPT new model, Cursor new feature, Claude new version)
- Fresh launches (< 24h old)

❌🚫 FORBIDDEN (even if in signal list):
- Generic statements like "great tool for developers", "useful AI", "check this out"
- Tool descriptions without specific features
- Old known tools WITHOUT new updates (e.g., "ChatGPT is awesome" with no new feature)
- "This helps everyone" - be SPECIFIC who it's for

🔍 FOR NEW UPDATES TO KNOWN TOOLS:
- If signal says "ChatGPT new model" → tweet about the NEW MODEL
- If signal says "Cursor 2.0" → tweet about Cursor 2.0 features
- Must mention WHAT'S NEW in that update

🎣 HOOKS: LAUNCH:, JUST DROPPED:, FRESH:, SPOTTED:, BUILT:, SHIPPED:, NEW:, RELEASED:

📝 TWEET: "HOOK: ToolName NEW_FEATURE. TargetAudience. URL [SOURCE] #Tag1 #Tag2"

OUTPUT JSON:
{
  "tweets": [
    { "text": "TWEET", "sourceAge": "Xh ago" }
  ]
}

⚠️ Generate ${TARGET_TWEETS} tweets. Use different hooks. Each tweet MUST be unique!

Return ONLY JSON!`;

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

function extractTrendingHashtags(signals = []) {
    const tagCounts = {};
    const relevantTags = [
        "ai", "llm", "gpt", "chatgpt", "claude", "gemini", "cursor", "perplexity",
        "midjourney", "runway", "suno", "elevenlabs", "huggingface", "copilot", "vercel",
        "openai", "anthropic", "google", "meta", "mistral", "agent", "coding",
        "image", "video", "audio", "music", "生成", "api", "sdk", "open source"
    ];

    signals.forEach(signal => {
        const title = (signal?.title || "").toLowerCase();
        const source = (signal?.source || "").toLowerCase();

        relevantTags.forEach(tag => {
            if (title.includes(tag) || source.includes(tag)) {
                const tagKey = tag.startsWith("#") ? tag : `#${tag}`;
                tagCounts[tagKey] = (tagCounts[tagKey] || 0) + 1;
            }
        });
    });

    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag]) => tag);
}

function buildToolSignalContext(items = []) {
    if (!items.length) {
        return `24h tool signals unavailable. Prioritize practical tools from: ${TOOL_FALLBACK_CONTEXT}.`;
    }

    const trendingTags = extractTrendingHashtags(items);
    const sourceDiversity = {};
    const sourceCounts = {};

    items.slice(0, 25).forEach((item, index) => {
        const source = item?.source || "Unknown";
        sourceDiversity[source] = sourceDiversity[source] || [];
        sourceDiversity[source].push(index);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const sourceSummary = Object.entries(sourceCounts)
        .map(([src, count]) => `${src}: ${count}`)
        .join(", ");

    const contextParts = [
        `TRENDING TAGS FROM SIGNALS: ${trendingTags.join(", ") || "AI, LLM, GPT"}`,
        `SOURCE DIVERSITY: ${sourceSummary}`,
        "",
        "LATEST 24H TOOL SIGNALS:"
    ];

    const sortedByTime = [...items].sort((a, b) => {
        const timeA = parseTimeAgo(a?.timeAgo);
        const timeB = parseTimeAgo(b?.timeAgo);
        return timeA - timeB;
    });

    const limited = sortedByTime.slice(0, 20);
    limited.forEach((item, index) => {
        const title = cleanSignalTitle(item?.title || "Untitled AI tool signal");
        const timeAgo = item?.timeAgo || "fresh";
        const source = item?.source || "Unknown";
        const url = item?.url || "";
        contextParts.push(`${index + 1}. [${source}] ${title}${url ? ` | ${url}` : ""} | ${timeAgo}`);
    });

    return contextParts.join("\n");
}

function parseTimeAgo(timeStr) {
    if (!timeStr) return 999;
    const match = timeStr.toString().match(/(\d+)\s*([smhd])/i);
    if (!match) return 999;
    const amount = parseInt(match[1], 10) || 0;
    const unit = match[2].toLowerCase();
    if (unit === "s") return amount / 3600;
    if (unit === "m") return amount / 60;
    if (unit === "h") return amount;
    if (unit === "d") return amount * 24;
    return 999;
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

function getCoreTweetLength(text) {
    const value = typeof text === "string" ? text : "";
    if (!value) return 0;

    const withoutPrefix = value.replace(/^[A-Z][A-Z0-9]{2,16}:\s*/i, "");
    const withoutTags = withoutPrefix.replace(/#[a-z0-9_]+/gi, " ");
    const withoutEmoji = withoutTags.replace(EMOJI_GLOBAL_RE, "");
    return withoutEmoji.replace(/\s+/g, " ").trim().length;
}

function extractUrls(text) {
    return (text || "").match(/https?:\/\/\S+|www\.\S+/gi) || [];
}

function getXWeightedLength(text) {
    const value = typeof text === "string" ? text : "";
    if (!value) return 0;

    const matches = [...value.matchAll(/https?:\/\/\S+|www\.\S+/gi)];
    if (!matches.length) return Array.from(value).length;

    let total = 0;
    let cursor = 0;

    for (const match of matches) {
        const start = match.index ?? 0;
        const token = match[0] || "";
        const end = start + token.length;

        if (start > cursor) {
            total += Array.from(value.slice(cursor, start)).length;
        }

        total += X_URL_LENGTH;
        cursor = end;
    }

    if (cursor < value.length) {
        total += Array.from(value.slice(cursor)).length;
    }

    return total;
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
        /@[a-z0-9_]+$/i.test(output) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(output);

    if (endsWithAllowed) return output;

    output = output.replace(/[,:;]+$/g, "").trim();
    output = output.replace(FRAGMENT_END_RE, "").trim();

    const recheckAllowed =
        /[.!?]$/.test(output) ||
        /#[a-z0-9_]+$/i.test(output) ||
        /@[a-z0-9_]+$/i.test(output) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(output);

    if (recheckAllowed) return output;

    if (output.length < MAX_RAW_TWEET_LENGTH) {
        return `${output}.`.trim();
    }

    const cutAt = output.lastIndexOf(" ");
    if (cutAt > 0) {
        const shorter = output.slice(0, cutAt).trim();
        if (!shorter) return output;
        if (/[.!?]$/.test(shorter)) return shorter;
        if (shorter.length < MAX_RAW_TWEET_LENGTH) return `${shorter}.`;
        return shorter;
    }

    return output;
}

function fitToXLimit(text, seed = 0, maxWeighted = TARGET_X_MAX) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    if (!output) return output;

    const removablePhrases = [...ENGAGEMENT_LINES, ...LENGTH_FILLERS, ...MICRO_FILLERS];

    for (let guard = 0; guard < 220 && getXWeightedLength(output) > maxWeighted; guard += 1) {
        const tags = output.match(/#[a-z0-9_]+/gi) || [];
        if (tags.length > MIN_HASHTAGS) {
            const tagToDrop = tags[tags.length - 1];
            const idx = output.lastIndexOf(tagToDrop);
            if (idx >= 0) {
                output = `${output.slice(0, idx)} ${output.slice(idx + tagToDrop.length)}`
                    .replace(/\s+/g, " ")
                    .trim();
                continue;
            }
        }

        let removedPhrase = false;
        for (const phrase of removablePhrases) {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(`\\s*${escaped}\\s*`, "i");
            if (re.test(output)) {
                output = output.replace(re, " ").replace(/\s+/g, " ").trim();
                removedPhrase = true;
                break;
            }
        }
        if (removedPhrase) continue;

        const linkMatch = output.match(URL_RE);
        const linkIdx = linkMatch && typeof linkMatch.index === "number" ? linkMatch.index : -1;
        if (linkIdx > 0) {
            const head = output.slice(0, linkIdx).trim();
            const tail = output.slice(linkIdx).trim();
            const words = head.split(/\s+/).filter(Boolean);
            if (words.length > 8) {
                const dropAt = Math.max(3, words.length - 6);
                words.splice(dropAt, 1);
                output = `${words.join(" ")} ${tail}`.replace(/\s+/g, " ").trim();
                continue;
            }
        }

        const words = output.split(/\s+/).filter(Boolean);
        if (words.length <= 8) break;

        let dropIndex = words.length - 1;
        while (
            dropIndex > 0 &&
            (/^#/.test(words[dropIndex]) ||
                /^(https?:\/\/|www\.)/i.test(words[dropIndex]) ||
                /^@\w+/.test(words[dropIndex]))
        ) {
            dropIndex -= 1;
        }

        if (dropIndex <= 2) break;
        words.splice(dropIndex, 1);
        output = words.join(" ").replace(/\s+/g, " ").trim();
    }

    output = ensureCleanEnding(output);
    output = ensureRequiredTokens(output, seed + 31);

    if (getXWeightedLength(output) > maxWeighted) {
        while (getXWeightedLength(output) > maxWeighted && output.includes(" ")) {
            const chunks = output.split(/\s+/);
            let idx = chunks.length - 1;
            while (
                idx > 1 &&
                (/^#/.test(chunks[idx]) ||
                    /^(https?:\/\/|www\.)/i.test(chunks[idx]) ||
                    /^@\w+/.test(chunks[idx]))
            ) {
                idx -= 1;
            }
            if (idx <= 1) break;
            chunks.splice(idx, 1);
            output = chunks.join(" ").replace(/\s+/g, " ").trim();
        }
        output = ensureCleanEnding(output);
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

function trimToMaxLength(text, max = MAX_RAW_TWEET_LENGTH) {
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
        output = `${output} ${fallbackTool.link}`.replace(/\s+/g, " ").trim();
    }

    if (countMentions(output) < 1) {
        const mention = fallbackTool.handle || (fallbackTool.hashtag ? '' : "@OpenAI");
        if (mention) {
            output = `${output} ${mention}`.replace(/\s+/g, " ").trim();
        }
    }

    return output;
}

function ensureRequiredTokens(text, seed = 0) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    const fallbackTool = TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];
    const linkToken = `${fallbackTool.link}`;

    if (!hasValidUrl(output)) {
        const reserve = linkToken.length + 1;
        const cap = Math.max(180, MAX_RAW_TWEET_LENGTH - reserve);
        output = trimToMaxLength(output, cap);
        output = `${output} ${linkToken}`.replace(/\s+/g, " ").trim();
    }

    if (countMentions(output) < 1) {
        const mention = fallbackTool.handle || "@OpenAI";
        const reserve = mention.length + 1;
        const cap = Math.max(180, MAX_RAW_TWEET_LENGTH - reserve);
        output = trimToMaxLength(output, cap);
        output = `${output} ${mention}`.replace(/\s+/g, " ").trim();
    }

    return output;
}

function dedupeList(items = []) {
    const output = [];
    const seen = new Set();
    for (const item of items) {
        const value = (item || "").trim();
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(value);
    }
    return output;
}

function pickToolFromText(text = "", seed = 0) {
    const value = (text || "").toLowerCase();
    const byName = TOOL_LIBRARY.find((tool) => value.includes((tool.name || "").toLowerCase()));
    if (byName) return byName;
    const byHandle = TOOL_LIBRARY.find((tool) => tool.handle && value.includes(tool.handle.toLowerCase()));
    if (byHandle) return byHandle;
    return TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];
}

function cleanBodyForStructure(text = "") {
    let body = (text || "").trim();
    body = body.replace(/^[A-Z][A-Z0-9]{2,16}:\s*/i, "");
    body = body.replace(URL_RE, " ");
    body = body.replace(/#[a-z0-9_]+/gi, " ");
    body = body.replace(/@[a-z0-9_]+/gi, " ");
    body = body.replace(EMOJI_GLOBAL_RE, "");
    body = body.replace(/[|]+/g, " ");
    body = body.replace(/\s+/g, " ").trim();
    body = body.replace(/^[,.;:!?-]+/, "").replace(/[,.;:!?-]+$/, "").trim();
    return body;
}

function ensureBodySentence(body = "") {
    let output = (body || "").replace(/\s+/g, " ").trim();
    output = output.replace(FRAGMENT_END_RE, "").trim();
    if (!output) return output;
    if (!/[.!?]$/.test(output)) {
        output = `${output}.`;
    }
    return output;
}

function composeStructuredTweet({ hook, emoji, body, url, mention, hashtags }) {
    const parts = [
        `${hook}:`,
        emoji,
        body,
        url,
        ...hashtags,
    ].filter(part => part && part.trim());

    if (mention && mention.trim()) {
        parts.push(mention);
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function getContentRelevantHashtags(text, seed = 0) {
    const content = (text || "").toLowerCase();
    const relevantTags = [];

    const tagMappings = [
        { tags: ["#ChatGPT", "#GPT", "#OpenAI"], keywords: ["chatgpt", "gpt", "openai", "chat gpt"] },
        { tags: ["#Claude", "#Anthropic"], keywords: ["claude", "anthropic"] },
        { tags: ["#Gemini", "#GoogleAI", "#Google"], keywords: ["gemini", "google ai", "bard"] },
        { tags: ["#Cursor", "#AIcoding"], keywords: ["cursor", "code", "coding", "programming", "developer"] },
        { tags: ["#Perplexity", "#AIResearch"], keywords: ["perplexity", "research", "search"] },
        { tags: ["#Midjourney", "#AIArt"], keywords: ["midjourney", "image", "art", "生成", "visual"] },
        { tags: ["#Runway", "#AIVideo"], keywords: ["runway", "video", "movie", "film"] },
        { tags: ["#Suno", "#AIMusic"], keywords: ["suno", "music", "audio", "song"] },
        { tags: ["#ElevenLabs", "#AIVoice"], keywords: ["elevenlabs", "voice", "speech", "tts"] },
        { tags: ["#HuggingFace", "#OpenSource"], keywords: ["huggingface", "hugging face", "open source", "model"] },
        { tags: ["#AIAgent", "#Automation"], keywords: ["agent", "automation", "workflow", "autonomous"] },
        { tags: ["#LLM", "#LargeLanguageModel"], keywords: ["llm", "language model", "large language"] },
        { tags: ["#ProductHunt", "#ShowHN"], keywords: ["product hunt", "show hn", "launch"] },
        { tags: ["#GitHub"], keywords: ["github", "repo", "repository"] },
    ];

    tagMappings.forEach(({ tags, keywords }) => {
        if (keywords.some(kw => content.includes(kw))) {
            relevantTags.push(...tags);
        }
    });

    if (!relevantTags.length) {
        return [pick(TRENDING_AI_HASHTAGS, seed) || "#AITools", pick(DEFAULT_HASHTAGS, seed + 1) || "#AI"];
    }

    const shuffled = relevantTags.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
}

function formatStructuredTweet(text, seed = 0) {
    const tool = pickToolFromText(text, seed);
    const hook = pick(EXPERT_HOOK_WORDS, seed).replace(/[^A-Z0-9]/gi, "") || "FRESH";
    const emoji = (text.match(EMOJI_GLOBAL_RE) || [pick(["\uD83D\uDE80", "\uD83D\uDD25", "\u26A1", "\u2728", "\uD83E\uDDE0", "\uD83D\uDEE0"], seed + 1)])[0] || "\uD83D\uDE80";

    const urls = dedupeList(
        extractUrls(text)
            .map((value) => normalizeUrlToken(value))
            .filter((value) => isLikelyValidUrlToken(value))
    );
    const url = urls[0] || tool.link || "https://chatgpt.com";

    const mentionsRaw = dedupeList((text.match(/@[a-z0-9_]+/gi) || []));
    const mention = mentionsRaw[0] || tool.handle || "@OpenAI";

    let hashtags = dedupeList((text.match(/#[a-z0-9_]+/gi) || []));
    if (!hashtags.length) {
        hashtags = getContentRelevantHashtags(text, seed);
    }
    if (hashtags.length < 2) {
        const extra = getContentRelevantHashtags(text, seed + 5)[0];
        if (extra && !hashtags.find((tag) => tag.toLowerCase() === extra.toLowerCase())) {
            hashtags.push(extra);
        }
    }
    if (!tool.handle && tool.hashtag && !hashtags.includes(tool.hashtag)) {
        hashtags.push(tool.hashtag);
    }
    hashtags = hashtags.slice(0, MAX_HASHTAGS);

    let body = cleanBodyForStructure(text);
    if (!body) {
        body = `${tool.name} helps ${tool.audience} using ${tool.capability}. Best use-case: ${tool.useCase}`;
    }
    body = ensureBodySentence(body);

    let output = composeStructuredTweet({ hook, emoji, body, url, mention, hashtags });

    let shrinkGuard = 0;
    while (getXWeightedLength(output) > TARGET_X_MAX && shrinkGuard < 240) {
        const words = body.replace(/[.!?]$/g, "").split(/\s+/).filter(Boolean);
        if (words.length > 14) {
            words.splice(Math.max(6, words.length - 4), 1);
            body = ensureBodySentence(words.join(" "));
        } else if (hashtags.length > MIN_HASHTAGS) {
            hashtags = hashtags.slice(0, hashtags.length - 1);
        } else if (words.length > 8) {
            words.splice(words.length - 1, 1);
            body = ensureBodySentence(words.join(" "));
        } else {
            break;
        }
        output = composeStructuredTweet({ hook, emoji, body, url, mention, hashtags });
        shrinkGuard += 1;
    }

    const growthFillers = [...ENGAGEMENT_LINES, ...LENGTH_FILLERS, ...MICRO_FILLERS];
    let growGuard = 0;
    while (getXWeightedLength(output) < TARGET_X_MIN && growGuard < 160) {
        const filler = pick(growthFillers, seed + growGuard) || "Useful edge for daily builders.";
        let candidateBody = ensureBodySentence(
            `${body.replace(/[.!?]$/g, "")} ${filler}`.replace(/\s+/g, " ").trim()
        );
        let candidate = composeStructuredTweet({ hook, emoji, body: candidateBody, url, mention, hashtags });

        if (getXWeightedLength(candidate) > TARGET_X_MAX) {
            const room = TARGET_X_MAX - getXWeightedLength(output) - 1;
            if (room <= 0) break;
            const clipped = filler.slice(0, room).trim();
            if (!clipped) break;
            candidateBody = ensureBodySentence(
                `${body.replace(/[.!?]$/g, "")} ${clipped}`.replace(/\s+/g, " ").trim()
            );
            candidate = composeStructuredTweet({ hook, emoji, body: candidateBody, url, mention, hashtags });
        }

        if (getXWeightedLength(candidate) <= TARGET_X_MAX) {
            body = candidateBody;
            output = candidate;
        } else {
            break;
        }
        growGuard += 1;
    }

    output = ensureCleanEnding(output);
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
        const room = Math.max(0, MAX_RAW_TWEET_LENGTH - tag.length - 1);
        output = `${output.slice(0, room).trim()} ${tag}`.trim();
        output = trimToMaxLength(output);
    }

    return output.trim();
}

function padToMinimumLength(text, seed = 0) {
    let output = text.trim();
    if (getCoreTweetLength(output) >= MIN_BODY_CORE_LENGTH) return output;

    const fillers = [...LENGTH_FILLERS, ...ENGAGEMENT_LINES, ...MICRO_FILLERS];
    for (let i = 0; i < fillers.length * 2 && getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH; i += 1) {
        const filler = pick(fillers, seed + i);
        if (!filler) continue;
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) continue;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
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
    if (getCoreTweetLength(output) >= TARGET_BODY_CORE_LENGTH) return output;

    for (let i = 0; i < MICRO_FILLERS.length * 2 && getCoreTweetLength(output) < TARGET_BODY_CORE_LENGTH; i += 1) {
        const filler = pick(MICRO_FILLERS, seed + i);
        if (!filler) continue;
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
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

    if (output.length < MAX_RAW_TWEET_LENGTH) {
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
    output = fitToXLimit(output, seed + 12);
    output = trimToMaxLength(output);
    output = ensureHashtagRange(output, seed + 6);
    output = ensureCleanEnding(output);
    output = fitToXLimit(output, seed + 13);

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        output = padTowardTargetLength(output, seed + 7);
        output = padToMinimumLength(output, seed + 8);
        output = ensureRequiredTokens(output, seed + 12);
        output = fitToXLimit(output, seed + 14);
        output = trimToMaxLength(output);
    }

    if (countHashtags(output) < MIN_HASHTAGS) {
        output = ensureHashtagRange(output, seed + 9);
    }

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room > 0) {
            const add = "high utility for daily workflows".slice(0, room).trim();
            output = `${output} ${add}`.replace(/\s+/g, " ").trim();
        }
    }

    for (let i = 0; i < 8 && getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH; i += 1) {
        const filler = pick([...MICRO_FILLERS, ...LENGTH_FILLERS], seed + 20 + i);
        if (!filler) break;
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) break;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    output = ensureRequiredTokens(output, seed + 13);
    output = ensureHashtagRange(output, seed + 14);
    output = ensureCleanEnding(output);
    output = fitToXLimit(output, seed + 15);
    output = trimToMaxLength(output);

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        output = padToMinimumLength(output, seed + 15);
        output = ensureCleanEnding(output);
        output = fitToXLimit(output, seed + 16);
        output = trimToMaxLength(output);
    }

    output = formatStructuredTweet(output, seed + 30);
    output = fitToXLimit(output, seed + 31, TARGET_X_MAX);

    if (getXWeightedLength(output) < TARGET_X_MIN) {
        const nudge = pick(ENGAGEMENT_LINES, seed + 32) || "Strong utility for daily builders.";
        output = formatStructuredTweet(`${output} ${nudge}`, seed + 33);
        output = fitToXLimit(output, seed + 34, TARGET_X_MAX);
    }

    if (getXWeightedLength(output) > X_MAX_TWEET_LENGTH) {
        output = fitToXLimit(output, seed + 35, X_MAX_TWEET_LENGTH);
    }

    return ensureCleanEnding(output).trim();
}

function validateTweetText(text) {
    const value = typeof text === "string" ? text.trim() : "";
    const issues = [];

    if (!value) {
        issues.push("empty text");
        return issues;
    }

    const length = getCoreTweetLength(value);
    const rawLength = value.length;
    const xLength = getXWeightedLength(value);
    const hashtags = countHashtags(value);
    if (xLength < TARGET_X_MIN) issues.push(`too short X (${xLength})`);
    if (xLength > TARGET_X_MAX) issues.push(`too long X (${xLength})`);
    if (length < MIN_BODY_CORE_LENGTH) issues.push(`too short core (${length})`);
    if (length > MAX_TWEET_LENGTH) issues.push(`too long core (${length})`);
    if (rawLength > MAX_RAW_TWEET_LENGTH) issues.push(`too long raw (${rawLength})`);
    if (xLength > X_MAX_TWEET_LENGTH) issues.push(`exceeds hard X limit (${xLength})`);
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
        /@[a-z0-9_]+$/i.test(value) ||
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
            imageUrl: typeof tweet === "object" ? tweet?.imageUrl : null,
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
    return null; // Return null to trigger hashtag fallback
}

function buildSignalToolOptions(signals = []) {
    return signals.slice(0, 20).map((signal, index) => {
        const title = cleanSignalTitle(signal?.title || "");
        const name = title.split(/[|:,\-]/)[0]?.trim() || `AI Tool ${index + 1}`;
        const handle = detectHandle(name);

        // If no handle detected, create hashtag from tool name
        let hashtag = null;
        if (!handle) {
            // Create hashtag from tool name: remove special chars, capitalize words
            const cleanName = name
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');
            if (cleanName.length >= 3) {
                hashtag = `#${cleanName.replace(/\s+/g, '')}`;
            }
        }

        return {
            name,
            handle,
            hashtag, // Store fallback hashtag
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

function buildEmergencyTweet(tool, seed = 0) {
    const hashtagA = pick(DEFAULT_HASHTAGS, seed) || DEFAULT_HASHTAGS[0];
    const hashtagB = pick(DEFAULT_HASHTAGS, seed + 1) || DEFAULT_HASHTAGS[1] || DEFAULT_HASHTAGS[0];
    const uniqueTags = [hashtagA, hashtagB].filter((tag, idx, arr) => arr.indexOf(tag) === idx).join(" ");

    const base = `${tool.name}${tool.handle ? ` ${tool.handle}` : " @OpenAI"} helps ${tool.audience} with a practical edge: ${tool.capability}. Best use-case: ${tool.useCase}. ${tool.link} ${uniqueTags}`;
    return {
        text: hardenTweetText(base, seed + 700),
        sourceAge: normalizeSourceAge(tool?.sourceAge, ((seed % 12) + 1)),
        imageUrl: null,
    };
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
    const linkLine = `${tool.link}`;

    return {
        text: hardenTweetText(`${intro} ${linkLine} ${body} ${proof} ${hype} ${hashtags}`, index + entropy),
        sourceAge: normalizeSourceAge(tool?.sourceAge, (index % 12) + 1),
        imageUrl: null, // Will be generated later
    };
}

function buildLocalBackupTweets({ blockedTweets = [], existing = [], signals = [], nowIso = "" }) {
    const signalTools = buildSignalToolOptions(signals);
    const toolPool = [...signalTools, ...TOOL_LIBRARY];
    const output = [];
    const usedTexts = dedupeTexts([...blockedTweets, ...existing.map((item) => item.text)]);
    const entropy = Number((nowIso || "").replace(/\D/g, "").slice(-6)) || Date.now();

    for (let i = 0; i < toolPool.length * 3 && output.length < TARGET_TWEETS; i += 1) {
        const tool = toolPool[i % toolPool.length];
        const tweetObj = buildFallbackTweet(tool, i, entropy);
        const issues = validateTweetText(tweetObj.text);
        const duplicateWithOutput = output.some((item) => isNearDuplicate(item.text, tweetObj.text));
        const duplicateWithHistory = usedTexts.some((item) => isNearDuplicate(item, tweetObj.text));

        if (!issues.length && !duplicateWithOutput && !duplicateWithHistory) {
            output.push({
                text: tweetObj.text,
                sourceAge: normalizeSourceAge(tool?.sourceAge, (i % 12) + 1),
                imageUrl: tweetObj.imageUrl,
            });
        }
    }

    for (let i = 0; output.length < TARGET_TWEETS && i < 60; i += 1) {
        const tool = toolPool[(i + entropy) % toolPool.length] || TOOL_LIBRARY[i % TOOL_LIBRARY.length];
        const tweetObj = buildFallbackTweet(tool, i + 99, entropy);
        const duplicateWithOutput = output.some((item) => isNearDuplicate(item.text, tweetObj.text));
        const duplicateWithHistory = usedTexts.some((item) => isNearDuplicate(item, tweetObj.text));
        if (!duplicateWithOutput && !duplicateWithHistory && !validateTweetText(tweetObj.text).length) {
            output.push({
                text: tweetObj.text,
                sourceAge: normalizeSourceAge(tool?.sourceAge, ((i + 4) % 12) + 1),
                imageUrl: tweetObj.imageUrl,
            });
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
                imageUrl: typeof tweet === "object" ? tweet.imageUrl : null,
            });
        }
    };

    candidateTweets.forEach(tryAdd);

    if (accepted.length < TARGET_TWEETS && signals.length > 0) {
        const signalBasedTweets = buildSignalBasedTweets(signals, historical, accepted.length);
        signalBasedTweets.forEach(tryAdd);
    }

    if (accepted.length < TARGET_TWEETS && signals.length > 0) {
        const backupTweets = buildSmartBackupTweets(signals, historical, accepted.length);
        backupTweets.forEach(tryAdd);
    }

    return accepted.slice(0, TARGET_TWEETS);
}

function buildSmartBackupTweets(signals, blockedTweets, startSeed = 0) {
    const tweets = [];
    const now = Date.now() / 1000;
    const last24h = now - 86400;

    const usedTools = new Set();
    blockedTweets.forEach(t => {
        const match = t.match(/^([A-Z][A-Za-z]+):/);
        if (match) usedTools.add(match[1].toLowerCase());
    });

    const knownTools = ["chatgpt", "claude", "gemini", "cursor", "perplexity", "midjourney", "suno", "elevenlabs", "runway", "huggingface", "vercel", "replit", "copilot"];

    signals.forEach((signal, idx) => {
        const title = signal.title || "";
        const name = title.split(/[|:,\-]/)[0]?.trim().toLowerCase() || "";

        const isKnownTool = knownTools.some(k => name.includes(k));

        if (isKnownTool) {
            const hasNewIndicator = /new|update|v\d|version|release|feature|launch/i.test(title);
            if (!hasNewIndicator) return;
        }

        const toolKey = title.split(/[|:,\-]/)[0]?.trim().toLowerCase() || "newtool";
        if (usedTools.has(toolKey)) return;
        usedTools.add(toolKey);

        const source = signal.source || "Unknown";
        const sourceTag = source.includes("GitHub") ? "[GitHub]" :
                         source.includes("Hacker") ? "[HackerNews]" :
                         source.includes("Product") ? "[ProductHunt]" : "[AI]";

        const hashtags = getContentRelevantHashtags(title, startSeed + idx);
        const url = signal.url || "https://github.com";
        const hook = pick(EXPERT_HOOK_WORDS, startSeed + idx) || "FRESH";

        const toolName = title.split(/[|:,\-]/)[0]?.trim() || "New Tool";
        const body = title.length > 80 ? title.slice(0, 80) + "..." : title;

        const text = `${hook}: 🚀 ${body} ${sourceTag} ${url} ${hashtags.slice(0, 2).join(" ")}`;

        tweets.push({
            text: hardenTweetText(text, startSeed + idx + 200),
            sourceAge: signal.timeAgo || "fresh",
            imageUrl: null,
        });
    });

    return tweets;
}

function buildSignalBasedTweets(signals, blockedTweets, startSeed = 0) {
    const tweets = [];
    const now = Date.now() / 1000;
    const last24h = now - 86400;

    const freshSignals = signals
        .filter(s => s.timestamp >= last24h)
        .slice(0, 15);

    const usedTools = new Set();
    blockedTweets.forEach(t => {
        const match = t.match(/^([A-Z][A-Za-z]+):/);
        if (match) usedTools.add(match[1].toLowerCase());
    });

    freshSignals.forEach((signal, idx) => {
        const toolName = signal.title?.split(/[|:,\-]/)[0]?.trim() || "NewTool";
        const toolKey = toolName.toLowerCase();
        if (usedTools.has(toolKey)) return;
        usedTools.add(toolKey);

        const source = signal.source || "Unknown";
        const sourceTag = source.includes("GitHub") ? "[GitHub]" :
                         source.includes("Hacker") ? "[HackerNews]" :
                         source.includes("Product") ? "[ProductHunt]" : "[AI]";

        const hashtags = getContentRelevantHashtags(signal.title || "", startSeed + idx);
        const url = signal.url || "https://github.com";
        const hook = pick(EXPERT_HOOK_WORDS, startSeed + idx) || "FRESH";

        const body = `${toolName} ${sourceTag} - ${signal.title?.slice(0, 100) || "New AI tool"}`;
        const text = `${hook}: 🚀 ${body} ${url} ${hashtags.slice(0, 2).join(" ")}`;

        tweets.push({
            text: hardenTweetText(text, startSeed + idx + 100),
            sourceAge: signal.timeAgo || "fresh",
            imageUrl: null,
        });
    });

    return tweets;
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
        "TASK - READ CAREFULLY:",
        `Generate ${TARGET_TWEETS} tweets. Each tweet MUST be about a DIFFERENT tool from the signal list below.`,
        "USE EXACT TOOL NAMES FROM THE SIGNAL LIST - do not make up tool names!",
        "EVERY tweet needs: Tool Name + What it does + URL + Source [GitHub/HackerNews/ProductHunt] + 2 hashtags + 1 mention",
        `Tweet length: ${TARGET_X_MIN}-${TARGET_X_MAX} chars (URLs = ${X_URL_LENGTH} chars)`,
        `NEVER exceed ${X_MAX_TWEET_LENGTH} chars`,
        "NO GENERIC tweets like 'great tool for developers' - be SPECIFIC about features!",
        "NO repeats of tools - 10 different tools = 10 tweets",
        "NO old tools (ChatGPT, Claude, Midjourney) unless they have NEW 24h updates",
        "Use different hook each time: LAUNCH:, JUST DROPPED:, FRESH:, SPOTTED:, BUILT:, CREATED:, SHIPPED:, RELEASED:",
        `Current time: ${nowIso}`,
        "STRICT: If you can't find 10 unique fresh tools, generate FEWER tweets but make them quality!",
        retryFeedback ? `PREVIOUS ISSUES - FIX:\n${retryFeedback}` : "",
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
                    maxOutputTokens: 8192,
                    topP: 0.95,
                    topK: 40,
                    thinkingConfig: {
                        thinkingBudget: 4096,
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
    let signalsError = null;

    try {
        signals = await getTrendingNews();
        if (signals.length === 0) {
            signalsError = "No fresh AI tool signals found in last 24h. Please try again later when new tools launch.";
        } else {
            toolSignalContext = buildToolSignalContext(signals);
        }
    } catch (error) {
        console.error("Tool signal fetch failed:", error);
        signalsError = error.message;
    }

    if (signalsError) {
        throw new Error(`Cannot generate tweets: ${signalsError}. Check back later for fresh AI tool launches!`);
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
                let tweets = ensureExactTenTweets({
                    candidateTweets,
                    blockedTweets,
                    signals,
                    nowIso,
                });
                return tweets;
            }

            retryFeedback = issues.join("\n");
            console.warn(`[Gemini validation] attempt ${attempt} failed:\n${retryFeedback}`);
        } catch (error) {
            retryFeedback = `Attempt ${attempt} failed: ${error.message}`;
            console.error("Gemini attempt error:", error);
        }
    }

    let tweets = ensureExactTenTweets({
        candidateTweets: lastCandidate,
        blockedTweets,
        signals,
        nowIso,
    });

    return tweets;
}
