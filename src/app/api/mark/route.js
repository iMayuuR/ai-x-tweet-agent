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
        const { date } = body;
        const index = Number(body?.index);

        if (!date || !Number.isInteger(index) || index < 0) {
            return NextResponse.json(
                { error: "Missing date or index" },
                { status: 400 }
            );
        }

        const result = await markTweeted(date, index);
        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.error || "Failed to update tweet status" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            tweetedStatus: result.posted,
        });
    } catch (error) {
        console.error("Failed to mark tweet:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
