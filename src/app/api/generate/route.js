import { NextResponse } from "next/server";
import { generateTweets } from "@/lib/gemini";
import { cacheTweets } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Extend Vercel timeout for Gemini 2.5 Flash thinking model

/**
 * POST /api/generate
 * Generates fresh tweets and caches them.
 * Protected by auth middleware (cookie) for frontend calls.
 */
export async function POST() {
    try {
        const tweets = await generateTweets();
        const cached = await cacheTweets(tweets);

        return NextResponse.json({
            success: true,
            data: cached,
        });
    } catch (error) {
        console.error("Tweet generation failed:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to generate tweets",
            },
            { status: 500 }
        );
    }
}
