/**
 * Calculate relative time string.
 */
function getTimeAgo(timestamp) {
    const now = Date.now();
    const time = timestamp > 20000000000 ? timestamp : timestamp * 1000;
    const seconds = Math.floor((now - time) / 1000);

    let interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
}

const TOOL_SIGNAL_KEYWORDS = [
    "tool",
    "agent",
    "assistant",
    "copilot",
    "model",
    "gpt",
    "llm",
    "workflow",
    "automation",
    "plugin",
    "extension",
    "app",
    "platform",
    "sdk",
    "api",
    "image",
    "video",
    "voice",
    "coding",
    "chatgpt",
    "claude",
    "gemini",
    "cursor",
    "perplexity",
    "midjourney",
    "runway",
    "suno",
    "elevenlabs",
    "copilot",
    "stable diffusion",
    // Deep AI tool discovery terms
    "mcp",
    "model context protocol",
    "browser",
    "chrome",
    "jules",
    "devin",
    "lovable",
    "bolt",
    "v0",
    "vercel",
    "replit",
    "langchain",
    "llamaindex",
    "crewai",
    "autogen",
    "langflow",
    "n8n",
    "make.com",
    "zapier",
    "bubble",
    "webflow",
    "figma",
    "notion",
    "linear",
    "raycast",
    "warp",
    "ghost",
    "obsidian",
    "logseq",
    "tana",
    "reflect",
    "mem",
    "fireflies",
    "otter",
    "descript",
    "pika",
    "kling",
    "hailuo",
    "luma",
    "sora",
    "veo",
    "udio",
    "stable audio",
    "playground",
    "ideogram",
    "recraft",
    "magnific",
    "topaz",
    "windsurf",
    "cascade",
    "aide",
    "cody",
    "tabnine",
    "codeium",
    "super maven",
    "cline",
    "aider",
    "gpt engineer",
    "swe agent",
    "openhands",
    "composio",
    "mindsdb",
    "dify",
    "coze",
    "botpress",
    "voiceflow",
    "relevance",
    "mem0",
    "letta",
    "langgraph",
    "langsmith",
    "tavily",
    "exa",
    "perplexity api",
    "serper",
    "fal",
    "replicate",
    "together",
    "anyscale",
    "fireworks",
    "groq",
    "deepgram",
    "assemblyai",
    "cartesia",
    "resemble",
    "playht",
    "heygen",
    "d-id",
    "hourone",
    "colossyan",
    "elai",
    "invideo",
    "pictory",
    "opencord",
    "taplio",
    "typeshare",
    "jasper",
    "copy.ai",
    "writesonic",
    "rytr",
    "jasper ai",
    "surfer seo",
    "frase",
    "jasper",
    "gamma",
    "beautiful.ai",
    "tome",
    "decktopus",
    "slidesai",
    "plus ai",
    "merlin",
    "harpa",
    "maxai",
    "monica",
    "sider",
    "voila",
    "arc",
    "zen",
    "opera",
    "sigma os",
    "perplexity assistant",
    "rabbit",
    "humane",
    "friend",
    "meta ai",
    "llama",
    "mistral",
    "mixtral",
    "qwen",
    "deepseek",
    "yi",
    "cohere",
    "command r",
    "jamba",
    "dbrx",
    "phi",
    "wizardlm",
];

const AI_CONTEXT_KEYWORDS = [
    "ai",
    "genai",
    "llm",
    "gpt",
    "chatgpt",
    "claude",
    "gemini",
    "copilot",
    "chatbot",
    "rag",
    "diffusion",
];

const TOOL_ACTIVITY_KEYWORDS = [
    "launch",
    "launched",
    "release",
    "released",
    "update",
    "updated",
    "new",
    "introducing",
    "ships",
    "shipping",
    "rollout",
    "beta",
    "feature",
    "upgrade",
    "show hn",
    "changelog",
    "integration",
    "plugin",
    "template",
    "open source",
];

