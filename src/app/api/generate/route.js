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
export async function POST(request) {
    try {
        let avoidTweets = [];
        try {
            const body = await request.json();
            if (Array.isArray(body?.avoidTweets)) {
                avoidTweets = body.avoidTweets
                    .filter((item) => typeof item === "string")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 50);
            }
        } catch {
            // No body or invalid JSON - safe to ignore.
        }

        const tweets = await generateTweets({ avoidTweets });
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
