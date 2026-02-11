import { headers } from "next/headers";

/**
 * Calculate relative time string
 */
function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
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
        // Fetch 'Show HN' stories (focus on new tools)
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
                timestamp: item.time, // HN usage seconds
            }));
    } catch (e) {
        console.error("HN Error", e);
        return [];
    }
}

/**
 * Fetch top posts from a subreddit
 */
async function fetchSubreddit(subreddit, limit = 15) {
    try {
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${limit}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            next: { revalidate: 600 }, // Cache for 10 minutes
        });

        if (!response.ok) {
            console.error(`Failed to fetch r/${subreddit}: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data.data.children
            .filter(post => !post.data.stickied) // Ignore pinned posts
            .map((post) => ({
                title: post.data.title,
                url: `https://www.reddit.com${post.data.permalink}`,
                score: post.data.score,
                source: `r/${subreddit}`,
                timeAgo: getTimeAgo(post.data.created_utc),
                timestamp: post.data.created_utc,
            }));
    } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error);
        return [];
    }
}

/**
 * Fetch trending AI news from multiple sources
 */
export async function getTrendingNews() {
    const sources = ["LocalLLaMA", "OpenAI", "ArtificialIntelligence", "singularity"];

    // Fetch all sources in parallel
    const [redditResults, hnResults] = await Promise.all([
        Promise.all(sources.map(sub => fetchSubreddit(sub))),
        fetchHackerNews(15)
    ]);

    const allNews = [...redditResults.flat(), ...hnResults];
    const now = Date.now() / 1000; // seconds

    // Strict 24h Filter (86400 seconds)
    // Filter out posts older than 24 hours
    const freshNews = allNews.filter(n => (now - n.timestamp) < 86400);

    // Sort by score
    freshNews.sort((a, b) => b.score - a.score);

    // Deduplicate by title (simple fuzzy check or exact match)
    const uniqueNews = [];
    const seenTitles = new Set();

    for (const item of freshNews) {
        // Normalize title for deduplication
        const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueNews.push(item);
        }
    }

    // Return top 45 unique items (mix of Reddit + HN)
    return uniqueNews.slice(0, 45);
}