const TOOL_UTILITY_KEYWORDS = [
    "builder",
    "creator",
    "automation",
    "workflow",
    "extension",
    "plugin",
    "assistant",
    "agent",
    "app",
    "sdk",
    "api",
    "repo",
];

const KNOWN_TOOL_BRANDS = [
    "chatgpt",
    "openai",
    "claude",
    "anthropic",
    "gemini",
    "google ai",
    "cursor",
    "perplexity",
    "midjourney",
    "runway",
    "suno",
    "elevenlabs",
    "copilot",
    "hugging face",
    "stability ai",
    "vercel ai",
    "bolt",
    "replit",
    // Deep AI tool brands
    "mcp",
    "model context protocol",
    "jules",
    "devin",
    "lovable",
    "v0",
    "windsurf",
    "cascade",
    "cline",
    "aider",
    "deepseek",
    "mistral",
    "cohere",
    "groq",
    "together ai",
    "fal",
    "replicate",
    "langchain",
    "crewai",
    "autogen",
    "composio",
    "dify",
    "coze",
    "heygen",
    "synthesia",
    "descript",
    "pika",
    "kling",
    "luma",
    "sora",
    "veo",
    "udio",
    "ideogram",
    "gamma",
    "notion ai",
    "lovable",
    "creatomate",
    "raycast",
    "warp",
    "arc",
    "merlin",
    "harpa",
    "monica",
    "swe agent",
    "openhands",
    "letta",
    "mem0",
    "tavily",
    "exa",
    "cody",
    "codeium",
    "tabnine",
    "super maven",
    "augment code",
    "poolside",
    "magic dev",
    "replit agent",
    "vercel v0",
    "bolt new",
    "lovable dev",
    "creatie",
    "tempo labs",
    "builder io",
    "figma ai",
    "canva ai",
    "jasper",
    "copy.ai",
    "writesonic",
];

const NEWSY_EXCLUSION_KEYWORDS = [
    "funding",
    "raised",
    "raises",
    "acquire",
    "acquisition",
    "lawsuit",
    "regulation",
    "policy",
    "government",
    "election",
    "stock",
    "earnings",
    "market",
    "valuation",
    "ipo",
    // Additional filters for generic AI news
    "opinion",
    "editorial",
    "analysis",
    "forecast",
    "prediction",
    "trends",
    "report",
    "survey",
    "study finds",
    "researchers find",
    "according to research",
    "experts say",
    "debate",
    "controversy",
    "ethics",
    "bias",
    "job loss",
    "replace human",
    "will ai",
    "future of ai",
    "rise of ai",
    "impact of ai",
    "ai is changing",
    "how ai is",
    "what ai means",
    "why ai",
    "can ai",
    "should we",
    "will we",
];

const GENERIC_AI_PATTERNS = [
    /ai (is|will|can|should|must|might|could|may|has|have|had)\b/i,
    /the (future|rise|dawn|age|era) of ai/i,
    /how (ai|artificial intelligence) (is|will|can|could)/i,
    /why (ai|artificial intelligence) (is|will|can|could)/i,
    /what (ai|artificial intelligence) (is|means|could|will)/i,
    /top \d+ (ai|best|must|essential)/i,
    /^\d+ (best|essential|must-have|top) /i,
    /roundup|weekly (round)?up|digest|newsletter/i,
];

