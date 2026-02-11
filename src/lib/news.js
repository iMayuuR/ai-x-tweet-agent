
import { headers } from "next/headers";

/**
 * Calculate relative time string
 */
function getTimeAgo(timestamp) {
    // timestamp is in seconds (Unix) or milliseconds (Date)
    // If timestamp > 20000000000, it's ms. Else seconds.
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
 * Fetch top stories from Hacker News (Show HN)
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
                timeAgo: getTimeAgo(item.time), // HN uses seconds
                timestamp: item.time,
            }));
    } catch (e) {
        console.error("HN Error", e);
        return [];
    }
}

/**
 * Fetch Google News RSS (AI Tools / Latest 24h)
 * Replaces Reddit (Blocked)
 */
async function fetchGoogleNews() {
    try {
        // "AI Tools" query, last 1 day (when:1d)
        const url = "https://news.google.com/rss/search?q=AI+Tools+when:1d&hl=en-US&gl=US&ceid=US:en";
        const response = await fetch(url, { next: { revalidate: 3600 } });

        if (!response.ok) return [];

        const text = await response.text();
        // Parse XML with Regex (Simple & Fast)
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

        return items.slice(0, 30).map(item => {
            const titleMatch = item.match(/<title>(.*?)<\/title>/);
            const linkMatch = item.match(/<link>(.*?)<\/link>/);
            const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

            const title = titleMatch ? titleMatch[1].replace(" - Google News", "") : "Unknown";
            const link = linkMatch ? linkMatch[1] : "#";
            const pubDate = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();

            return {
                title: title.replace("<![CDATA[", "").replace("]]>", ""),
                url: link,
                score: 100, // Boost Google News
                source: "Google News",
                timeAgo: getTimeAgo(pubDate),
                timestamp: Math.floor(pubDate / 1000)
            };
        });

    } catch (error) {
        console.error("Google News Error:", error);
        return [];
    }
}

/**
 * Fetch trending AI news from multiple sources
 */
export async function getTrendingNews() {
    // 1. Fetch Google News & HN in parallel
    const [googleNews, hnNews] = await Promise.all([
        fetchGoogleNews(),
        fetchHackerNews(15)
    ]);

    const allNews = [...googleNews, ...hnNews];
    const now = Date.now() / 1000; // seconds

    // Strict 24h Filter (86400 seconds)
    // Filter out posts older than 24 hours
    const freshNews = allNews.filter(n => (now - n.timestamp) < 86400);

    // Sort by timestamp (Freshness first) for Google News, Score for HN
    // We prioritize Google News as it's specifically "AI Tools"
    freshNews.sort((a, b) => b.timestamp - a.timestamp);

    // Deduplicate by title
    const uniqueNews = [];
    const seenTitles = new Set();

    for (const item of freshNews) {
        const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueNews.push(item);
        }
    }

    return uniqueNews.slice(0, 40);
}
