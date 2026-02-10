# AI X Tweet Agent 🤖

**Version 1.0.0** 🚀

A powerful, automated AI agent that generates daily technical AI news tweets, styled like viral tech influencers. Built with Next.js, Google Gemini, and Pollinations.ai.

## ✨ Features

- **Daily Automation:** Generates 10 fresh, high-quality tweets every day.
- **Smart Content:** Uses Google Gemini with a specialized "Tech Influencer" persona.
- **No Duplicates:** Checks history (last 2 days) to avoid repeating topics.
- **High-Quality Images:** Auto-generates matching visuals using Pollinations.ai (Flux model).
- **History Browser:** View past generated tweets via a dropdown.
- **PWA Support:** Installable on mobile/desktop with offline capabilities.
- **Secure:** Password-protected access.
- **Tweet Management:** Copy to clipboard, Mark as Tweeted, and Tweet directly to X.
- **IST Timezone:** Optimized for Indian Standard Time users.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd ai-x-tweet-agent
   npm install
   ```

2. Configure Environment:
   Create a `.env` file in the root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-1.5-flash
   AUTH_PASSWORD=your_secret_password
   ```

3. Run Development Server:
   ```bash
   npm run dev
   ```
   Access at `http://localhost:3000`.

## 📱 PWA Installation

- **Mobile:** Open in Chrome/Safari -> "Add to Home Screen".
- **Desktop:** Click the install icon in the address bar.

## 🛠️ API Endpoints

- `GET /api/daily`: Get today's tweets.
- `GET /api/daily?list=true`: List available history dates.
- `GET /api/daily?date=YYYY-MM-DD`: Get specific date's tweets.
- `POST /api/generate`: Force generate new tweets (protected).
- `POST /api/mark`: Mark a tweet as posted.
- `GET /api/cron`: Scheduled trigger (for Vercel Cron).

## 📄 License

MIT