const COMMUNITY_RSS_SOURCES = [
    { source: "Medium-AITools", url: "https://medium.com/feed/tag/ai-tools", limit: 14 },
    { source: "Medium-GenAI", url: "https://medium.com/feed/tag/generative-ai", limit: 14 },
    { source: "Medium-AIAgents", url: "https://medium.com/feed/tag/ai-agents", limit: 12 },
    { source: "Medium-LLM", url: "https://medium.com/feed/tag/llm", limit: 12 },
    { source: "Medium-PromptEng", url: "https://medium.com/feed/tag/prompt-engineering", limit: 10 },
    { source: "Medium-AICoding", url: "https://medium.com/feed/tag/ai-coding", limit: 10 },
    { source: "Medium-MCP", url: "https://medium.com/feed/tag/mcp", limit: 10 },
    { source: "Devto-AI", url: "https://dev.to/feed/tag/ai", limit: 14 },
    { source: "Devto-ML", url: "https://dev.to/feed/tag/machine-learning", limit: 12 },
    { source: "Devto-GPT", url: "https://dev.to/feed/tag/gpt", limit: 10 },
    { source: "Devto-OpenSource", url: "https://dev.to/feed/tag/open-source", limit: 10 },
    { source: "Devto-AITools", url: "https://dev.to/feed/tag/aitools", limit: 10 },
    { source: "Devto-MCP", url: "https://dev.to/feed/tag/mcp", limit: 8 },
    { source: "Reddit-ChatGPT", url: "https://www.reddit.com/r/ChatGPT/.rss", limit: 18 },
    { source: "Reddit-AI", url: "https://www.reddit.com/r/ArtificialInteligence/.rss", limit: 18 },
    { source: "Reddit-LocalLLaMA", url: "https://www.reddit.com/r/LocalLLaMA/.rss", limit: 16 },
    { source: "Reddit-StableDiffusion", url: "https://www.reddit.com/r/StableDiffusion/.rss", limit: 16 },
    { source: "Reddit-Artificial", url: "https://www.reddit.com/r/technology/.rss", limit: 10 },
    { source: "Reddit-MachineLearning", url: "https://www.reddit.com/r/MachineLearning/.rss", limit: 12 },
    { source: "Reddit-AITools", url: "https://www.reddit.com/r/aitools/.rss", limit: 12 },
    { source: "Reddit-AIAgents", url: "https://www.reddit.com/r/AI_Agents/.rss", limit: 12 },
    { source: "Reddit-MCP", url: "https://www.reddit.com/r/mcp/.rss", limit: 10 },
    { source: "Reddit-ClaudeAI", url: "https://www.reddit.com/r/ClaudeAI/.rss", limit: 12 },
    { source: "Reddit-OpenAI", url: "https://www.reddit.com/r/OpenAI/.rss", limit: 12 },
    { source: "TowardsDataScience", url: "https://towardsdatascience.com/feed", limit: 12 },
    { source: "AnalyticsVidhya", url: "https://www.analyticsvidhya.com/blog/feed/", limit: 12 },
    { source: "OpenAI-News", url: "https://openai.com/news/rss.xml", limit: 10 },
    { source: "GoogleAI-Blog", url: "https://blog.google/technology/ai/rss/", limit: 10 },
    { source: "Anthropic-News", url: "https://www.anthropic.com/news/rss.xml", limit: 10 },
    { source: "HuggingFace-Blog", url: "https://huggingface.co/blog/rss.xml", limit: 10 },
    { source: "Mistral-Blog", url: "https://mistral.ai/news/feed/", limit: 8 },
    { source: "DeepSeek-Blog", url: "https://deepseek.com/blog/feed/", limit: 8 },
    { source: "MIT-News", url: "https://news.mit.edu/rss/feed/topic/artificial-intelligence", limit: 8 },
    { source: "Wired-AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", limit: 10 },
    { source: "TechCrunch-AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", limit: 10 },
    { source: "VentureBeat-AI", url: "https://venturebeat.com/category/ai/feed/", limit: 10 },
    { source: "TheVerge-AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", limit: 10 },
    { source: "ArsTechnica-AI", url: "https://feeds.arstechnica.com/arstechnica/ai", limit: 8 },
];

