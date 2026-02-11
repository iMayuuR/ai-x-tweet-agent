
import { headers } from "next/headers";

/**
 * Calculate relative time string
 */
function getTimeAgo(timestamp) {
    const now = Date.now();
    const time = timestamp > 20000000000 ? timestamp : timestamp * 1000;
    const seconds = Math.floor((now - time) / 1000);

    let interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}

/**
 * Fetch top stories from Hacker News (Show HN — new tool launches)
 */
async function fetchHackerNews(limit = 15) {
    try {
        const topRes = await fetch("https://hacker-news.firebaseio.com/v0/showstories.json", {
            next: { revalidate: 600 }
        });
        const topIds = await topRes.json();
        const slice = topIds.slice(0, limit);

        const items = await Promise.all(slice.map(id =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                next: { revalidate: 3600 }
            }).then(r => r.json())
        ));

        return items
            .filter(item => item && !item.deleted && !item.dead)
            .map(item => ({
                title: item.title,
                url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
                score: item.score,
                source: "HackerNews",
                timeAgo: getTimeAgo(item.time),
                timestamp: item.time,
            }));
    } catch (e) {
        console.error("HN Error", e);
        return [];
    }
}

/**
 * Fetch Google News RSS — Focused on AI TOOL LAUNCHES & UPDATES
 */
async function fetchGoogleNews(query, label) {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:1d&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(url, { next: { revalidate: 3600 } });

        if (!response.ok) return [];

        const text = await response.text();
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

        return items.slice(0, 15).map(item => {
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
                timestamp: Math.floor(pubDate / 1000)
            };
        });

    } catch (error) {
        console.error(`Google News (${label}) Error:`, error);
        return [];
    }
}

/**
 * Fetch trending AI TOOL launches & updates from multiple focused queries
 */
export async function getTrendingNews() {
    // Multiple focused queries for AI TOOLS specifically (not generic news)
    const [toolLaunches, aiApps, aiUpdates, hnNews] = await Promise.all([
        fetchGoogleNews("new AI tool launched OR released", "AI Tool Launch"),
        fetchGoogleNews("AI app OR AI product OR AI startup", "AI App"),
        fetchGoogleNews("AI tool update OR AI feature OR ChatGPT OR Claude OR Gemini OR Midjourney", "AI Update"),
        fetchHackerNews(15)
    ]);

    const allNews = [...toolLaunches, ...aiApps, ...aiUpdates, ...hnNews];
    const now = Date.now() / 1000;

    // Strict 24h Filter
    const freshNews = allNews.filter(n => (now - n.timestamp) < 86400);

    // Sort by freshness
    freshNews.sort((a, b) => b.timestamp - a.timestamp);

    // Deduplicate
    const uniqueNews = [];
    const seenTitles = new Set();

    for (const item of freshNews) {
        const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueNews.push(item);
        }
    }

    return uniqueNews.slice(0, 50);
}
