import { NextResponse } from "next/server";
import { getPlatformSupport } from "@/lib/platforms";

export const dynamic = "force-dynamic";

/**
 * GET /api/config
 * Get platform configuration status (safe - no secrets exposed)
 */
export async function GET() {
  const support = getPlatformSupport();

  // Mask actual values - only show if set or not
  const twitterConfigured = support.x.configured;
  const threadsConfigured = support.threads.configured;

  return NextResponse.json({
    success: true,
    config: {
      platforms: {
        x: {
          configured: twitterConfigured,
          available: true,
          methods: ['web_intent', 'copy'],
          displayName: 'X / Twitter',
        },
        threads: {
          configured: threadsConfigured,
          available: true,
          methods: ['deep_link', 'copy'],
          displayName: 'Threads',
        },
      },
    },
  });
}

/**
 * POST /api/config
 * Update platform credentials (Note: in production, use Vercel env vars)
 * This endpoint is informational - actual config should be via environment variables
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, credentials } = body;

    // In a production app, you'd validate and store these securely
    // For local dev, we just return a message to set via .env
    return NextResponse.json({
      success: false,
      message: "Configuration via API is not supported. Please set environment variables directly in .env file.",
      instructions: [
        "Set GEMINI_API_KEY in .env for AI generation",
        "Restart the server after changing .env",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
