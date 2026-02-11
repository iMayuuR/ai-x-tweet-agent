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

function parseRssItems(rssText) {
    return rssText.match(/<item>[\s\S]*?<\/item>/g) || [];
}

function parseRssField(item, tag) {
    const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return match ? match[1] : "";
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

/**
 * Return 24h AI tool launches/updates focused feed.
 */
export async function getTrendingNews() {
    const [productHunt, hackerNews, githubSignals] = await Promise.all([
        fetchProductHuntFeed(24),
        fetchHackerNews(22),
        fetchGitHubAITools(24),
    ]);

    const now = Date.now() / 1000;
    const primary = [...productHunt, ...hackerNews, ...githubSignals]
        .filter((item) => now - item.timestamp <= 86400)
        .filter((item) => isToolSignalTitle(item.title))
        .sort((a, b) => b.timestamp - a.timestamp);

    let combined = dedupeByTitleAndUrl(primary);

    if (combined.length < 18) {
        const googleFallback = await fetchGoogleNewsFallback(24);
        const fallbackFresh = googleFallback
            .filter((item) => now - item.timestamp <= 86400)
            .filter((item) => isToolSignalTitle(item.title));

        combined = dedupeByTitleAndUrl([...combined, ...fallbackFresh]).sort(
            (a, b) => b.timestamp - a.timestamp
        );
    }

    if (combined.length > 0) {
        return combined.slice(0, 50);
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
