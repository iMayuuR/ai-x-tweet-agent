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
    "ai",
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
];

const COMMUNITY_RSS_SOURCES = [
    { source: "Medium-AITools", url: "https://medium.com/feed/tag/ai-tools", limit: 14 },
    { source: "Medium-GenAI", url: "https://medium.com/feed/tag/generative-ai", limit: 14 },
    { source: "Devto-AI", url: "https://dev.to/feed/tag/ai", limit: 14 },
    { source: "Reddit-ChatGPT", url: "https://www.reddit.com/r/ChatGPT/.rss", limit: 18 },
    { source: "Reddit-AI", url: "https://www.reddit.com/r/ArtificialInteligence/.rss", limit: 18 },
    { source: "TechCrunch-AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/", limit: 12 },
    { source: "TheVerge-AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", limit: 12 },
    { source: "TowardsDataScience", url: "https://towardsdatascience.com/feed", limit: 12 },
    { source: "AnalyticsVidhya", url: "https://www.analyticsvidhya.com/blog/feed/", limit: 12 },
];

function isToolSignalTitle(title) {
    const normalized = (title || "").toLowerCase();
    if (!normalized) return false;

    if (NEWSY_EXCLUSION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return false;
    }

    const hasToolKeyword = TOOL_SIGNAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasActivityKeyword = TOOL_ACTIVITY_KEYWORDS.some((keyword) => normalized.includes(keyword));

    return hasToolKeyword || hasActivityKeyword;
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
async function fetchHackerNews(limit = 20) {
    try {
        const topRes = await fetch("https://hacker-news.firebaseio.com/v0/showstories.json", {
            next: { revalidate: 600 },
        });
        const topIds = await topRes.json();
        const slice = topIds.slice(0, limit);

        const items = await Promise.all(
            slice.map((id) =>
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                    next: { revalidate: 3600 },
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
 * Fetch newly pushed AI repositories in last 24h from GitHub.
 */
async function fetchGitHubAITools(limit = 20) {
    try {
        const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        const query = encodeURIComponent(`topic:ai pushed:>=${sinceDate}`);
        const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=${limit}`;

        const response = await fetch(url, {
            next: { revalidate: 1800 },
            headers: {
                "User-Agent": "ai-x-tweet-agent/1.0",
                Accept: "application/vnd.github+json",
            },
        });

        if (!response.ok) return [];
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        return items.map((repo) => {
            const updatedAt = new Date(repo.updated_at).getTime();
            const description = repo.description ? ` - ${repo.description}` : "";

            return {
                title: `${repo.full_name}${description}`.trim(),
                url: repo.html_url,
                source: "GitHub",
                timeAgo: getTimeAgo(updatedAt),
                timestamp: Math.floor(updatedAt / 1000),
            };
        });
    } catch (error) {
        console.error("GitHub AI tools fetch error:", error);
        return [];
    }
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
        HackerNews: 8,
        ProductHunt: 10,
        "TechCrunch-AI": 6,
        "TheVerge-AI": 6,
        "Devto-AI": 8,
        "Medium-AITools": 7,
        "Medium-GenAI": 7,
        "Reddit-AI": 7,
        "Reddit-ChatGPT": 7,
        TowardsDataScience: 6,
        AnalyticsVidhya: 6,
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

/**
 * Return 24h AI tool launches/updates focused feed.
 */
export async function getTrendingNews() {
    const [productHunt, hackerNews, githubSignals, communitySignals] = await Promise.all([
        fetchProductHuntFeed(24),
        fetchHackerNews(22),
        fetchGitHubAITools(24),
        fetchCommunityRssToolSignals(),
    ]);

    const now = Date.now() / 1000;
    const primary = [...productHunt, ...hackerNews, ...githubSignals, ...communitySignals]
        .filter((item) => now - item.timestamp <= 86400)
        .filter((item) => isToolSignalTitle(item.title))
        .sort((a, b) => b.timestamp - a.timestamp);

    let combined = dedupeByTitleAndUrl(primary);

    if (combined.length < 26) {
        const googleFallback = await fetchGoogleNewsFallback(24);
        const fallbackFresh = googleFallback
            .filter((item) => now - item.timestamp <= 86400)
            .filter((item) => isToolSignalTitle(item.title));

        combined = dedupeByTitleAndUrl([...combined, ...fallbackFresh]).sort(
            (a, b) => b.timestamp - a.timestamp
        );
    }

    if (combined.length > 0) {
        const diversified = diversifyBySource(combined);
        return diversified.slice(0, 50);
    }

    return [
        {
            title: "Cursor AI coding assistant update",
            url: "https://cursor.com",
            source: "Fallback",
            timeAgo: "fresh",
            timestamp: Math.floor(Date.now() / 1000),
        },
        {
            title: "Perplexity research workflow update",
            url: "https://perplexity.ai",
            source: "Fallback",
            timeAgo: "fresh",
            timestamp: Math.floor(Date.now() / 1000),
        },
    ];
}
