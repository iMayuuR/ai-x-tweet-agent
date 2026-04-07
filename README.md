# AI Social Agent - Multi-Platform Posting

## Prerequisites
- Node.js 18+
- Google Gemini API Key

## Installation

1. Clone and install:
```bash
npm install
```

2. Configure environment variables in `.env`:

### Environment variables:
```env
GEMINI_API_KEY=your_gemini_api_key
AUTH_PASSWORD=your_secret_password
```

3. Run development server:
```bash
npm run dev
```

## Features

- ✨ Generate 10 daily AI tool tweets using Gemini
- 🤖 Smart handle fallback for robust text
- 🐦 Share to X/Twitter (opens composer with pre-filled text)
- 🧵 Share to Threads (deep link)
- 📱 Perfect mobile responsive UI
- 📊 Posting statistics tracking
- 🕐 History browser & saved runs
- 🔄 Bulk operations (copy, share to platforms)
- 🎨 Platform-specific icons & styling

## Platform Support

| Platform | Method | Requirements |
|----------|--------|--------------|
| X/Twitter | Web Intent | Any browser |
| Threads | Deep Link | Threads app installed |
| Copy | Clipboard | None |

## API Endpoints

- `GET /api/daily` - Get today's tweets
- `POST /api/generate` - Generate new tweets
- `POST /api/post` - Post to platforms (supports multi-platform)
- `POST /api/mark` - Mark tweet as posted
- `GET /api/stats` - Get posting statistics
- `GET /api/config` - Get platform configuration status
- `POST /api/config` - Update platform credentials

## Mobile Experience

- Install as PWA on home screen
- Bottom navigation bar
- Touch-optimized (44px+ targets)
- Swipe gestures
- Pull to refresh
- Offline-capable

## License

MIT
