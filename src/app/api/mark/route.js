import { NextResponse } from "next/server";
import { markTweeted } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/mark
 * Marks/unmarks a tweet as tweeted.
 * Body: { date: "YYYY-MM-DD", index: 0 }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { date, index } = body;

        if (!date || typeof index !== "number") {
            return NextResponse.json(
                { error: "Missing date or index" },
                { status: 400 }
            );
        }

        const tweetedStatus = await markTweeted(date, index);

        return NextResponse.json({
            success: true,
            tweetedStatus,
        });
    } catch (error) {
        console.error("Failed to mark tweet:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