function isToolSignalTitle(title, source = "") {
    const normalized = (title || "").toLowerCase();
    if (!normalized) return false;

    if (NEWSY_EXCLUSION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return false;
    }

    // Reject generic AI opinion/trend pieces
    if (GENERIC_AI_PATTERNS.some((pattern) => pattern.test(normalized))) {
        return false;
    }

    // Reject very short or very long titles (likely not tool signals)
    if (normalized.length < 15 || normalized.length > 300) {
        // But allow GitHub repo names which can be short
        const isGitHub = (source || "").toLowerCase().includes("github");
        if (!isGitHub || normalized.length < 5) return false;
    }

    const containsKeyword = (keyword) => {
        if (!keyword) return false;
        if (keyword.length <= 3 || keyword === "ai" || keyword === "mcp") {
            return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(normalized);
        }
        return normalized.includes(keyword);
    };

    const hasKnownBrand = KNOWN_TOOL_BRANDS.some(containsKeyword);
    const hasAiContext = AI_CONTEXT_KEYWORDS.some(containsKeyword);
    const hasToolKeyword = TOOL_SIGNAL_KEYWORDS.some(containsKeyword);
    const hasActivityKeyword = TOOL_ACTIVITY_KEYWORDS.some(containsKeyword);
    const hasUtilityKeyword = TOOL_UTILITY_KEYWORDS.some(containsKeyword);
    const sourceNormalized = (source || "").toLowerCase();
    const toolHeavySource = /producthunt|github|hackernews|devto|medium|reddit|towards|analytics|openai|googleai|anthropic|venturebeat|verge|arstechnica/.test(
        sourceNormalized
    );

    // Strong signal: known tool brand with activity or tool keywords
    if (hasKnownBrand && (hasActivityKeyword || hasToolKeyword || hasUtilityKeyword || hasAiContext)) {
        return true;
    }

    // Tool-specific combination: tool keyword + activity
    if (hasToolKeyword && (hasActivityKeyword || hasUtilityKeyword)) {
        return true;
    }

    // From tool-heavy source: activity keyword + ai context is good enough
    if (toolHeavySource && hasActivityKeyword && hasAiContext) {
        return true;
    }

    // New: if from ProductHunt/HackerNews/GitHub with specific tool name pattern
    if (toolHeavySource && hasActivityKeyword && normalized.length > 20) {
        // Check for specific tool/project name pattern (e.g., "Name - description")
        const hasProjectNamePattern = /^[a-z0-9][\w\s.-]{3,40}[-–:|]\s*.+/i.test(normalized);
        if (hasProjectNamePattern) return true;
    }

    // Catch MCP servers, Chrome extensions, and specialized AI tools by name
    if (hasToolKeyword && normalized.length > 20 && (hasActivityKeyword || hasUtilityKeyword || toolHeavySource)) {
        return true;
    }

    return false;
}

function sanitizeFeedText(value = "") {
    return value
        .replace("<![CDATA[", "")
        .replace("]]>", "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function parseRssItems(rssText) {
    return rssText.match(/<item>[\s\S]*?<\/item>/g) || [];
}

function parseAtomEntries(feedText) {
    return feedText.match(/<entry[\s\S]*?<\/entry>/g) || [];
}

function parseRssField(item, tag) {
    const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return match ? match[1] : "";
}

function parseAtomLink(entry) {
    const selfClosing = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    if (selfClosing) return selfClosing[1];
    const block = entry.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    if (block) {
        const href = block[1].match(/href=["']([^"']+)["']/i);
        if (href) return href[1];
    }
    return "";
}

/**
 * Fetch Product Hunt feed for very recent launches.
 */
async function fetchProductHuntFeed(limit = 20) {
    try {
        const response = await fetch("https://www.producthunt.com/feed", {
            next: { revalidate: 900 },
            headers: {
                "User-Agent": "ai-x-tweet-agent/1.0",
                Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
            },
        });
        if (!response.ok) return [];

        const text = await response.text();
        const items = parseRssItems(text);

        return items.slice(0, limit).map((item) => {
            const title = parseRssField(item, "title")
                .replace("<![CDATA[", "")
                .replace("]]>", "")
                .trim();
            const link = parseRssField(item, "link").trim();
            const dateRaw = parseRssField(item, "pubDate");
            const pubDate = dateRaw ? new Date(dateRaw).getTime() : Date.now();

            return {
                title,
                url: link || "https://www.producthunt.com/",
                source: "ProductHunt",
                timeAgo: getTimeAgo(pubDate),
                timestamp: Math.floor(pubDate / 1000),
            };
        });
    } catch (error) {
        console.error("ProductHunt feed error:", error);
        return [];
    }
}

/**
 * Fetch Show HN stories that often contain tool launches.
 */
async function fetchHackerNews(limit = 25) {
    try {
        const topRes = await fetch("https://hacker-news.firebaseio.com/v0/showstories.json", {
            next: { revalidate: 300 },
        });
        const topIds = await topRes.json();
        const slice = topIds.slice(0, limit);

        const items = await Promise.all(
            slice.map((id) =>
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                    next: { revalidate: 1800 },
                }).then((response) => response.json())
            )
        );

        return items
            .filter((item) => item && !item.deleted && !item.dead)
            .map((item) => ({
                title: item.title,
                url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
                source: "HackerNews",
                timeAgo: getTimeAgo(item.time),
                timestamp: item.time,
            }));
    } catch (error) {
        console.error("HackerNews fetch error:", error);
        return [];
    }
}

