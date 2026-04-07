import { NextResponse } from "next/server";
import { getPostStats, resetStats, getPlatformSuccessRate } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats
 * Get posting statistics
 * Query params: ?days=30
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days")) || 30;

    const stats = await getPostStats(days);
    const successRates = await getPlatformSuccessRate();

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        successRates,
      },
    });
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stats
 * Reset statistics
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { confirm } = body;

    if (!confirm) {
      return NextResponse.json(
        { success: false, error: "Confirmation required" },
        { status: 400 }
      );
    }

    await resetStats();

    return NextResponse.json({
      success: true,
      message: "Statistics reset successfully",
    });
  } catch (error) {
    console.error("Failed to reset stats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
