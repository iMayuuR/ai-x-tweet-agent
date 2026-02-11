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
 * Fetch top posts from a subreddit
 */
async function fetchSubreddit(subreddit, limit = 15) {
    try {
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${limit}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AIXTweetAgent/1.0)",
            },
            next: { revalidate: 600 }, // Cache for 10 minutes
        });

        if (!response.ok) {
            console.error(`Failed to fetch r/${subreddit}: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data.data.children.map((post) => ({
            title: post.data.title,
            url: `https://www.reddit.com${post.data.permalink}`,
            score: post.data.score,
            source: `r/${subreddit}`,
            timeAgo: getTimeAgo(post.data.created_utc),
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
    const results = await Promise.all(sources.map(sub => fetchSubreddit(sub)));

    // Flatten and sort by score
    const allNews = results.flat().sort((a, b) => b.score - a.score);

    // Deduplicate by title (simple fuzzy check or exact match)
    const uniqueNews = [];
    const seenTitles = new Set();

    for (const item of allNews) {
        const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueNews.push(item);
        }
    }

    // Return top 15 items
    return uniqueNews.slice(0, 15);
}
