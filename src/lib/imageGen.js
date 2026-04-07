/**
 * Image Generation using Pollinations.ai
 * Free, no API key required, HD quality images
 */

// Pollinations.ai base URL
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

// Rate limiting: 1 request per 200ms minimum (faster)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200;

/**
 * Extract tool/topic name from tweet text for image prompt
 */
export function extractToolName(tweetText) {
    if (!tweetText) return 'AI tool screenshot';

    // Remove prefixes like "INSIGHT:", "SPOTLIGHT:", etc.
    let cleaned = tweetText.replace(/^[A-Z][A-Z0-9]{2,16}:\s*/i, '');

    // Extract first meaningful phrase
    const words = cleaned.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 3) {
        return words.slice(0, 3).join(' ');
    }

    // Fallback: use first 2 words or hashtags
    const hashtags = cleaned.match(/#[a-z0-9_]+/gi);
    if (hashtags && hashtags.length > 0) {
        return hashtags[0].replace('#', '');
    }

    return words[0] || 'AI tool';
}

/**
 * Build professional image prompt from tweet
 */
export function buildImagePrompt(tweetText, toolName = null) {
    const name = toolName || extractToolName(tweetText);

    // Determine category from text
    const lowerText = tweetText.toLowerCase();
    let category = 'technology';
    let style = 'screenshot';

    if (lowerText.includes('video') || lowerText.includes('edit')) {
        category = 'video editing software';
        style = 'dark theme video editor';
    } else if (lowerText.includes('music') || lowerText.includes('audio') || lowerText.includes('sound')) {
        category = 'music production software';
        style = 'DAW interface';
    } else if (lowerText.includes('code') || lowerText.includes('developer') || lowerText.includes('ide')) {
        category = 'developer tool';
        style = 'code editor dark theme';
    } else if (lowerText.includes('design') || lowerText.includes('ui') || lowerText.includes('ux')) {
        category = 'design tool';
        style = 'modern UI canvas';
    } else if (lowerText.includes('writing') || lowerText.includes('content')) {
        category = 'writing assistant';
        style = 'text editor interface';
    } else if (lowerText.includes('research') || lowerText.includes('data')) {
        category = 'analytics dashboard';
        style = 'data visualization';
    } else if (lowerText.includes('image') || lowerText.includes('photo')) {
        category = 'AI image generator';
        style = 'image generation UI';
    }

    // Build concise, effective prompts (shorter = faster generation)
    const prompts = [
        `${name} ${style}, high quality screenshot`,
        `${category}: ${name} on screen, clean UI`,
        `Professional ${style} of ${name}, HD`,
        `${name} interface, modern design`,
    ];

    // Select based on entropy for variety
    const entropy = Date.now() % prompts.length;
    return prompts[entropy];
}

/**
 * Generate HD image URL using Pollinations.ai
 * Options: width, height, seed, nologo, model
 */
export function generateImageUrl(prompt, options = {}) {
    const {
        width = 1280,
        height = 720,
        seed = Math.floor(Math.random() * 1000000),
        nologo = true,
        model = 'flux',
    } = options;

    // Encode prompt
    const encodedPrompt = encodeURIComponent(prompt);

    // Build URL
    const url = `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=${nologo}&model=${model}`;

    return url;
}

/**
 * Wrap generation with rate limiting
 */
export async function generateImageForTweet(tweetText, options = {}) {
    // Rate limit
    const now = Date.now();
    const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
    if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();

    try {
        // Build prompt
        const toolName = options.toolName || extractToolName(tweetText);
        const prompt = buildImagePrompt(tweetText, toolName);

        // Generate URL (Pollinations is synchronous URL generation, no fetch needed)
        const imageUrl = generateImageUrl(prompt, {
            width: options.width || 1920,
            height: options.height || 1080,
            seed: options.seed || Math.floor(Math.random() * 1000000),
        });

        return {
            success: true,
            imageUrl,
            prompt,
            toolName,
        };
    } catch (error) {
        console.error('Image generation failed:', error);
        return {
            success: false,
            error: error.message,
            imageUrl: null,
        };
    }
}

/**
 * Generate images for multiple tweets with staggered timing
 * Includes retry logic with fallback to smaller size if primary fails
 */
export async function generateImagesForTweets(tweets, delayMs = 500) {
    const results = [];

    for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];
        const tweetText = typeof tweet === 'string' ? tweet : tweet.text;

        let result = await generateImageForTweet(tweetText);

        // Retry logic: if failed, try 2 more times with different seeds and smaller size
        if (!result.success) {
            console.warn(`Image generation failed for tweet ${i + 1}, retrying...`);
            let retrySeed = Date.now();
            for (let attempt = 1; attempt <= 2; attempt++) {
                retrySeed += attempt * 1000;
                result = await generateImageForTweet(tweetText, {
                    width: 1280,  // Fallback smaller size
                    height: 720,
                    seed: retrySeed,
                });
                if (result.success) {
                    console.log(`Image generation succeeded on retry ${attempt} for tweet ${i + 1}`);
                    break;
                }
            }
        }

        results.push({
            index: i,
            ...result,
        });

        // Add delay between requests to avoid rate limiting
        if (i < tweets.length - 1 && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}

/**
 * Validate image URL (quick check if reachable)
 */
export async function validateImageUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}
