/**
 * Multi-Platform Social Media Posting Library
 * Supports: X/Twitter (web intent), Threads (deep link)
 */

const PLATFORMS = {
  X: {
    id: 'x',
    name: 'X / Twitter',
    icon: 'x',
    color: '#1d9bf0',
    bgColor: '#000000',
    textColor: '#ffffff',
    supportedMethods: ['web_intent', 'copy'],
  },
  THREADS: {
    id: 'threads',
    name: 'Threads',
    icon: 'threads',
    color: '#ffffff',
    bgColor: '#000000',
    textColor: '#ffffff',
    supportedMethods: ['deep_link', 'share_sheet', 'copy'],
  },
  COPY: {
    id: 'copy',
    name: 'Copy',
    icon: 'copy',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    textColor: '#374151',
    supportedMethods: ['copy'],
  },
};

/**
 * Check if Threads sharing is available
 */
export function isThreadsAvailable() {
  // Threads deep link works if Threads app is installed
  return true;
}

/**
 * Get platform support status
 */
export function getPlatformSupport() {
  return {
    x: {
      configured: false, // API disabled, using web intents only
      available: true,
      methods: ['web_intent', 'copy'],
    },
    threads: {
      configured: false, // Threads API not implemented
      available: isThreadsAvailable(),
      methods: ['deep_link', 'share_sheet', 'copy'],
    },
  };
}

/**
 * Generate X Web Intent URL
 * Opens Twitter's web composer with pre-filled text
 */
export function buildXWebIntent(text) {
  const encoded = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encoded}`;
}

/**
 * Generate Threads share link
 * Threads supports sharing via its URL scheme
 */
export function buildThreadsShareLink(text) {
  const encoded = encodeURIComponent(text);
  // Threads URL scheme to open composer
  return `https://www.threads.net/intent/post?text=${encoded}`;
}

/**
 * Build a native deep link for any platform
 */
export function buildDeepLink(platform, text, options = {}) {
  switch (platform) {
    case 'x':
      return buildXWebIntent(text);
    case 'threads':
      return buildThreadsShareLink(text);
    default:
      return null;
  }
}

/**
 * Open native share sheet with pre-filled content
 * Works on mobile browsers and desktop
 */
export function openNativeShareSheet(text, platforms = ['x', 'threads']) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    return navigator.share({
      title: 'AI Generated Post',
      text: text,
      url: '', // Will be appended by user
    }).catch(err => {
      // User cancelled or share failed - fall back to platform-specific links
      console.log('Native share failed:', err);
      return false;
    });
  }

  // Fallback: open specific platform links
  return false;
}

/**
 * Build share URLs for all platforms
 */
export function buildAllShareLinks(text, options = {}) {
  return {
    x: {
      web_intent: buildXWebIntent(text),
      copy: text,
    },
    threads: {
      deep_link: buildThreadsShareLink(text),
      share_sheet: () => openNativeShareSheet(text, ['threads']),
      copy: text,
    },
  };
}

/**
 * Determine best posting method for a platform based on configuration
 * ALWAYS uses deep links/web intents - never API (user wants manual approval)
 */
export function getBestPostMethod(platform, platformSupport) {
  const support = platformSupport[platform];
  if (!support || !support.available) return null;

  // Never use API - always use user-initiated sharing
  if (support.methods.includes('deep_link')) {
    return 'deep_link';
  }

  if (support.methods.includes('web_intent')) {
    return 'web_intent';
  }

  if (support.methods.includes('share_sheet')) {
    return 'share_sheet';
  }

  return 'copy';
}

export { PLATFORMS };
