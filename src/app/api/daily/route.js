import { NextResponse } from "next/server";
import { getCachedTweets, getAvailableDates } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/daily
 * - ?list=true: Returns list of available dates
 * - ?date=YYYY-MM-DD: Returns tweets for specific date
 * - Default: Returns today's cached tweets
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const list = searchParams.get("list");

    try {
        if (list) {
            const dates = await getAvailableDates();
            return NextResponse.json({ success: true, dates });
        }

        const cached = await getCachedTweets(date);

        if (cached) {
            return NextResponse.json({
                success: true,
                data: cached,
                source: date ? "history" : "cache",
            });
        }

        // No cache — return empty (user must click Generate)
        return NextResponse.json({
            success: true,
            data: null,
            source: "empty",
        });
    } catch (error) {
        console.error("Failed to get daily tweets:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to get daily tweets",
            },
            { status: 500 }
        );
    }
}
