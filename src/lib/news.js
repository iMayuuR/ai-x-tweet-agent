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

/**
 * Fetch top stories from Hacker News (Show HN style tool launches).
 */
async function fetchHackerNews(limit = 15) {
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
                score: item.score,
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
 * Fetch Google News RSS focused on AI tools.
 */
async function fetchGoogleNews(query, label) {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:1d&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(url, { next: { revalidate: 3600 } });

        if (!response.ok) return [];

        const text = await response.text();
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

        return items.slice(0, 15).map((item) => {
            const titleMatch = item.match(/<title>(.*?)<\/title>/);
            const linkMatch = item.match(/<link>(.*?)<\/link>/);
            const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

            const title = titleMatch ? titleMatch[1].replace(" - Google News", "") : "Unknown";
            const link = linkMatch ? linkMatch[1] : "#";
            const pubDate = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();

            return {
                title: title.replace("<![CDATA[", "").replace("]]>", ""),
                url: link,
                score: 100,
                source: label,
                timeAgo: getTimeAgo(pubDate),
                timestamp: Math.floor(pubDate / 1000),
            };
        });
    } catch (error) {
        console.error(`Google News (${label}) fetch error:`, error);
        return [];
    }
}

/**
 * Fetch trending AI tool launches and updates from focused sources.
 */
export async function getTrendingNews() {
    const [toolLaunches, aiApps, aiUpdates, hnNews] = await Promise.all([
        fetchGoogleNews("new AI tool launched OR released OR open source", "AI Tool Launch"),
        fetchGoogleNews("AI app OR AI product OR AI agent OR AI copilot", "AI App"),
        fetchGoogleNews("AI tool update OR AI feature OR ChatGPT update OR Claude update OR Gemini update OR Cursor update OR Perplexity update", "AI Update"),
        fetchHackerNews(15),
    ]);

    const allNews = [...toolLaunches, ...aiApps, ...aiUpdates, ...hnNews];
    const now = Date.now() / 1000;

    const freshNews = allNews.filter((item) => now - item.timestamp < 86400);
    freshNews.sort((a, b) => b.timestamp - a.timestamp);

    const uniqueNews = [];
    const seenTitles = new Set();

    for (const item of freshNews) {
        const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueNews.push(item);
        }
    }

    const toolSignals = uniqueNews.filter((item) => isToolSignalTitle(item.title));
    if (toolSignals.length > 0) {
        return toolSignals.slice(0, 50);
    }

    // Fallback if filters are too strict on quiet days.
    return uniqueNews.slice(0, 50);
}
