import fs from "fs/promises";
import path from "path";

const DATE_FILE_RE = /^\d{4}-\d{2}-\d{2}\.json$/;
const RUNS_FILE = "runs.json";
const RUN_RETENTION_MS = 24 * 60 * 60 * 1000;

const getCacheDir = () => {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
        return path.join("/tmp", ".ai-tweet-cache");
    }
    return path.join(process.cwd(), ".cache");
};

const CACHE_DIR = getCacheDir();
const STATS_FILE = "stats.json";

async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });
}

function normalizeTweet(tweet) {
    if (typeof tweet === "string") {
        return {
            text: tweet,
            sourceAge: "1h ago",
            posted: false,
            postedTo: [],
        };
    }

    return {
        text: tweet?.text || "",
        sourceAge: tweet?.sourceAge || "1h ago",
        posted: Boolean(tweet?.posted),
        postedTo: Array.isArray(tweet?.postedTo) ? tweet.postedTo : [],
    };
}

function normalizeTweets(tweets = []) {
    if (!Array.isArray(tweets)) return [];
    return tweets.map((tweet) => normalizeTweet(tweet));
}

function buildRunMeta(run) {
    const generatedAt = run.generatedAt || new Date().toISOString();
    return {
        id: run.id,
        date: run.date,
        generatedAt,
        count: Array.isArray(run.tweets) ? run.tweets.length : 0,
    };
}

function pruneRuns(runs = []) {
    const now = Date.now();
    return runs.filter((run) => {
        const stamp = new Date(run.generatedAt || 0).getTime();
        return Number.isFinite(stamp) && now - stamp <= RUN_RETENTION_MS;
    });
}

async function readRunsFile() {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, RUNS_FILE);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed?.runs)) return [];
        return pruneRuns(parsed.runs);
    } catch {
        return [];
    }
}

async function writeRunsFile(runs = []) {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, RUNS_FILE);
    const payload = {
        runs: pruneRuns(runs).slice(0, 40),
    };
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
}

export async function saveTweetRunSnapshot({ date, tweets, generatedAt }) {
    const runs = await readRunsFile();
    const normalizedTweets = normalizeTweets(tweets);
    const snapshot = {
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: date || getTodayDate(),
        generatedAt: generatedAt || new Date().toISOString(),
        tweets: normalizedTweets,
    };

    runs.unshift(snapshot);
    await writeRunsFile(runs);
    return snapshot;
}

export async function getTweetRunSnapshots() {
    const runs = await readRunsFile();
    runs.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    await writeRunsFile(runs);
    return runs.map((run) => buildRunMeta(run));
}

export async function getTweetRunSnapshotById(id) {
    if (!id) return null;
    const runs = await readRunsFile();
    const hit = runs.find((run) => run.id === id);
    if (!hit) return null;
    return {
        ...buildRunMeta(hit),
        tweets: normalizeTweets(hit.tweets),
    };
}

export async function getRecentRunTweets(hours = 24, limit = 180) {
    const cutoff = Date.now() - Math.max(1, hours) * 60 * 60 * 1000;
    const runs = await readRunsFile();
    const seen = new Set();
    const texts = [];

    for (const run of runs) {
        const stamp = new Date(run?.generatedAt || 0).getTime();
        if (!Number.isFinite(stamp) || stamp < cutoff) continue;

        const tweets = normalizeTweets(run?.tweets || []);
        for (const tweet of tweets) {
            const text = (tweet?.text || "").trim();
            if (!text) continue;
            const key = text.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            texts.push(text);
            if (texts.length >= limit) return texts;
        }
    }

    return texts;
}

export async function cacheTweets(tweets) {
    await ensureCacheDir();
    const today = getTodayDate();
    const generatedAt = new Date().toISOString();
    const initialized = normalizeTweets(tweets);

    const filePath = path.join(CACHE_DIR, `${today}.json`);
    await fs.writeFile(filePath, JSON.stringify(initialized, null, 2));
    await saveTweetRunSnapshot({
        date: today,
        tweets: initialized,
        generatedAt,
    });

    return { date: today, tweets: initialized, generatedAt };
}

export async function getCachedTweets(dateStr) {
    await ensureCacheDir();
    const targetDate = dateStr || getTodayDate();
    const filePath = path.join(CACHE_DIR, `${targetDate}.json`);

    try {
        const [data, stats] = await Promise.all([
            fs.readFile(filePath, "utf-8"),
            fs.stat(filePath),
        ]);
        const tweets = normalizeTweets(JSON.parse(data));
        return {
            date: targetDate,
            tweets,
            generatedAt: stats?.mtime ? stats.mtime.toISOString() : null,
        };
    } catch {
        return null;
    }
}

export async function getLastDaysTweets(days = 3) {
    await ensureCacheDir();
    try {
        const files = await fs.readdir(CACHE_DIR);
        const recentFiles = files
            .filter((file) => DATE_FILE_RE.test(file))
            .sort()
            .reverse()
            .slice(0, days);

        let allTweets = [];
        for (const file of recentFiles) {
            const data = await fs.readFile(path.join(CACHE_DIR, file), "utf-8");
            const tweets = normalizeTweets(JSON.parse(data));
            allTweets = allTweets.concat(tweets.map((tweet) => tweet.text).filter(Boolean));
        }

        return allTweets;
    } catch (error) {
        console.warn("Cache read error:", error);
        return [];
    }
}

