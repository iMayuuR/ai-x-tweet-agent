import { NextResponse } from "next/server";
import { buildDeepLink, getPlatformSupport, getBestPostMethod } from "@/lib/platforms";

export const dynamic = "force-dynamic";

/**
 * POST /api/post
 * Post a tweet to one or more platforms
 * Body: {
 *   text: string,
 *   platforms: ['x', 'instagram', 'threads'][],
 *   date: "YYYY-MM-DD" (optional, for marking as posted),
 *   index: number (optional, for marking as posted)
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { text, platforms = ['x'], date, index, options = {} } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid text' },
        { status: 400 }
      );
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid platforms array' },
        { status: 400 }
      );
    }

    // Limit platforms to valid ones
    const validPlatforms = ['x', 'threads'];
    const selectedPlatforms = platforms.filter(p => validPlatforms.includes(p));
    if (selectedPlatforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid platforms selected' },
        { status: 400 }
      );
    }

    const support = getPlatformSupport();
    const results = {};
    const errors = [];

    // Try to post to each platform
    for (const platform of selectedPlatforms) {
      try {
        const platformSupport = support[platform];
        if (!platformSupport.available) {
          results[platform] = { success: false, error: 'Platform not available' };
          errors.push(`${platform}: not available`);
          continue;
        }

        // Get best method for this platform based on configuration
        const method = getBestPostMethod(platform, support);
        let result;

        if (method === 'deep_link' || method === 'web_intent') {
          // Open platform with pre-filled text
          const url = buildDeepLink(platform, text, options);
          result = { success: true, method, url };
        } else {
          // Fallback: return the text for manual copy
          result = { success: true, method: 'copy', text };
        }

        results[platform] = result;
      } catch (err) {
        console.error(`Failed to post to ${platform}:`, err);
        results[platform] = { success: false, error: err.message };
        errors.push(`${platform}: ${err.message}`);
      }
    }

    // If date and index provided, mark as posted for this platform
    if (date && typeof index === 'number') {
      // Only mark as posted for successful platform posts
      const successfulPlatforms = selectedPlatforms.filter(p => results[p]?.success);
      const baseUrl = request.nextUrl.origin;
      for (const platform of successfulPlatforms) {
        try {
          await fetch(`${baseUrl}/api/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, index, platform }),
          });
        } catch (markErr) {
          console.error(`Failed to mark tweet as posted to ${platform}:`, markErr);
        }
      }
    }

    const allSuccessful = selectedPlatforms.every(p => results[p]?.success);
    const someSuccessful = selectedPlatforms.some(p => results[p]?.success);

    return NextResponse.json({
      success: allSuccessful,
      partial: someSuccessful && !allSuccessful,
      results,
      errors,
      timestamp: new Date().toISOString(),
    }, {
      status: allSuccessful ? 200 : (someSuccessful ? 207 : 400),
    });

  } catch (error) {
    console.error('Post failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to post' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/post
 * Check platform configuration status
 */
export async function GET() {
  const support = getPlatformSupport();

  return NextResponse.json({
    platforms: support,
    configured: {
      x: support.x.configured,
      instagram: support.instagram.configured,
      threads: support.threads.configured,
    },
    available: {
      x: support.x.available,
      instagram: support.instagram.available,
      threads: support.threads.available,
    },
  });
}