/**
 * Fetch top new Ask HN posts for AI tools discussions
 */
async function fetchHackerNewsAsk(limit = 10) {
    try {
        const askRes = await fetch("https://hacker-news.firebaseio.com/v0/askstories.json", {
            next: { revalidate: 600 },
        });
        const askIds = await askRes.json();
        const slice = askIds.slice(0, limit);

        const items = await Promise.all(
            slice.map((id) =>
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                    next: { revalidate: 1800 },
                }).then((r) => r.json())
            )
        );

        return items
            .filter((item) => item && !item.deleted)
            .map((item) => ({
                title: `[AskHN] ${item.title}`,
                url: `https://news.ycombinator.com/item?id=${item.id}`,
                source: "HackerNews-Ask",
                timeAgo: getTimeAgo(item.time),
                timestamp: item.time,
            }));
    } catch (error) {
        console.error("HackerNews Ask fetch error:", error);
        return [];
    }
}

/**
 * Fetch newly pushed AI repositories in last 24h from GitHub.
 */
async function fetchGitHubAITools(limit = 20) {
    const results = [];
    const now = new Date();
    const last24hDate = new Date(now.getTime() - 86400000).toISOString().split('.')[0] + 'Z';
    const last24h = Math.floor(now.getTime() / 1000) - 86400;

    try {
        const queries = [
            `topic:ai pushed:>${last24hDate} stars:>=5 archived:false`,
            `topic:machine-learning pushed:>${last24hDate} stars:>=5 archived:false`,
            `topic:llm pushed:>${last24hDate} stars:>=3 archived:false`,
            `topic:gpt pushed:>${last24hDate} stars:>=5 archived:false`,
            `topic:ai-agent pushed:>${last24hDate} stars:>=3 archived:false`,
            `topic:mcp pushed:>${last24hDate} stars:>=2 archived:false`,
            `mcp-server pushed:>${last24hDate} stars:>=2 archived:false`,
            `chrome-extension+ai pushed:>${last24hDate} stars:>=2 archived:false`,
            `ai-tool pushed:>${last24hDate} stars:>=3 archived:false`,
        ];

        for (const query of queries.slice(0, 4)) {
            try {
                const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=15`;
                const response = await fetch(url, {
                    next: { revalidate: 900 },
                    headers: {
                        "User-Agent": "ai-x-tweet-agent/1.0",
                        Accept: "application/vnd.github+json",
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const items = Array.isArray(data?.items) ? data.items : [];
                    results.push(...items);
                }
            } catch (e) {
                console.error("GitHub query error:", e);
            }
        }

        const seen = new Set();
        const deduped = results.filter(repo => {
            if (seen.has(repo.full_name)) return false;
            seen.add(repo.full_name);
            return true;
        });

        return deduped.slice(0, limit).map((repo) => {
            const updatedAt = new Date(repo.updated_at).getTime();
            const description = repo.description ? ` - ${repo.description}` : "";
            return {
                title: `${repo.full_name}${description}`.trim(),
                url: repo.html_url,
                source: "GitHub",
                timeAgo: getTimeAgo(updatedAt),
                timestamp: Math.floor(updatedAt / 1000),
                stars: repo.stargazers_count,
            };
        });
    } catch (error) {
        console.error("GitHub AI tools fetch error:", error);
        return [];
    }
}

/**
 * Fetch GitHub trending repos for AI category
 */
async function fetchGitHubTrending(limit = 20) {
    const results = [];
    const queries = [
        "ai OR llm OR gpt OR chatbot created:>2024",
        "machine-learning OR tensorflow OR pytorch created:>2024",
        "openai OR anthropic OR gemini-api created:>2024",
        "copilot OR code-assistant OR ai-coder created:>2024",
        "mcp OR model-context-protocol created:>2024",
        "chrome-extension AI OR browser-ai created:>2024",
    ];

    for (const query of queries.slice(0, 3)) {
        try {
            const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=15`;
            const response = await fetch(url, {
                next: { revalidate: 1800 },
                headers: {
                    "User-Agent": "ai-x-tweet-agent/1.0",
                    Accept: "application/vnd.github+json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                const items = Array.isArray(data?.items) ? data.items : [];
                results.push(...items);
            }
        } catch (e) {
            console.error("GitHub trending query error:", e);
        }
    }

    const seen = new Set();
    const deduped = results.filter(repo => {
        if (seen.has(repo.full_name)) return false;
        seen.add(repo.full_name);
        return true;
    });

    return deduped.slice(0, limit).map((repo) => {
        const createdAt = new Date(repo.created_at).getTime();
        const updatedAt = new Date(repo.updated_at).getTime();
        return {
            title: `${repo.full_name} - ${repo.description || "AI tool"}`,
            url: repo.html_url,
            source: "GitHub-Trending",
            timeAgo: getTimeAgo(updatedAt),
            timestamp: Math.floor(updatedAt / 1000),
            stars: repo.stargazers_count,
        };
    });
}

/**
 * Fetch newly created AI repos from last 7 days
 */
async function fetchGitHubFreshRepos(limit = 20) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const results = [];

    const topics = ["ai", "llm", "gpt", "openai", "chatbot", "machine-learning", "ai-agent", "rag", "mcp", "chrome-extension"];

    for (const topic of topics.slice(0, 4)) {
        try {
            const query = `topic:${topic} created:>=${oneDayAgo} stars:>5`;
            const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=12`;
            const response = await fetch(url, {
                next: { revalidate: 3600 },
                headers: {
                    "User-Agent": "ai-x-tweet-agent/1.0",
                    Accept: "application/vnd.github+json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                const items = Array.isArray(data?.items) ? data.items : [];
                results.push(...items);
            }
        } catch (e) {
            console.error("GitHub fresh repos error:", e);
        }
    }

    const seen = new Set();
    const deduped = results.filter(repo => {
        if (seen.has(repo.full_name)) return false;
        seen.add(repo.full_name);
        return true;
    });

    return deduped.slice(0, limit).map((repo) => {
        const createdAt = new Date(repo.created_at).getTime();
        return {
            title: `${repo.full_name} - ${repo.description || "New AI repo"}`,
            url: repo.html_url,
            source: "GitHub-Fresh",
            timeAgo: getTimeAgo(createdAt),
            timestamp: Math.floor(createdAt / 1000),
            stars: repo.stargazers_count,
        };
    });
}

/**
 * Google News fallback if direct tool sources are sparse.
 */
async function fetchGoogleNewsFallback(limit = 20) {
    try {
        const query = "new AI tool launched OR AI tool update OR Show HN AI tool";
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:1d&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(url, { next: { revalidate: 3600 } });
        if (!response.ok) return [];

        const text = await response.text();
        const items = parseRssItems(text);

        return items.slice(0, limit).map((item) => {
            const title = parseRssField(item, "title")
                .replace(" - Google News", "")
                .replace("<![CDATA[", "")
                .replace("]]>", "")
                .trim();
            const link = parseRssField(item, "link").trim();
            const dateRaw = parseRssField(item, "pubDate");
            const pubDate = dateRaw ? new Date(dateRaw).getTime() : Date.now();

            return {
                title,
                url: link || "#",
                source: "GoogleNewsFallback",
                timeAgo: getTimeAgo(pubDate),
                timestamp: Math.floor(pubDate / 1000),
            };
        });
    } catch (error) {
        console.error("Google News fallback fetch error:", error);
        return [];
    }
}

async function fetchCommunityRssToolSignals() {
    const feeds = await Promise.all(
        COMMUNITY_RSS_SOURCES.map(async ({ source, url, limit }) => {
            try {
                const response = await fetch(url, {
                    next: { revalidate: 1800 },
                    headers: {
                        "User-Agent": "ai-x-tweet-agent/1.0",
                        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
                    },
                });
                if (!response.ok) return [];

                const text = await response.text();
                const rssItems = parseRssItems(text);
                const atomEntries = parseAtomEntries(text);

                if (rssItems.length > 0) {
                    return rssItems.slice(0, limit).map((item) => {
                        const title = sanitizeFeedText(parseRssField(item, "title"));
                        const link = sanitizeFeedText(parseRssField(item, "link"));
                        const dateRaw = parseRssField(item, "pubDate") || parseRssField(item, "updated");
                        const pubDate = dateRaw ? new Date(dateRaw).getTime() : 0;

                        return {
                            title,
                            url: link || "#",
                            source,
                            timeAgo: pubDate ? getTimeAgo(pubDate) : "unknown",
                            timestamp: pubDate ? Math.floor(pubDate / 1000) : 0,
                        };
                    });
                }

                return atomEntries.slice(0, limit).map((entry) => {
                    const title = sanitizeFeedText(parseRssField(entry, "title"));
                    const link = sanitizeFeedText(parseAtomLink(entry));
                    const dateRaw = parseRssField(entry, "updated") || parseRssField(entry, "published");
                    const pubDate = dateRaw ? new Date(dateRaw).getTime() : 0;

                    return {
                        title,
                        url: link || "#",
                        source,
                        timeAgo: pubDate ? getTimeAgo(pubDate) : "unknown",
                        timestamp: pubDate ? Math.floor(pubDate / 1000) : 0,
                    };
                });
            } catch (error) {
                console.error(`Community source fetch error (${source}):`, error);
                return [];
            }
        })
    );

    return feeds.flat();
}

function dedupeByTitleAndUrl(items = []) {
    const unique = [];
    const seen = new Set();

    for (const item of items) {
        const key = `${(item.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}|${(item.url || "").toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    return unique;
}

function diversifyBySource(items = []) {
    const caps = {
        GitHub: 10,
        "GitHub-Fresh": 8,
        "GitHub-Trending": 8,
        HackerNews: 10,
        "HackerNews-Ask": 5,
        ProductHunt: 15,
        "Devto-AI": 8,
        "Devto-ML": 7,
        "Devto-GPT": 5,
        "Devto-OpenSource": 5,
        "Devto-AITools": 8,
        "Devto-MCP": 6,
        "Medium-AITools": 7,
        "Medium-GenAI": 7,
        "Medium-AIAgents": 7,
        "Medium-LLM": 6,
        "Medium-PromptEng": 5,
        "Medium-AICoding": 5,
        "Medium-MCP": 6,
        "Reddit-AI": 7,
        "Reddit-ChatGPT": 7,
        "Reddit-LocalLLaMA": 7,
        "Reddit-StableDiffusion": 7,
        "Reddit-MachineLearning": 5,
        "Reddit-Artificial": 5,
        "Reddit-AITools": 8,
        "Reddit-AIAgents": 8,
        "Reddit-MCP": 6,
        "Reddit-ClaudeAI": 6,
        "Reddit-OpenAI": 6,
        TowardsDataScience: 6,
        AnalyticsVidhya: 6,
        "OpenAI-News": 6,
        "GoogleAI-Blog": 6,
        "Anthropic-News": 6,
        "HuggingFace-Blog": 5,
        "Mistral-Blog": 5,
        "DeepSeek-Blog": 5,
        "MIT-News": 5,
        "Wired-AI": 5,
        "TechCrunch-AI": 5,
        "VentureBeat-AI": 6,
        "TheVerge-AI": 5,
        "ArsTechnica-AI": 5,
        GoogleNewsFallback: 8,
    };

    const picked = [];
    const counts = {};

    for (const item of items) {
        const source = item.source || "Unknown";
        const cap = caps[source] || 6;
        const current = counts[source] || 0;
        if (current >= cap) continue;
        picked.push(item);
        counts[source] = current + 1;
    }

    return picked;
}

function prioritizeSources(items = []) {
    const sourceWeight = {
        ProductHunt: 100,
        GitHub: 84,
        HackerNews: 92,
        "Reddit-LocalLLaMA": 88,
        "Reddit-ChatGPT": 86,
        "Reddit-StableDiffusion": 86,
        "Reddit-AI": 82,
        "Reddit-AITools": 88,
        "Reddit-AIAgents": 88,
        "Reddit-MCP": 90,
        "Reddit-ClaudeAI": 82,
        "Reddit-OpenAI": 82,
        "Reddit-MachineLearning": 78,
        "Medium-AITools": 84,
        "Medium-AIAgents": 84,
        "Medium-LLM": 82,
        "Medium-GenAI": 80,
        "Medium-MCP": 86,
        "Medium-AICoding": 82,
        "Devto-AI": 80,
        "Devto-ML": 78,
        "Devto-AITools": 84,
        "Devto-MCP": 86,
        "Devto-GPT": 76,
        "OpenAI-News": 72,
        "GoogleAI-Blog": 72,
        "Anthropic-News": 72,
        "Mistral-Blog": 74,
        "DeepSeek-Blog": 76,
        "HuggingFace-Blog": 72,
        TowardsDataScience: 68,
        AnalyticsVidhya: 66,
        "VentureBeat-AI": 60,
        "TheVerge-AI": 58,
        "TechCrunch-AI": 56,
        "ArsTechnica-AI": 54,
        GoogleNewsFallback: 40,
    };

    return [...items].sort((a, b) => {
        const weightDiff = (sourceWeight[b.source] || 50) - (sourceWeight[a.source] || 50);
        if (weightDiff !== 0) return weightDiff;
        return (b.timestamp || 0) - (a.timestamp || 0);
    });
}

/**
 * Return 24h AI tool launches/updates focused feed.
 * Returns empty array if no fresh content - caller should handle this.
 */
export async function getTrendingNews() {
    const [productHunt, hackerNews, hackerAsk, githubSignals, githubTrending, githubFresh, communitySignals] = await Promise.all([
        fetchProductHuntFeed(20),
        fetchHackerNews(25),
        fetchHackerNewsAsk(10),
        fetchGitHubAITools(25),
        fetchGitHubTrending(20),
        fetchGitHubFreshRepos(20),
        fetchCommunityRssToolSignals(),
    ]);

    const now = Date.now() / 1000;
    const last24h = now - 86400;
    const last48h = now - 172800;

    const allItems = [
        ...productHunt,
        ...hackerNews,
        ...hackerAsk,
        ...githubSignals,
        ...githubTrending,
        ...githubFresh,
        ...communitySignals,
    ];

    const fresh24h = allItems
        .filter((item) => item.timestamp >= last24h)
        .filter((item) => isToolSignalTitle(item.title, item.source))
        .sort((a, b) => b.timestamp - a.timestamp);

    let combined = dedupeByTitleAndUrl(fresh24h);

    // Return strictly 24h news as requested
    if (combined.length > 0) {
        const prioritized = prioritizeSources(combined);
        const diversified = diversifyBySource(prioritized);
        return diversified.slice(0, 50);
    }

    return [];
}
