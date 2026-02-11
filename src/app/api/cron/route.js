import { NextResponse } from "next/server";
import { generateTweets } from "@/lib/gemini";
import { cacheTweets, cleanupOldTweets } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron
 * Vercel Cron endpoint — called daily at 6:00 AM UTC.
 * Generates fresh tweets and cleans up old cache files (>3 days).
 */
export async function GET(request) {
    try {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Cleanup old tweet files
        const deleted = await cleanupOldTweets();
        console.log(`[CRON] Cleaned up ${deleted} old tweet file(s)`);

        // Generate fresh tweets
        const tweets = await generateTweets();
        const cached = await cacheTweets(tweets);

        console.log(`[CRON] Generated ${tweets.length} tweets for ${cached.date}`);

        return NextResponse.json({
            success: true,
            data: cached,
            cleaned: deleted,
        });
    } catch (error) {
        console.error("[CRON] Failed:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Cron job failed" },
            { status: 500 }
        );
    }
}
