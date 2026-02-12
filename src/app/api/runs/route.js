import { NextResponse } from "next/server";
import { getTweetRunSnapshotById, getTweetRunSnapshots } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/runs
 * - ?list=true: list 24h saved runs metadata
 * - ?id=run_xxx: get specific saved run with tweets
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get("list");
    const id = searchParams.get("id");

    try {
        if (id) {
            const run = await getTweetRunSnapshotById(id);
            if (!run) {
                return NextResponse.json(
                    { success: false, error: "Saved run not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: run,
            });
        }

        if (list) {
            const runs = await getTweetRunSnapshots();
            return NextResponse.json({
                success: true,
                data: runs,
            });
        }

        return NextResponse.json(
            { success: false, error: "Missing query parameter: list or id" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Failed to fetch saved runs:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch saved runs" },
            { status: 500 }
        );
    }
}
