import fs from "fs/promises";
import path from "path";

// Function to determine cache directory
// On Vercel (Production), use /tmp (ephemeral but writeable)
// On Local (Development), use project root .cache (persistent)
const getCacheDir = () => {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
        return path.join("/tmp", ".ai-tweet-cache");
    }
    return path.join(process.cwd(), ".cache");
};

const CACHE_DIR = getCacheDir();

async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

export async function cacheTweets(tweets) {
    await ensureCacheDir();
    const today = new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata"
    }).replace(/\//g, "-");

    const filePath = path.join(CACHE_DIR, `${today}.json`);
    await fs.writeFile(filePath, JSON.stringify(tweets, null, 2));
    return tweets;
}

export async function getCachedTweets() {
    await ensureCacheDir();
    const today = new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata"
    }).replace(/\//g, "-");

    const filePath = path.join(CACHE_DIR, `${today}.json`);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export async function getLastDaysTweets(days = 3) {
    await ensureCacheDir();
    try {
        const files = await fs.readdir(CACHE_DIR);
        // Sort files by date (descending) based on mtime
        const fileStats = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(CACHE_DIR, file);
                const stats = await fs.stat(filePath);
                return { file, mtime: stats.mtime };
            })
        );

        fileStats.sort((a, b) => b.mtime - a.mtime);
        const recentFiles = fileStats.slice(0, days);

        let allTweets = [];
        for (const { file } of recentFiles) {
            const data = await fs.readFile(path.join(CACHE_DIR, file), "utf-8");
            const tweets = JSON.parse(data);
            allTweets = allTweets.concat(tweets.map(t => t.text));
        }
        return allTweets;
    } catch (error) {
        console.warn("Cache read error:", error);
        return [];
    }
}

export async function markTweeted(tweetText) {
    await ensureCacheDir();
    const today = new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata"
    }).replace(/\//g, "-");

    const filePath = path.join(CACHE_DIR, `${today}.json`);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const tweets = JSON.parse(data);

        let found = false;
        const updatedTweets = tweets.map(t => {
            if (t.text === tweetText) {
                found = true;
                return { ...t, posted: true };
            }
            return t;
        });

        if (found) {
            await fs.writeFile(filePath, JSON.stringify(updatedTweets, null, 2));
            return true;
        }
        return false;
    } catch (error) {
        console.error("Mark tweeted error:", error);
        return false;
    }
}

export async function getAvailableDates() {
    await ensureCacheDir();
    try {
        const files = await fs.readdir(CACHE_DIR);
        return files
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""))
            .sort((a, b) => {
                const [d1, m1, y1] = a.split("-").map(Number);
                const [d2, m2, y2] = b.split("-").map(Number);
                // Compare by Date object (descending)
                return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
            });
    } catch {
        return [];
    }
}
