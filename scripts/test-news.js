
// Standalone Test Script for News Fetching
// Run: node scripts/test-news.js

async function fetchSubreddit(subreddit, limit = 5) {
    try {
        const start = Date.now();
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${limit}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.3.0 Safari/537.36",
            },
        });
        const duration = Date.now() - start;

        if (!response.ok) {
            console.log(`❌ r/${subreddit}: Failed ${response.status} (${duration}ms)`);
            return [];
        }

        const data = await response.json();
        const items = data.data.children.length;
        console.log(`✅ r/${subreddit}: ${items} items (${duration}ms)`);
        if (items > 0) {
            console.log(`   Top: ${data.data.children[0].data.title}`);
        }
        return data.data.children;
    } catch (error) {
        console.log(`❌ r/${subreddit}: Error ${error.message}`);
        return [];
    }
}

async function fetchGoogleNewsRSS() {
    try {
        const start = Date.now();
        // Google News RSS: AI Tools, last 24h (when:1d)
        const url = "https://news.google.com/rss/search?q=AI+Tools+when:1d&hl=en-US&gl=US&ceid=US:en";
        const response = await fetch(url);
        const duration = Date.now() - start;

        if (!response.ok) {
            console.log(`❌ Google News: Failed ${response.status} (${duration}ms)`);
            return [];
        }

        const text = await response.text();
        // Simple Regex for items
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log(`✅ Google News: ${items.length} items (${duration}ms)`);

        if (items.length > 0) {
            const title = items[0].match(/<title>(.*?)<\/title>/)[1];
            const date = items[0].match(/<pubDate>(.*?)<\/pubDate>/)[1];
            console.log(`   Top: ${title} (${date})`);
        }
        return items;
    } catch (error) {
        console.log(`❌ Google News: Error ${error.message}`);
        return [];
    }
}

async function runTest() {
    console.log("=== START NEWS FETCH TEST ===\n");

    // Test Reddit
    await Promise.all([
        fetchSubreddit("LocalLLaMA"),
        fetchSubreddit("OpenAI"),
        // Test Google News
        fetchGoogleNewsRSS()
    ]);

    console.log("\n=== END TEST ===");
}

runTest();
