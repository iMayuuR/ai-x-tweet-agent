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

// Helper to get today's date in YYYY-MM-DD format (ISO)
// This ensures Date.parse works correctly in all browsers/Node
function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    }); // en-CA returns YYYY-MM-DD
}

export async function cacheTweets(tweets) {
    await ensureCacheDir();
    const today = getTodayDate();

    // Ensure tweets have 'posted' property initialized
    const initialized = tweets.map(t => ({ ...t, posted: false }));

    const filePath = path.join(CACHE_DIR, `${today}.json`);
    await fs.writeFile(filePath, JSON.stringify(initialized, null, 2));

    // Return object resembling the API response
    return { date: today, tweets: initialized };
}

export async function getCachedTweets(dateStr) {
    await ensureCacheDir();
    // Use provided date or today
    const targetDate = dateStr || getTodayDate();

    const filePath = path.join(CACHE_DIR, `${targetDate}.json`);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const tweets = JSON.parse(data);
        return { date: targetDate, tweets };
    } catch {
        return null;
    }
}

export async function getLastDaysTweets(days = 3) {
    await ensureCacheDir();
    try {
        const files = await fs.readdir(CACHE_DIR);
        // Sort files by name descending (YYYY-MM-DD is sortable)
        const recentFiles = files
            .filter(f => f.endsWith(".json"))
            .sort().reverse()
            .slice(0, days);

        let allTweets = [];
        for (const file of recentFiles) {
            const data = await fs.readFile(path.join(CACHE_DIR, file), "utf-8");
            const tweets = JSON.parse(data);
            if (Array.isArray(tweets)) {
                allTweets = allTweets.concat(tweets.map(t => (typeof t === 'string' ? t : t.text)));
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
            .sort().reverse(); // YYYY-MM-DD sorts reliably
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
