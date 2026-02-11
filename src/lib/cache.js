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

    // Add date property to the cache file itself if needed, or just filename
    // We store array of tweets.
    // Let's ensure tweets have 'posted' property initialized if not present
    const initialized = tweets.map(t => ({ ...t, posted: false }));

    const filePath = path.join(CACHE_DIR, `${today}.json`);
    await fs.writeFile(filePath, JSON.stringify(initialized, null, 2));
    return { date: today, tweets: initialized };
}

export async function getCachedTweets(dateStr) {
    await ensureCacheDir();
    // Use provided date or today
    const targetDate = dateStr || new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata"
    }).replace(/\//g, "-");

    const filePath = path.join(CACHE_DIR, `${targetDate}.json`);
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
        const fileStats = await Promise.all(
            files
                .filter(f => f.endsWith(".json"))
                .map(async (file) => {
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
            if (Array.isArray(tweets)) {
                allTweets = allTweets.concat(tweets.map(t => t.text));
            }
        }
        return allTweets;
    } catch (error) {
        console.warn("Cache read error:", error);
        return [];
    }
}

export async function markTweeted(dateStr, index) {
    await ensureCacheDir();
    // If no date provided, use today? API guarantees date usually.
    if (!dateStr) return false;

    const filePath = path.join(CACHE_DIR, `${dateStr}.json`);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const tweets = JSON.parse(data);

        if (tweets[index]) {
            tweets[index].posted = !tweets[index].posted; // Toggle status
            await fs.writeFile(filePath, JSON.stringify(tweets, null, 2));
            return tweets[index].posted;
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
                return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
            });
    } catch {
        return [];
    }
}

export async function cleanupOldTweets(keepDays = 30) {
    await ensureCacheDir();
    try {
        const files = await fs.readdir(CACHE_DIR);
        const now = Date.now();
        let deletedCount = 0;

        await Promise.all(files.map(async (file) => {
            if (!file.endsWith(".json")) return;
            const filePath = path.join(CACHE_DIR, file);
            const stats = await fs.stat(filePath);
            const diffDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

            if (diffDays > keepDays) {
                await fs.unlink(filePath);
                deletedCount++;
            }
        }));
        return deletedCount;
    } catch (error) {
        console.warn("Cleanup error:", error);
        return 0;
    }
}
