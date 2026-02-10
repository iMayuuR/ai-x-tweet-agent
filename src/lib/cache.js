import { promises as fs } from "fs";
import path from "path";

// In-memory cache
let memoryCache = {
    date: null,
    tweets: null,
    tweetedStatus: null,
    generatedAt: null,
};

const CACHE_DIR = path.join(process.cwd(), ".cache");
const AUTO_DELETE_DAYS = 3;

/**
 * Get today's date key string (YYYY-MM-DD) in IST
 */
function getTodayKey() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    }); // en-CA returns YYYY-MM-DD format
}

/**
 * Get cache file path for a specific date
 */
function getCacheFile(dateKey) {
    return path.join(CACHE_DIR, `tweets-${dateKey}.json`);
}

/**
 * Try to load tweets from filesystem cache for a specific date
 */
async function loadFromDisk(dateKey) {
    try {
        const raw = await fs.readFile(getCacheFile(dateKey), "utf-8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Save tweets to filesystem cache
 */
async function saveToDisk(data) {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(
            getCacheFile(data.date),
            JSON.stringify(data, null, 2),
            "utf-8"
        );
    } catch (err) {
        console.error("Failed to write cache to disk:", err.message);
    }
}

/**
 * Get cached daily tweets. Returns null if no valid cache exists for the date.
 * If dateKey is not provided, defaults to today.
 */
export async function getCachedTweets(dateKey) {
    const today = getTodayKey();
    const targetDate = dateKey || today;

    // Check memory cache first
    if (memoryCache.date === targetDate && memoryCache.tweets) {
        return {
            tweets: memoryCache.tweets,
            tweetedStatus: memoryCache.tweetedStatus,
            date: memoryCache.date,
            generatedAt: memoryCache.generatedAt,
        };
    }

    // Check disk cache
    const diskData = await loadFromDisk(targetDate);
    if (diskData && diskData.tweets) {
        // Only cache in memory if it's the requested date
        if (targetDate === today) {
            memoryCache = { ...diskData };
        }
        return {
            tweets: diskData.tweets,
            tweetedStatus: diskData.tweetedStatus || [],
            date: diskData.date,
            generatedAt: diskData.generatedAt,
        };
    }

    return null;
}

/**
 * Store tweets in cache (both memory and disk)
 */
export async function cacheTweets(tweets) {
    const data = {
        date: getTodayKey(),
        tweets,
        tweetedStatus: new Array(tweets.length).fill(false),
        generatedAt: new Date().toISOString(),
    };

    memoryCache = { ...data };
    await saveToDisk(data);
    return data;
}

/**
 * Mark a tweet as tweeted by index
 */
export async function markTweeted(dateKey, index) {
    const today = getTodayKey();

    // Load data
    let data;
    if (memoryCache.date === dateKey && memoryCache.tweets) {
        data = { ...memoryCache };
    } else {
        data = await loadFromDisk(dateKey);
    }

    if (!data || !data.tweets) {
        throw new Error("No tweets found for this date");
    }

    if (index < 0 || index >= data.tweets.length) {
        throw new Error("Invalid tweet index");
    }

    // Initialize tweetedStatus if missing
    if (!data.tweetedStatus) {
        data.tweetedStatus = new Array(data.tweets.length).fill(false);
    }

    // Toggle the status
    data.tweetedStatus[index] = !data.tweetedStatus[index];

    // Update caches
    if (dateKey === today) {
        memoryCache = { ...data };
    }
    await saveToDisk(data);

    return data.tweetedStatus;
}

/**
 * Cleanup tweet files older than AUTO_DELETE_DAYS days
 */
export async function cleanupOldTweets() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        const files = await fs.readdir(CACHE_DIR);
        const now = new Date();
        let deleted = 0;

        for (const file of files) {
            const match = file.match(/^tweets-(\d{4}-\d{2}-\d{2})\.json$/);
            if (!match) continue;

            const fileDate = new Date(match[1] + "T00:00:00");
            const diffDays = (now - fileDate) / (1000 * 60 * 60 * 24);

            if (diffDays > AUTO_DELETE_DAYS) {
                await fs.unlink(path.join(CACHE_DIR, file));
                deleted++;
                console.log(`[CLEANUP] Deleted old tweet file: ${file}`);
            }
        }

        return deleted;
    } catch (err) {
        console.error("Cleanup failed:", err.message);
        return 0;
    }
}

/**
 * Get tweets from the last N days (excluding today if needed) to avoid repetition
 */
export async function getLastDaysTweets(days = 3) {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        const files = await fs.readdir(CACHE_DIR);
        const todayElement = `tweets-${getTodayKey()}.json`;

        // Filter valid tweet files
        const tweetFiles = files
            .filter(f => /^tweets-\d{4}-\d{2}-\d{2}\.json$/.test(f))
            .sort() // detailed sort not needed as YYYY-MM-DD sorts alphabetically
            .reverse(); // Newest first

        const recentTweets = [];
        let count = 0;

        for (const file of tweetFiles) {
            if (count >= days) break;

            // Skip today's file if we want strictly previous context, 
            // but for "regenerate" we might want to include today's previous attempt if we want to avoid THAT too.
            // Let's include everything found.

            try {
                const raw = await fs.readFile(path.join(CACHE_DIR, file), "utf-8");
                const data = JSON.parse(raw);
                if (data.tweets && Array.isArray(data.tweets)) {
                    data.tweets.forEach(t => {
                        const text = typeof t === "string" ? t : t.text;
                        recentTweets.push(text);
                    });
                }
                count++;
            } catch (err) {
                console.error(`Failed to read previous tweets from ${file}:`, err.message);
            }
        }

        return recentTweets;
    } catch (err) {
        console.error("Failed to get last days tweets:", err.message);
        return [];
    }
}

/**
 * Get list of all available dates in cache
 */
export async function getAvailableDates() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        const files = await fs.readdir(CACHE_DIR);
        return files
            .filter(f => /^tweets-\d{4}-\d{2}-\d{2}\.json$/.test(f))
            .map(f => f.replace("tweets-", "").replace(".json", ""))
            .sort()
            .reverse();
    } catch {
        return [];
    }
}