export async function markTweeted(dateStr, index, platform = null) {
    await ensureCacheDir();
    if (!dateStr || typeof index !== "number") {
        return { ok: false, error: "Missing date or index" };
    }

    const filePath = path.join(CACHE_DIR, `${dateStr}.json`);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const tweets = normalizeTweets(JSON.parse(data));

        if (!tweets[index]) {
            return { ok: false, error: "Tweet index not found" };
        }

        // Ensure postedTo array exists
        if (!tweets[index].postedTo) {
            tweets[index].postedTo = [];
        }

        if (platform) {
            // Add platform to postedTo if not already there, and set posted to true
            if (!tweets[index].postedTo.includes(platform)) {
                tweets[index].postedTo.push(platform);
            }
            tweets[index].posted = true;
        } else {
            // Legacy toggle behavior (for manual mark button)
            tweets[index].posted = !tweets[index].posted;
            // Note: when toggling off, we might want to clear postedTo? But we won't.
        }

        await fs.writeFile(filePath, JSON.stringify(tweets, null, 2));
        return { ok: true, posted: tweets[index].posted, postedTo: tweets[index].postedTo };
    } catch (error) {
        console.error("Mark tweeted error:", error);
        return { ok: false, error: "Failed to update tweet status" };
    }
}

export async function getAvailableDates() {
    await ensureCacheDir();
    try {
        const files = await fs.readdir(CACHE_DIR);
        return files
            .filter((file) => DATE_FILE_RE.test(file))
            .map((file) => file.replace(".json", ""))
            .sort()
            .reverse();
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

        await Promise.all(
            files.map(async (file) => {
                if (!DATE_FILE_RE.test(file)) return;
                const filePath = path.join(CACHE_DIR, file);
                const stats = await fs.stat(filePath);
                const diffDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

                if (diffDays > keepDays) {
                    await fs.unlink(filePath);
                    deletedCount += 1;
                }
            })
        );

        const runs = await readRunsFile();
        await writeRunsFile(runs);

        return deletedCount;
    } catch (error) {
        console.warn("Cleanup error:", error);
        return 0;
    }
}

// ==================== Stats Tracking ====================

async function getStatsPath() {
    await ensureCacheDir();
    return path.join(CACHE_DIR, STATS_FILE);
}

async function readStatsFile() {
    try {
        const statsPath = await getStatsPath();
        const data = await fs.readFile(statsPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {
            totalPosts: 0,
            platformStats: { x: 0, instagram: 0, threads: 0 },
            dailyStats: {},
            lastReset: new Date().toISOString(),
        };
    }
}

async function writeStatsFile(stats) {
    await ensureCacheDir();
    const statsPath = await getStatsPath();
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
}

/**
 * Record a successful post to stats
 */
export async function recordPost(platform, tweetDate = null, tweetIndex = null) {
    try {
        const stats = await readStatsFile();

        // Update total
        stats.totalPosts += 1;

        // Update platform-specific
        if (stats.platformStats[platform]) {
            stats.platformStats[platform] += 1;
        } else {
            stats.platformStats[platform] = 1;
        }

        // Update daily
        const today = new Date().toISOString().split('T')[0];
        stats.dailyStats[today] = (stats.dailyStats[today] || 0) + 1;

        // Optionally track which tweet was posted
        if (tweetDate && typeof tweetIndex === 'number') {
            if (!stats.tweetHistory) stats.tweetHistory = [];
            stats.tweetHistory.push({
                platform,
                date: tweetDate,
                index: tweetIndex,
                timestamp: new Date().toISOString(),
            });
        }

        await writeStatsFile(stats);
        return stats;
    } catch (error) {
        console.error('Failed to record post:', error);
        return null;
    }
}

/**
 * Get posting statistics
 */
export async function getPostStats(days = 30) {
    try {
        const stats = await readStatsFile();

        // Calculate date range
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const cutoffDate = cutoff.toISOString().split('T')[0];

        // Filter daily stats by date range
        const filteredDailyStats = {};
        let recentTotal = 0;
        Object.entries(stats.dailyStats).forEach(([date, count]) => {
            if (date >= cutoffDate) {
                filteredDailyStats[date] = count;
                recentTotal += count;
            }
        });

        return {
            totalPosts: stats.totalPosts,
            platformStats: stats.platformStats,
            dailyStats: filteredDailyStats,
            recentPosts: recentTotal,
            lastReset: stats.lastReset,
        };
    } catch (error) {
        console.error('Failed to get stats:', error);
        return {
            totalPosts: 0,
            platformStats: { x: 0, instagram: 0, threads: 0 },
            dailyStats: {},
            recentPosts: 0,
        };
    }
}

/**
 * Reset statistics
 */
export async function resetStats() {
    const stats = {
        totalPosts: 0,
        platformStats: { x: 0, instagram: 0, threads: 0 },
        dailyStats: {},
        lastReset: new Date().toISOString(),
    };
    await writeStatsFile(stats);
    return stats;
}

/**
 * Get platform-specific success rate
 */
export async function getPlatformSuccessRate() {
    const stats = await readStatsFile();
    const total = stats.totalPosts || 1; // avoid division by zero

    return {
        x: {
            posts: stats.platformStats.x || 0,
            percentage: Math.round(((stats.platformStats.x || 0) / total) * 100),
        },
        instagram: {
            posts: stats.platformStats.instagram || 0,
            percentage: Math.round(((stats.platformStats.instagram || 0) / total) * 100),
        },
        threads: {
            posts: stats.platformStats.threads || 0,
            percentage: Math.round(((stats.platformStats.threads || 0) / total) * 100),
        },
    };
}
