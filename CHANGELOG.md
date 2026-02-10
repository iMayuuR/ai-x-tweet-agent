# Changelog

All notable changes to the AI X Tweet Agent project will be documented in this file.

## [1.0.0] - 2026-02-11
### Major Features
- **Tweet History UI:** Added a dropdown in the header to view past days' tweets.
- **Improved Images:** Replaced random images with high-quality, deterministic Pollinations.ai (Flux model) generations.
- **Duplicate Prevention:** Added logic to check last 2 days' tweets and instruct AI to avoid repetition.

### Fixed
- **Date Display:** Fixed issue where date was showing as "yesterday" late at night by enforcing `Asia/Kolkata` timezone.
- **Image Stability:** Images now persist across page reloads (deterministic seeding based on tweet text).

### Changed
- **Logout Button:** Moved to top-right flex container for consistent positioning.

## [0.2.0] - 2026-02-10
### Added
- **PWA Support:** Added `manifest.json`, service worker, and installable app capabilities.
- **Authentication:** Added password protection with `AUTH_PASSWORD` env var.
- **Mark as Tweeted:** Added toggle button to track posted tweets.
- **Mobile UI:** Optimized for efficient mobile usage (larger tap targets, responsive layout).

## [0.1.0] - 2026-02-09
### Added
- **Core Functionality:** AI news generation using Gemini API.
- **Daily Reset:** Automatic daily content generation.
- **Tweet Cards:** Copy to clipboard, Tweet on X buttons.
- **Cron Job:** API route for scheduled updates.
