import { getLastDaysTweets, getRecentRunTweets } from "./cache";
import { getTrendingNews } from "./news";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash"; // Deployed

const TARGET_TWEETS = 10;
const MAX_TWEET_LENGTH = 268;
const MAX_RAW_TWEET_LENGTH = 420;
const X_MAX_TWEET_LENGTH = 280;
const X_URL_LENGTH = 23;
const TARGET_X_MIN = 260;
const TARGET_X_MAX = 268;
const MIN_BODY_CORE_LENGTH = 210;
const TARGET_BODY_CORE_LENGTH = 235;
const MIN_HASHTAGS = 1;
const MAX_HASHTAGS = 2;
const MAX_MODEL_ATTEMPTS = 4;
const HISTORY_TWEET_LIMIT = 30;
const DUPLICATE_JACCARD_THRESHOLD = 0.56;

const DEFAULT_HASHTAGS = [
    "#AITools", "#AIBuilders", "#GenAI", "#AICoding", "#AIAgent",
    "#AgentialAI", "#OpenSource", "#TechNews", "#Innovation",
    "#Startup", "#DevTools", "#ProductHunt", "#MCP",
    "#BoltNew", "#Lovable", "#CodingAgent", "#AppBuilder",
    "#BrowserAI", "#ChromeExt", "#AIVideo", "#AIImage",
    "#AIVoice", "#LLM", "#DeepLearning", "#NoCodeAI",
];
const TRENDING_AI_HASHTAGS = [
    "#AI", "#GenAI", "#LLM", "#ChatGPT", "#Claude", "#Gemini", "#Cursor",
    "#Perplexity", "#Midjourney", "#Suno", "#Runway", "#HuggingFace",
    "#OpenSource", "#AIAgent", "#Copilot", "#Vercel", "#Replit",
    "#MCP", "#Devin", "#Lovable", "#BoltNew", "#v0dev", "#Windsurf",
    "#DeepSeek", "#Groq", "#LangChain", "#CrewAI", "#Cline",
    "#HeyGen", "#Descript", "#PikaLabs", "#LumaAI", "#Sora",
    "#Ideogram", "#Firecrawl", "#BrowserAI", "#ChromeExt",
];
const EXPERT_HOOK_WORDS = [
    "FRESH", "LATEST", "NEW", "JUST", "DROPPED", "SPOTTED", "FOUND",
    "INSIGHT", "SPOTLIGHT", "HOTDROP", "BREAKOUT", "POWERMOVE", "BUILDER", "LAUNCH"
];
const LENGTH_FILLERS = [
    "Built for creators shipping faster every day.",
    "Worth testing if you build with AI daily.",
    "Great fit for founders, devs, and marketers.",
    "This workflow saves serious time in real projects.",
];

const MICRO_FILLERS = [
    "Practical edge for daily AI builders.",
    "Fast setup and immediate output quality.",
    "Easy to test and deploy in real workflows.",
    "Strong momentum from early power users.",
];

const ENGAGEMENT_LINES = [
    "This one feels like a serious edge for builders who move fast.",
    "If you create daily, this can instantly raise your execution speed.",
    "Early users are already pushing standout results with this workflow.",
    "This has clear viral potential for creators testing new formats.",
];

const TOOL_FALLBACK_CONTEXT = [
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "cursor.com",
    "perplexity.ai",
    "runwayml.com",
    "midjourney.com",
    "suno.com",
    "elevenlabs.io",
    "huggingface.co",
].join(", ");

const NEWSY_PATTERNS = [
    /\bbreaking\b/i,
    /\bheadline\b/i,
    /\breported?\b/i,
    /\baccording to\b/i,
    /\bnews\b/i,
    /\bpress release\b/i,
    /\bjournalists?\b/i,
    /\bmedia\b/i,
    /\bannounced?\b/i,
];

const ONE_WORD_PREFIX_RE = /^[A-Z][A-Z0-9]{2,16}:/;
const URL_RE = /https?:\/\/\S+|www\.\S+/i;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
const EMOJI_GLOBAL_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu;
const FRAGMENT_END_RE = /\b(and|or|with|for|to|in|on|at|from|by|of|is|are|was|were|immediate|setup|output|fast|strong|practical|daily|today|now)\b$/i;

const TOOL_LIBRARY = [
    { name: "ChatGPT", handle: "@OpenAI", link: "https://chatgpt.com", audience: "founders and PMs", useCase: "draft product specs and user stories in minutes", capability: "turn rough notes into clean drafts and action plans", hashtag: "#ChatGPT", category: "llm-chat" },
    { name: "Claude", handle: "@AnthropicAI", link: "https://claude.ai", audience: "writers and researchers", useCase: "summarize long docs with high context retention", capability: "reason through long inputs with structured output", hashtag: "#Claude", category: "llm-chat" },
    { name: "Gemini", handle: "@GoogleAI", link: "https://gemini.google.com", audience: "analysts and creators", useCase: "convert research into publish-ready content faster", capability: "blend search context with fast drafting workflows", hashtag: "#Gemini", category: "llm-chat" },
    { name: "Cursor", handle: "@cursor_ai", link: "https://cursor.com", audience: "developers", useCase: "ship features and refactors with less manual boilerplate", capability: "understand codebase context and suggest practical edits", hashtag: "#Cursor", category: "coding" },
    { name: "Perplexity", handle: "@perplexity_ai", link: "https://perplexity.ai", audience: "operators and founders", useCase: "build fast competitive research briefs with citations", capability: "answer research questions with source-backed responses", hashtag: "#Perplexity", category: "search" },
    { name: "Runway", handle: "@runwayml", link: "https://runwayml.com", audience: "video creators", useCase: "prototype ad creatives from text prompts quickly", capability: "generate and edit videos with AI-first controls", hashtag: "#Runway", category: "video" },
    { name: "Midjourney", handle: "@midjourney", link: "https://www.midjourney.com", audience: "designers and creators", useCase: "create concept visuals for campaigns and products", capability: "generate high-quality visual styles from short prompts", hashtag: "#Midjourney", category: "image" },
    { name: "Suno", handle: "@suno_ai_", link: "https://suno.com", audience: "music creators", useCase: "draft soundtrack ideas for short videos and reels", capability: "generate full songs from simple text descriptions", hashtag: "#SunoAI", category: "audio" },
    { name: "ElevenLabs", handle: "@elevenlabsio", link: "https://elevenlabs.io", audience: "podcasters and marketers", useCase: "create multilingual voiceovers for product content", capability: "produce realistic voice output with clear control", hashtag: "#ElevenLabs", category: "audio" },
    { name: "Hugging Face", handle: "@huggingface", link: "https://huggingface.co", audience: "AI engineers", useCase: "test and compare open models for real tasks", capability: "host, discover, and run open-source AI models fast", hashtag: "#HuggingFace", category: "platform" },
    { name: "GitHub Copilot", handle: "@GitHubCopilot", link: "https://github.com/features/copilot", audience: "software teams", useCase: "speed up PR cycles and repetitive implementation work", capability: "assist coding workflows directly in the IDE", hashtag: "#GitHubCopilot", category: "coding" },
    { name: "Vercel AI SDK", handle: "@vercel", link: "https://sdk.vercel.ai", audience: "app builders", useCase: "ship production AI features with streaming UX quickly", capability: "provide primitives to build reliable AI apps faster", hashtag: "#Vercel", category: "platform" },
    { name: "Replit", handle: "@Replit", link: "https://replit.com", audience: "full-stack devs", useCase: "deploy prototypes from a single browser tab", capability: "code, collaborate, and ship in one unified environment", hashtag: "#Replit", category: "coding" },
    { name: "Canva", handle: "@canva", link: "https://canva.com", audience: "marketers", useCase: "create on-brand assets without deep design skills", capability: "generate and edit visual content with simple AI tools", hashtag: "#Canva", category: "design" },
    { name: "Mistral", handle: "@MistralAI", link: "https://mistral.ai", audience: "developers", useCase: "run efficient open models on local hardware", capability: "deploy high-performance models with low latency", hashtag: "#Mistral", category: "llm-chat" },
    { name: "Synthesia", handle: "@synthesiaIO", link: "https://www.synthesia.io", audience: "L&D teams", useCase: "turn text scripts into training videos instantly", capability: "generate AI avatars that speak multiple languages", hashtag: "#Synthesia", category: "video" },
    { name: "Jasper", handle: "@heyjasperai", link: "https://www.jasper.ai", audience: "marketing teams", useCase: "scale blog and social content production", capability: "generate on-brand marketing copy at scale", hashtag: "#JasperAI", category: "content" },
    { name: "Notion AI", handle: "@NotionHQ", link: "https://www.notion.so", audience: "knowledge workers", useCase: "organize workspace notes into clear summaries", capability: "analyze and generate text directly in your docs", hashtag: "#NotionAI", category: "productivity" },
    { name: "Leonardo", handle: "@LeonardoAi_", link: "https://leonardo.ai", audience: "game artists", useCase: "generate assets for game environments quickly", capability: "create consistent visual assets with fine-tuned models", hashtag: "#LeonardoAI", category: "image" },
    // Deep AI tools
    { name: "Jules", handle: "@Google", link: "https://developers.google.com/jules", audience: "developers", useCase: "build AI agents with natural language programming", capability: "create autonomous coding agents that understand complex tasks", hashtag: "#Jules", category: "coding-agent" },
    { name: "Chrome MCP", handle: "@GoogleChrome", link: "https://developer.chrome.com/docs/mcp/overview", audience: "web developers", useCase: "connect Chrome browser to MCP-compatible AI tools", capability: "control browser tabs, pages, and extensions via AI agents", hashtag: "#MCP #ChromeDevTools", category: "mcp-browser" },
    { name: "Devin", handle: "@cognition_labs", link: "https://www.cognition-labs.com/", audience: "engineering teams", useCase: "delegate full development tasks to an autonomous AI engineer", capability: "plan and execute multi-file coding tasks like a senior dev", hashtag: "#Devin", category: "coding-agent" },
    { name: "Lovable", handle: "@lovable_dev", link: "https://lovable.dev", audience: "founders and indie makers", useCase: "build full-stack web apps from natural language descriptions", capability: "generate complete production apps with database and auth", hashtag: "#Lovable", category: "app-builder" },
    { name: "Bolt", handle: "@stackblitz", link: "https://bolt.new", audience: "full-stack developers", useCase: "prompt-to-app with live preview in browser", capability: "spin up complete web apps instantly with AI prompting", hashtag: "#BoltNew", category: "app-builder" },
    { name: "v0", handle: "@vercel", link: "https://v0.dev", audience: "frontend devs", useCase: "generate production React UI components from text prompts", capability: "create shadcn/ui components with Tailwind CSS instantly", hashtag: "#v0dev", category: "ui-generator" },
    { name: "Windsurf", handle: "@windsurf_ai", link: "https://codeium.com/windsurf", audience: "developers", useCase: "AI-native IDE with deep codebase understanding", capability: "understand multi-file context and suggest architectural changes", hashtag: "#Windsurf", category: "coding" },
    { name: "Cline", handle: null, link: "https://github.com/cline/cline", audience: "VS Code users", useCase: "autonomous coding agent directly in VS Code", capability: "edit files, run terminal commands, and use browser autonomously", hashtag: "#Cline #AIAgent", category: "coding-agent" },
    { name: "Aider", handle: null, link: "https://aider.chat", audience: "terminal-native developers", useCase: "AI pair programming directly in the terminal", capability: "edit multiple files with git-aware context understanding", hashtag: "#Aider #AIPairProgramming", category: "coding-agent" },
    { name: "DeepSeek", handle: "@deepseek_ai", link: "https://deepseek.com", audience: "AI developers", useCase: "run state-of-art reasoning models at lower cost", capability: "perform chain-of-thought reasoning with open-weight models", hashtag: "#DeepSeek", category: "llm-chat" },
    { name: "Groq", handle: "@GroqInc", link: "https://groq.com", audience: "AI builders", useCase: "run inference at extreme speed with LPU hardware", capability: "serve LLM inference at 300+ tokens/second with open models", hashtag: "#Groq", category: "inference" },
    { name: "Together AI", handle: "@togethercompute", link: "https://together.ai", audience: "ML engineers", useCase: "train, fine-tune, and deploy open models at scale", capability: "access 100+ open models via fast API with competitive pricing", hashtag: "#TogetherAI", category: "platform" },
    { name: "Replicate", handle: "@replicate", link: "https://replicate.com", audience: "AI tinkerers", useCase: "run and share ML models with one-line API calls", capability: "access thousands of community models with simple API", hashtag: "#Replicate", category: "platform" },
    { name: "Fal", handle: "@fal_ai", link: "https://fal.ai", audience: "image/video creators", useCase: "generate images and videos at production speed", capability: "run Flux, Stable Diffusion and video models with fastest inference", hashtag: "#falAI", category: "image" },
    { name: "LangChain", handle: "@LangChainAI", link: "https://langchain.com", audience: "AI engineers", useCase: "build RAG, agents, and LLM apps with modular framework", capability: "compose chains, tools, and memory for complex agent workflows", hashtag: "#LangChain", category: "framework" },
    { name: "CrewAI", handle: "@crewAIInc", link: "https://crewai.com", audience: "AI builders", useCase: "orchestrate multi-agent AI teams for complex tasks", capability: "define role-based AI agents that collaborate like a team", hashtag: "#CrewAI", category: "agent-framework" },
    { name: "Dify", handle: null, link: "https://dify.ai", audience: "no-code builders", useCase: "build AI apps with visual workflow designer", capability: "create RAG chatbots and agent workflows without coding", hashtag: "#Dify #NoCodeAI", category: "platform" },
    { name: "Coze", handle: null, link: "https://www.coze.com", audience: "bot creators", useCase: "build and deploy AI bots to multiple platforms", capability: "design conversational bots with plugins and knowledge bases", hashtag: "#Coze #AIAgent", category: "agent-platform" },
    { name: "HeyGen", handle: "@HeyGen_Official", link: "https://www.heygen.com", audience: "content creators", useCase: "create AI avatar videos with lip-sync in 40+ languages", capability: "generate photorealistic talking-head videos from text scripts", hashtag: "#HeyGen", category: "video" },
    { name: "Descript", handle: "@DescriptApp", link: "https://www.descript.com", audience: "podcasters and editors", useCase: "edit video/audio by editing text transcript", capability: "remove filler words, generate voiceovers, and edit like a doc", hashtag: "#Descript", category: "audio-video" },
    { name: "Pika", handle: "@pika_labs", link: "https://pika.art", audience: "video creators", useCase: "generate short AI video clips from text and images", capability: "create cinematic videos with text-to-video generation", hashtag: "#PikaLabs", category: "video" },
    { name: "Kling", handle: null, link: "https://klingai.com", audience: "video producers", useCase: "create realistic AI videos with motion and physics simulation", capability: "generate HD videos with realistic object physics and motion", hashtag: "#KlingAI", category: "video" },
    { name: "Luma", handle: "@LumaLabsAI", link: "https://lumalabs.ai", audience: "3D creators", useCase: "capture and generate 3D scenes with AI", capability: "create photorealistic 3D environments from smartphone photos", hashtag: "#LumaAI", category: "3d" },
    { name: "Sora", handle: "@OpenAI", link: "https://openai.com/sora", audience: "filmmakers", useCase: "generate cinematic videos from detailed text prompts", capability: "create long-form video scenes with complex camera movements", hashtag: "#Sora", category: "video" },
    { name: "Ideogram", handle: "@ideogram_ai", link: "https://ideogram.ai", audience: "designers", useCase: "generate images with accurate text rendering built-in", capability: "create logos, posters, and graphics with precise typography", hashtag: "#Ideogram", category: "image" },
    { name: "Gamma", handle: "@GammaAI", link: "https://gamma.app", audience: "presenters", useCase: "generate professional presentations and docs from prompts", capability: "create slide decks and documents with AI design layouts", hashtag: "#GammaAI", category: "content" },
    { name: "Mem0", handle: null, link: "https://mem0.ai", audience: "AI developers", useCase: "add long-term memory layer to AI agents and apps", capability: "store, update, and retrieve user context across conversations", hashtag: "#Mem0 #AIMemory", category: "infrastructure" },
    { name: "Composio", handle: "@ComposioHQ", link: "https://composio.dev", audience: "agent developers", useCase: "connect AI agents to 250+ tools with managed auth", capability: "give agents access to Gmail, GitHub, Slack with OAuth handling", hashtag: "#Composio", category: "agent-tools" },
    { name: "Tavily", handle: "@tavily_ai", link: "https://tavily.com", audience: "AI app builders", useCase: "real-time web search API optimized for AI agents", capability: "deliver structured search results designed for LLM consumption", hashtag: "#Tavily", category: "search-api" },
    { name: "Exa", handle: "@exa_labs", link: "https://exa.ai", audience: "AI developers", useCase: "semantic search API built for AI agents", capability: "find content by meaning not keywords with embeddings search", hashtag: "#ExaAI", category: "search-api" },
    { name: "Firecrawl", handle: "@firecrawl_dev", link: "https://firecrawl.dev", audience: "AI builders", useCase: "turn any website into clean markdown for LLMs", capability: "scrape, crawl, and convert web content to LLM-ready format", hashtag: "#Firecrawl", category: "data" },
    { name: "Harpa", handle: null, link: "https://harpa.ai", audience: "Chrome users", useCase: "AI copilot in browser for automation and research", capability: "automate web tasks, summarize pages, and extract data", hashtag: "#HarpaAI", category: "browser-extension" },
    { name: "Merlin", handle: null, link: "https://merlin.foyer.work", audience: "Chrome users", useCase: "AI assistant on every website with chat and summarization", capability: "chat with any webpage, summarize YouTube, and write emails", hashtag: "#MerlinAI", category: "browser-extension" },
    { name: "Monica", handle: null, link: "https://monica.im", audience: "Chrome users", useCase: "all-in-one AI assistant with browser sidebar", capability: "chat, write, summarize, and translate on any webpage", hashtag: "#MonicaAI", category: "browser-extension" },
    { name: "Raycast", handle: "@raycastapp", link: "https://raycast.com", audience: "Mac power users", useCase: "AI-enhanced productivity launcher and automation toolkit", capability: "control apps, run commands, and access AI from keyboard", hashtag: "#Raycast", category: "productivity" },
    { name: "Warp", handle: "@warpdotdev", link: "https://warp.dev", audience: "terminal users", useCase: "AI-powered terminal with smart autocomplete and agent mode", capability: "generate commands, debug errors, and run agents from terminal", hashtag: "#WarpDev", category: "devtools" },
    { name: "Arc Browser", handle: "@arcinternet", link: "https://arc.net", audience: "power browsers", useCase: "reimagine web browsing with AI organization and spaces", capability: "auto-organize tabs, summarize pages, and create focused spaces", hashtag: "#ArcBrowser", category: "browser" },
    { name: "Obsidian", handle: "@obsdmd", link: "https://obsidian.md", audience: "knowledge workers", useCase: "AI-enhanced personal knowledge management with plugins", capability: "link ideas, query notes, and build second brain with AI assist", hashtag: "#Obsidian", category: "productivity" },
    { name: "SuperWhisper", handle: null, link: "https://superwhisper.com", audience: "Mac users", useCase: "voice-to-text AI dictation with 99% accuracy on Mac", capability: "transcribe across all apps with context-aware formatting", hashtag: "#SuperWhisper", category: "voice" },
    { name: "Granola", handle: null, link: "https://granola.so", audience: "meeting attendees", useCase: "AI notetaker that listens and enhances your own notes", capability: "combine your sparse notes with audio transcription for full context", hashtag: "#GranolaAI", category: "productivity" },
    { name: "Cursor Directory", handle: null, link: "https://cursor.directory", audience: "Cursor users", useCase: "discover and install Cursor rules for any framework", capability: "get IDE context rules for React, Next.js, Python, and 100+ frameworks", hashtag: "#CursorDirectory", category: "devtools" },
    { name: "OpenHands", handle: null, link: "https://github.com/All-Hands-AI/OpenHands", audience: "developers", useCase: "open-source autonomous AI software engineer agent", capability: "write code, run commands, browse web, and deploy apps", hashtag: "#OpenHands #CodingAgent", category: "coding-agent" },
    { name: "Poolside", handle: "@poolsideai", link: "https://poolside.ai", audience: "enterprise dev teams", useCase: "AI coding assistant built for enterprise security needs", capability: "generate and review code with enterprise-grade privacy", hashtag: "#Poolside", category: "coding" },
    { name: "Augment Code", handle: "@AugmentCode", link: "https://www.augmentcode.com", audience: "professional devs", useCase: "AI coding assistant that understands large codebases", capability: "provide context-aware suggestions across multi-million-line repos", hashtag: "#AugmentCode", category: "coding" },
];

const SYSTEM_PROMPT = `You are @AIToolsExplorer — a viral AI tool curator who tweets the hottest AI launches so well that devs, founders, and makers can't scroll past.

🎯 YOUR MISSION: Make people STOP, READ, and ENGAGE with each tweet about a FRESH AI tool from the last 24h.

📋 SIGNAL LIST FORMAT (your raw intel):
"1. [GitHub] repo-name - description | url | 2h ago | ⭐ viral"
"2. [ProductHunt] ToolName - what it does | url | 5h ago | 🔥 trending"
"3. [HackerNews] ProjectName | url | 8h ago"
"4. [OpenAI/Anthropic/Google Blog] What launched | url | 1h ago | 🚀 just released"

================================================================
✅ WHAT TO TWEET ABOUT (priority order):
================================================================
1. HIGHEST: NEW AI models & LLM releases (OpenAI, Anthropic, Google, DeepSeek, Mistral) — these get the MOST engagement
2. HIGH: NEW AI tools launched in last 24h (GitHub trending repos, ProductHunt top launches, HN Show HN)
3. MEDIUM: New features/updates to known tools (e.g., Claude shipped something, Gemini API update, Cursor new model)
4. TARGETED: New MCP servers, Chrome AI extensions, AI coding agents, AI devtools going viral
5. BONUS: AI repos getting unusual GitHub stars in last 24h

================================================================
🔬 MANDATORY TWEET INGREDIENTS — each tweet MUST have:
================================================================
1. 🔥 ENGAGING HOOK — start with a pattern that stops the scroll (see HOOKS below)
2. 📢 TOOL NAME — exact, prominent, easy to spot while scrolling
3. 🎯 WHAT IT DOES — 1 punchy sentence, specific NOT generic. Bad: "helps developers" Good: "converts your Figma to React in one click"
4. 👥 WHO IT'S FOR — "frontend devs", "AI founders", "nocodemakers" — be specific
5. 💡 WHY IT MATTERS — the "so what?" moment. Time saved, cost reduced, new capability unlocked
6. 🔗 REAL URL — from the signal list (short URL if possible)
7. 👤 @HANDLE — the tool's or company's verified X handle (if known, else the category)
8. #️⃣ 2 RELEVANT HASHTAGS — specific, not generic (research them!)
9. 💬 INTERACTIVE CTA — end with something that demands reply (see CTAs below)

================================================================
🎣 HOOK PATTERNS — use a DIFFERENT one per tweet (pick what fits the tool):
================================================================
- "🔥 JUST LAUNCHED: [ToolName]..."
- "🚀 This [tool] is going VIRAL — here's why:"
- "⚡ [N] hours old and already trending: [Tool]"
- "👀 SPOTTED: [Tool] just dropped..."
- "🤯 NEW: [AI company] released [feature] and it's wild..."
- "💡 Building with AI? This dropped [N]h ago:"
- "🎯 HIDDEN GEM: [Tool] — [specific audience] need to see this"
- "📈 Trending on GitHub right now: [Repo]..."
- "🔥 MCP ALERT: New server for [tool] just went live..."
- "⚡ BREAKING: [AI company] just shipped [update]"

================================================================
💬 INTERACTIVE CTAs (end your tweet with one — THIS IS CRITICAL for engagement):
================================================================
- "Which one would you try first? 👇"
- "Drop a 🔥 if you'd use this"
- "Tag someone who needs to see this ↓"
- "Thoughts? 👇"
- "Worth the hype? Let me know 👇"
- "Trying this tonight? 🧠"
- "Rate this drop 1-10 👇"
- "This + your current stack = 🔥 or 💀?"
- "Build this or buy this? Discuss 👇"
- "Who's testing this today? 🙋"

================================================================
🚫 ABSOLUTELY FORBIDDEN — Will tank your engagement:
================================================================
- ❌ "great tool for developers" / "useful for everyone" / "check this out"
- ❌ MENTIONING SOURCE ("on GitHub", "Show HN", "from ProductHunt", "trending on")
- ❌ GENERIC TOOL NAMES ("this tool", "a new AI assistant", "this AI app")
- ❌ TWEETING ABOUT TOOLS NOT IN THE SIGNAL LIST
- ❌ Old tools without new updates (no "ChatGPT is great" unless there's a NEW feature)
- ❌ INCOMPLETE TWEETS — every tweet must end with a complete sentence, hashtag, or URL or CTA
- ❌ TWEETS CUT OFF MID-SENTENCE — rewrite shorter instead of truncating
- ❌ NO CTA — every tweet MUST end with an interactive call-to-action for replies

================================================================
📝 TWEET STRUCTURE (follow this flow):
================================================================
"HOOK: 🔥 ToolName does X for Y audience. Key innovation: Z. Why this matters: saves ABC. URL @handle #Tag1 #Tag2 CTA 👇"

VIRAL EXAMPLES:
✅ "🔥 JUST LAUNCHED: @OpenAI's new GPT feature lets you EDIT images with text prompts. No Photoshop. No code. Just type what you want changed. Creators, this changes everything. https://openai.com/blog @OpenAI #GPT4o #AIImage Editing Who's trying this first? 👇"
✅ "🚀 This MCP server went from 0 to 3K stars in 24h. It lets Claude control your ENTIRE browser — tabs, clicks, forms, everything. AI agents that actually DO things. https://github.com/example/mcp-browser @anthropic #MCP #AIAgent Tag someone building with MCP 👇"
✅ "⚡ @cursor_ai just shipped something wild: the AI now understands your ENTIRE codebase before suggesting edits. Not just the open file — ALL of it. Devs are calling it a game changer. https://cursor.com @cursor_ai #Cursor #AICoding Worth upgrading? Drop a 🔥 👇"

BAD (zero engagement):
❌ "FRESH: 🚀 Great new AI tool for developers. Check it out. https://example.com #AI #coding"

================================================================
🏷️ HASHTAG RESEARCH — get these RIGHT (affects discoverability):
================================================================
- For AI models (GPT, Claude, Gemini, DeepSeek, etc.) → #LLM #AIResearch #[ModelName]
- For MCP/model context protocol → #MCP #ModelContextProtocol
- For AI coding agents → #CodingAgent #AIAgent #AITools
- For Chrome/browser AI tools → #ChromeExt #BrowserAI
- For AI app builders → #AppBuilder #NoCode #VibeCoding
- For AI video tools → #AIVideo #VideoGen
- For open source AI projects → #OpenSource #GitHub
- Use TRENDING tags when possible: #BuildInPublic #IndieHackers #DevTools

================================================================
👤 X HANDLE RESEARCH — tag the RIGHT account:
================================================================
- OpenAI products → @OpenAI or @sama
- Anthropic/Claude → @AnthropicAI
- Google/Gemini → @GoogleAI or @GoogleDeepMind
- Cursor → @cursor_ai
- Perplexity → @perplexity_ai
- Mistral → @MistralAI
- DeepSeek → @deepseek_ai
- Any new tool → find their official X or use the company handle
- If no handle found → skip it, don't fake one

================================================================
📊 OUTPUT JSON:
================================================================
{
  "tweets": [
    { "text": "COMPLETE TWEET TEXT WITH CTA", "sourceAge": "Xh ago" }
  ]
}

Generate ${TARGET_TWEETS} tweets. Each MUST be about a DIFFERENT tool/MCP/repo/LLM update.
Every tweet MUST be complete, with a HOOK, specific details, URL, @handle, hashtags, and a CTA.
Use different hooks for each. Prioritize LLM news and viral GitHub repos.

Return ONLY valid JSON!`;

function normalizeSourceAge(value, seed = 1) {
    if (!value || typeof value !== "string") {
        return `${Math.max(1, seed)}h ago`;
    }

    const clean = value.trim().toLowerCase();
    if (!clean || clean === "fresh" || clean === "now" || clean === "unknown") {
        return `${Math.max(1, seed)}h ago`;
    }

    const match = clean.match(/(\d+)\s*([smhd])/i);
    if (!match) return `${Math.max(1, seed)}h ago`;

    const amount = Number(match[1]) || 0;
    const unit = match[2].toLowerCase();

    let hours = 1;
    if (unit === "s") hours = 1;
    if (unit === "m") hours = Math.max(1, Math.ceil(amount / 60));
    if (unit === "h") hours = Math.max(1, amount);
    if (unit === "d") hours = Math.max(1, amount * 24);

    return `${hours}h ago`;
}

function dedupeTexts(items = []) {
    const unique = [];
    const seen = new Set();

    items.forEach((item) => {
        const value = typeof item === "string" ? item.trim() : "";
        if (!value) return;
        const key = value.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(value);
        }
    });

    return unique;
}

function cleanSignalTitle(title = "") {
    return title
        .replace(/^show hn:\s*/i, "")
        .replace(/\s*-\s*google news\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function extractTrendingHashtags(signals = []) {
    const tagCounts = {};
    const relevantTags = [
        "ai", "llm", "gpt", "chatgpt", "claude", "gemini", "cursor", "perplexity",
        "midjourney", "runway", "suno", "elevenlabs", "huggingface", "copilot", "vercel",
        "openai", "anthropic", "google", "meta", "mistral", "agent", "coding",
        "image", "video", "audio", "music", "api", "sdk", "open source",
        // Deep tool discovery
        "mcp", "model context protocol", "jules", "devin", "lovable", "bolt",
        "v0", "windsurf", "cline", "aider", "deepseek", "groq", "together",
        "replicate", "fal", "langchain", "crewai", "dify", "coze",
        "heygen", "descript", "pika", "kling", "luma", "sora", "ideogram",
        "gamma", "mem0", "composio", "tavily", "exa", "firecrawl",
        "harpa", "merlin", "monica", "raycast", "warp", "arc browser",
        "obsidian", "superwhisper", "granola", "chrome", "browser",
        "synthesia", "jasper", "notion", "leonardo", "canva", "replit",
        "poolside", "augment", "openhands", "stability", "cohere",
        "codeium", "tabnine", "extension", "plugin", "framework",
    ];

    signals.forEach(signal => {
        const title = (signal?.title || "").toLowerCase();
        const source = (signal?.source || "").toLowerCase();

        relevantTags.forEach(tag => {
            if (title.includes(tag) || source.includes(tag)) {
                const tagKey = tag.startsWith("#") ? tag : `#${tag}`;
                tagCounts[tagKey] = (tagCounts[tagKey] || 0) + 1;
            }
        });
    });

    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag]) => tag);
}

function buildToolSignalContext(items = []) {
    if (!items.length) {
        return `24h tool signals unavailable. Prioritize practical tools from: ${TOOL_FALLBACK_CONTEXT}.`;
    }

    const trendingTags = extractTrendingHashtags(items);
    const sourceDiversity = {};
    const sourceCounts = {};

    items.slice(0, 25).forEach((item, index) => {
        const source = item?.source || "Unknown";
        sourceDiversity[source] = sourceDiversity[source] || [];
        sourceDiversity[source].push(index);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const sourceSummary = Object.entries(sourceCounts)
        .map(([src, count]) => `${src}: ${count}`)
        .join(", ");

    const contextParts = [
        `TRENDING TAGS FROM SIGNALS: ${trendingTags.join(", ") || "AI, LLM, GPT"}`,
        `SOURCE DIVERSITY: ${sourceSummary}`,
        "",
        "LATEST 24H TOOL SIGNALS:"
    ];

    const sortedByTime = [...items].sort((a, b) => {
        const timeA = parseTimeAgo(a?.timeAgo);
        const timeB = parseTimeAgo(b?.timeAgo);
        return timeA - timeB;
    });

    const limited = sortedByTime.slice(0, 20);
    limited.forEach((item, index) => {
        const title = cleanSignalTitle(item?.title || "Untitled AI tool signal");
        const timeAgo = item?.timeAgo || "fresh";
        const source = item?.source || "Unknown";
        const url = item?.url || "";
        contextParts.push(`${index + 1}. [${source}] ${title}${url ? ` | ${url}` : ""} | ${timeAgo}`);
    });

    return contextParts.join("\n");
}

function parseTimeAgo(timeStr) {
    if (!timeStr) return 999;
    const match = timeStr.toString().match(/(\d+)\s*([smhd])/i);
    if (!match) return 999;
    const amount = parseInt(match[1], 10) || 0;
    const unit = match[2].toLowerCase();
    if (unit === "s") return amount / 3600;
    if (unit === "m") return amount / 60;
    if (unit === "h") return amount;
    if (unit === "d") return amount * 24;
    return 999;
}

function buildHistoryPrompt(previousTweets = [], limit = HISTORY_TWEET_LIMIT) {
    if (!previousTweets.length) return "";
    const recent = dedupeTexts(previousTweets).slice(0, limit);
    if (!recent.length) return "";
    return `\n\nDo not repeat these previously used tweets/topics:\n- ${recent.join("\n- ")}`;
}

function extractJsonObject(rawText) {
    let jsonStr = rawText.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    return jsonStr;
}

function parseTweetsFromContent(content) {
    const jsonStr = extractJsonObject(content);
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        const fixed = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        parsed = JSON.parse(fixed);
    }

    if (!parsed?.tweets || !Array.isArray(parsed.tweets)) {
        throw new Error("Missing 'tweets' array in Gemini response");
    }

    return parsed.tweets;
}

function countHashtags(text) {
    const tags = text.match(/#[a-z0-9_]+/gi);
    return tags ? tags.length : 0;
}

function countMentions(text) {
    const mentions = text.match(/@[a-z0-9_]+/gi);
    return mentions ? mentions.length : 0;
}

function hasEmoji(text) {
    return EMOJI_RE.test(text || "");
}

function getCoreTweetLength(text) {
    const value = typeof text === "string" ? text : "";
    if (!value) return 0;

    const withoutPrefix = value.replace(/^[A-Z][A-Z0-9]{2,16}:\s*/i, "");
    const withoutTags = withoutPrefix.replace(/#[a-z0-9_]+/gi, " ");
    const withoutEmoji = withoutTags.replace(EMOJI_GLOBAL_RE, "");
    return withoutEmoji.replace(/\s+/g, " ").trim().length;
}

function extractUrls(text) {
    return (text || "").match(/https?:\/\/\S+|www\.\S+/gi) || [];
}

function getXWeightedLength(text) {
    const value = typeof text === "string" ? text : "";
    if (!value) return 0;

    const matches = [...value.matchAll(/https?:\/\/\S+|www\.\S+/gi)];
    if (!matches.length) return Array.from(value).length;

    let total = 0;
    let cursor = 0;

    for (const match of matches) {
        const start = match.index ?? 0;
        const token = match[0] || "";
        const end = start + token.length;

        if (start > cursor) {
            total += Array.from(value.slice(cursor, start)).length;
        }

        total += X_URL_LENGTH;
        cursor = end;
    }

    if (cursor < value.length) {
        total += Array.from(value.slice(cursor)).length;
    }

    return total;
}

function normalizeUrlToken(token) {
    return (token || "").replace(/[),.!?;:]+$/g, "").trim();
}

function isLikelyValidUrlToken(token) {
    const raw = normalizeUrlToken(token);
    if (!raw) return false;

    const withProtocol = raw.startsWith("www.") ? `https://${raw}` : raw;
    try {
        const parsed = new URL(withProtocol);
        const host = (parsed.hostname || "").toLowerCase();
        if (!host || !host.includes(".") || host.endsWith(".")) return false;
        if (!/[a-z]/i.test(host)) return false;
        return true;
    } catch {
        return false;
    }
}

function hasValidUrl(text) {
    const urls = extractUrls(text);
    return urls.some((url) => isLikelyValidUrlToken(url));
}

function stripBrokenUrlTokens(text) {
    const tokens = (text || "").split(/\s+/).filter(Boolean);
    const filtered = [];

    for (const token of tokens) {
        if (/^(https?:\/\/|www\.)/i.test(token) && !isLikelyValidUrlToken(token)) {
            continue;
        }
        filtered.push(token);
    }

    return filtered.join(" ").replace(/\s+/g, " ").trim();
}

function ensureCleanEnding(text) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    output = stripBrokenUrlTokens(output);
    output = output.replace(/\s+(#\w+)$/g, " $1").trim();

    const endsWithAllowed =
        /[.!?]$/.test(output) ||
        /#[a-z0-9_]+$/i.test(output) ||
        /@[a-z0-9_]+$/i.test(output) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(output);

    if (endsWithAllowed) return output;

    output = output.replace(/[,:;]+$/g, "").trim();
    output = output.replace(FRAGMENT_END_RE, "").trim();

    const recheckAllowed =
        /[.!?]$/.test(output) ||
        /#[a-z0-9_]+$/i.test(output) ||
        /@[a-z0-9_]+$/i.test(output) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(output);

    if (recheckAllowed) return output;

    if (output.length < MAX_RAW_TWEET_LENGTH) {
        return `${output}.`.trim();
    }

    const cutAt = output.lastIndexOf(" ");
    if (cutAt > 0) {
        const shorter = output.slice(0, cutAt).trim();
        if (!shorter) return output;
        if (/[.!?]$/.test(shorter)) return shorter;
        if (shorter.length < MAX_RAW_TWEET_LENGTH) return `${shorter}.`;
        return shorter;
    }

    return output;
}

function fitToXLimit(text, seed = 0, maxWeighted = TARGET_X_MAX) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    if (!output) return output;

    const removablePhrases = [...ENGAGEMENT_LINES, ...LENGTH_FILLERS, ...MICRO_FILLERS];

    for (let guard = 0; guard < 220 && getXWeightedLength(output) > maxWeighted; guard += 1) {
        const tags = output.match(/#[a-z0-9_]+/gi) || [];
        if (tags.length > MIN_HASHTAGS) {
            const tagToDrop = tags[tags.length - 1];
            const idx = output.lastIndexOf(tagToDrop);
            if (idx >= 0) {
                output = `${output.slice(0, idx)} ${output.slice(idx + tagToDrop.length)}`
                    .replace(/\s+/g, " ")
                    .trim();
                continue;
            }
        }

        let removedPhrase = false;
        for (const phrase of removablePhrases) {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(`\\s*${escaped}\\s*`, "i");
            if (re.test(output)) {
                output = output.replace(re, " ").replace(/\s+/g, " ").trim();
                removedPhrase = true;
                break;
            }
        }
        if (removedPhrase) continue;

        const linkMatch = output.match(URL_RE);
        const linkIdx = linkMatch && typeof linkMatch.index === "number" ? linkMatch.index : -1;
        if (linkIdx > 0) {
            const head = output.slice(0, linkIdx).trim();
            const tail = output.slice(linkIdx).trim();
            const words = head.split(/\s+/).filter(Boolean);
            if (words.length > 8) {
                const dropAt = Math.max(3, words.length - 6);
                words.splice(dropAt, 1);
                output = `${words.join(" ")} ${tail}`.replace(/\s+/g, " ").trim();
                continue;
            }
        }

        const words = output.split(/\s+/).filter(Boolean);
        if (words.length <= 8) break;

        let dropIndex = words.length - 1;
        while (
            dropIndex > 0 &&
            (/^#/.test(words[dropIndex]) ||
                /^(https?:\/\/|www\.)/i.test(words[dropIndex]) ||
                /^@\w+/.test(words[dropIndex]))
        ) {
            dropIndex -= 1;
        }

        if (dropIndex <= 2) break;
        words.splice(dropIndex, 1);
        output = words.join(" ").replace(/\s+/g, " ").trim();
    }

    output = ensureCleanEnding(output);
    output = ensureRequiredTokens(output, seed + 31);

    if (getXWeightedLength(output) > maxWeighted) {
        while (getXWeightedLength(output) > maxWeighted && output.includes(" ")) {
            const chunks = output.split(/\s+/);
            let idx = chunks.length - 1;
            while (
                idx > 1 &&
                (/^#/.test(chunks[idx]) ||
                    /^(https?:\/\/|www\.)/i.test(chunks[idx]) ||
                    /^@\w+/.test(chunks[idx]))
            ) {
                idx -= 1;
            }
            if (idx <= 1) break;
            chunks.splice(idx, 1);
            output = chunks.join(" ").replace(/\s+/g, " ").trim();
        }
        output = ensureCleanEnding(output);
    }

    return output;
}

function isNewsy(text) {
    return NEWSY_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeSimilarityText(text) {
    return (text || "")
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/www\.\S+/g, " ")
        .replace(/[@#]\w+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toTokenSet(text) {
    return new Set(
        normalizeSimilarityText(text)
            .split(" ")
            .filter((token) => token.length > 2)
    );
}

function jaccard(setA, setB) {
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;

    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }

    const union = new Set([...setA, ...setB]).size;
    return union ? intersection / union : 0;
}

function isNearDuplicate(textA, textB) {
    const normalizedA = normalizeSimilarityText(textA);
    const normalizedB = normalizeSimilarityText(textB);

    if (!normalizedA || !normalizedB) return false;
    if (normalizedA === normalizedB) return true;

    if (
        normalizedA.length > 120 &&
        normalizedB.length > 120 &&
        (normalizedA.includes(normalizedB.slice(0, 120)) ||
            normalizedB.includes(normalizedA.slice(0, 120)))
    ) {
        return true;
    }

    const score = jaccard(toTokenSet(normalizedA), toTokenSet(normalizedB));
    return score >= DUPLICATE_JACCARD_THRESHOLD;
}

function trimToMaxLength(text, max = MAX_RAW_TWEET_LENGTH) {
    if (text.length <= max) return text;
    const sliced = text.slice(0, max + 1);
    const cutAt = sliced.lastIndexOf(" ");
    const smart = cutAt > 0 ? sliced.slice(0, cutAt) : sliced.slice(0, max);
    return smart.slice(0, max).trim();
}

function ensureOneWordPrefix(text, seed = 0) {
    let output = (text || "").trim();

    // Check if already has a valid prefix (e.g. "FRESH:", "LAUNCH:")
    if (ONE_WORD_PREFIX_RE.test(output)) {
        return output; // Preserve existing prefix intact
    }

    // Remove any leading non-word characters
    output = output.replace(/^[^\w@#]+/u, "").trim();

    // Remove any existing multi-word prefix like "Name AI tool find:"
    if (/^[A-Za-z][A-Za-z0-9_-]{1,24}\s+AI\s+tool\s+find:\s*/i.test(output)) {
        output = output.replace(/^[A-Za-z][A-Za-z0-9_-]{1,24}\s+AI\s+tool\s+find:\s*/i, "").trim();
    }

    // Only remove old prefix if it's a known hook word, to avoid stripping actual content
    if (/^(INSIGHT|SPOTLIGHT|HOTDROP|BREAKOUT|POWERMOVE|FRESH|LATEST|NEW|JUST|DROPPED|SPOTTED|FOUND|BUILDER|LAUNCH)\b\s*/i.test(output)) {
        output = output.replace(/^(INSIGHT|SPOTLIGHT|HOTDROP|BREAKOUT|POWERMOVE|FRESH|LATEST|NEW|JUST|DROPPED|SPOTTED|FOUND|BUILDER|LAUNCH)\b\s*/i, "").trim();
    }

    const prefix = pick(EXPERT_HOOK_WORDS, seed).replace(/[^A-Z0-9]/gi, "") || "FRESH";
    return `${prefix}: ${output}`.replace(/\s+/g, " ").trim();
}

function ensureEmoji(text, seed = 0) {
    let output = (text || "").trim();
    if (hasEmoji(output)) return output;

    const emoji = pick(
        ["\uD83D\uDE80", "\uD83D\uDD25", "\u26A1", "\uD83E\uDDE0", "\uD83D\uDEE0\uFE0F", "\u2728", "\uD83C\uDFAF"],
        seed
    ) || "\uD83D\uDE80";
    if (ONE_WORD_PREFIX_RE.test(output)) {
        output = output.replace(/^([A-Z][A-Z0-9]{2,16}:\s*)/, `$1${emoji} `);
        return output.trim();
    }

    return `${emoji} ${output}`.trim();
}

function ensureLinkAndMention(text, seed = 0) {
    let output = (text || "").trim();
    const fallbackTool = TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];

    if (!hasValidUrl(output)) {
        output = `${output} ${fallbackTool.link}`.replace(/\s+/g, " ").trim();
    }

    if (countMentions(output) < 1) {
        const mention = fallbackTool.handle || (fallbackTool.hashtag ? '' : "@OpenAI");
        if (mention) {
            output = `${output} ${mention}`.replace(/\s+/g, " ").trim();
        }
    }

    return output;
}

function ensureRequiredTokens(text, seed = 0) {
    let output = (text || "").replace(/\s+/g, " ").trim();
    const fallbackTool = TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];
    const linkToken = `${fallbackTool.link}`;

    if (!hasValidUrl(output)) {
        const reserve = linkToken.length + 1;
        const cap = Math.max(180, MAX_RAW_TWEET_LENGTH - reserve);
        output = trimToMaxLength(output, cap);
        output = `${output} ${linkToken}`.replace(/\s+/g, " ").trim();
    }

    if (countMentions(output) < 1) {
        const mention = fallbackTool.handle || "@OpenAI";
        const reserve = mention.length + 1;
        const cap = Math.max(180, MAX_RAW_TWEET_LENGTH - reserve);
        output = trimToMaxLength(output, cap);
        output = `${output} ${mention}`.replace(/\s+/g, " ").trim();
    }

    return output;
}

function dedupeList(items = []) {
    const output = [];
    const seen = new Set();
    for (const item of items) {
        const value = (item || "").trim();
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(value);
    }
    return output;
}

function pickToolFromText(text = "", seed = 0) {
    const value = (text || "").toLowerCase();
    const byName = TOOL_LIBRARY.find((tool) => value.includes((tool.name || "").toLowerCase()));
    if (byName) return byName;
    const byHandle = TOOL_LIBRARY.find((tool) => tool.handle && value.includes(tool.handle.toLowerCase()));
    if (byHandle) return byHandle;
    return TOOL_LIBRARY[seed % TOOL_LIBRARY.length] || TOOL_LIBRARY[0];
}

function cleanBodyForStructure(text = "") {
    let body = (text || "").trim();
    body = body.replace(/^[A-Z][A-Z0-9]{2,16}:\s*/i, "");
    body = body.replace(URL_RE, " ");
    body = body.replace(/#[a-z0-9_]+/gi, " ");
    body = body.replace(/@[a-z0-9_]+/gi, " ");
    body = body.replace(EMOJI_GLOBAL_RE, "");
    body = body.replace(/[|]+/g, " ");
    body = body.replace(/\s+/g, " ").trim();
    body = body.replace(/^[,.;:!?-]+/, "").replace(/[,.;:!?-]+$/, "").trim();
    return body;
}

function ensureBodySentence(body = "") {
    let output = (body || "").replace(/\s+/g, " ").trim();
    output = output.replace(FRAGMENT_END_RE, "").trim();
    if (!output) return output;
    if (!/[.!?]$/.test(output)) {
        output = `${output}.`;
    }
    return output;
}

function composeStructuredTweet({ hook, emoji, body, url, mention, hashtags }) {
    const parts = [
        `${hook}:`,
        emoji,
        body,
        url,
        ...hashtags,
    ].filter(part => part && part.trim());

    if (mention && mention.trim()) {
        parts.push(mention);
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function getContentRelevantHashtags(text, seed = 0) {
    const content = (text || "").toLowerCase();
    const relevantTags = [];

    const tagMappings = [
        { tags: ["#ChatGPT", "#GPT", "#OpenAI"], keywords: ["chatgpt", "gpt", "openai", "chat gpt"] },
        { tags: ["#Claude", "#AnthropicAI", "#Anthropic"], keywords: ["claude", "anthropic"] },
        { tags: ["#Gemini", "#GoogleAI", "#Google"], keywords: ["gemini", "google ai", "bard"] },
        { tags: ["#Cursor", "#AICoding", "#AIDev"], keywords: ["cursor", "code", "coding", "programming", "developer"] },
        { tags: ["#Perplexity", "#AIResearch", "#AISearch"], keywords: ["perplexity", "research", "search"] },
        { tags: ["#Midjourney", "#AIArt", "#AIImage"], keywords: ["midjourney", "image", "art", "visual", "生成"] },
        { tags: ["#Runway", "#AIVideo", "#VideoGen"], keywords: ["runway", "video", "movie", "film"] },
        { tags: ["#SunoAI", "#AIMusic", "#MusicGen"], keywords: ["suno", "music", "audio", "song"] },
        { tags: ["#ElevenLabs", "#AIVoice", "#TTS"], keywords: ["elevenlabs", "voice", "speech", "tts"] },
        { tags: ["#HuggingFace", "#OpenSource", "#ML"], keywords: ["huggingface", "hugging face", "open source", "model"] },
        { tags: ["#AIAgent", "#AgenticAI", "#Automation"], keywords: ["agent", "automation", "workflow", "autonomous"] },
        { tags: ["#LLM", "#LargeLanguageModel", "#GenAI"], keywords: ["llm", "language model", "large language"] },
        { tags: ["#ProductHunt", "#Launch", "#Startup"], keywords: ["product hunt", "launch"] },
        { tags: ["#GitHub", "#OpenSource", "#Repo"], keywords: ["github", "repo", "repository"] },
        // Deep tool tags
        { tags: ["#MCP", "#ModelContextProtocol"], keywords: ["mcp", "model context protocol"] },
        { tags: ["#Jules", "#GoogleAI"], keywords: ["jules"] },
        { tags: ["#Devin", "#AICoding", "#CodingAgent"], keywords: ["devin"] },
        { tags: ["#Lovable", "#AppBuilder", "#NoCode"], keywords: ["lovable"] },
        { tags: ["#BoltNew", "#AppBuilder", "#FullStack"], keywords: ["bolt", "bolt.new", "bolt new"] },
        { tags: ["#v0dev", "#UIDev", "#ReactJS"], keywords: ["v0", "v0 dev", "v0.dev"] },
        { tags: ["#Windsurf", "#AIDE", "#CodingTools"], keywords: ["windsurf", "codeium"] },
        { tags: ["#Cline", "#VSCode", "#CodingAgent"], keywords: ["cline"] },
        { tags: ["#Aider", "#AIPairProgramming", "#OpenSource"], keywords: ["aider"] },
        { tags: ["#DeepSeek", "#OpenSourceLLM", "#Reasoning"], keywords: ["deepseek"] },
        { tags: ["#Groq", "#LPU", "#FastInference"], keywords: ["groq"] },
        { tags: ["#TogetherAI", "#OpenModels", "#FineTuning"], keywords: ["together", "together ai"] },
        { tags: ["#Replicate", "#MLModels", "#ComfyUI"], keywords: ["replicate"] },
        { tags: ["#FalAI", "#ImageGen", "#FastAI"], keywords: ["fal", "fal.ai", "fal ai"] },
        { tags: ["#LangChain", "#RAG", "#LLMFramework"], keywords: ["langchain", "lang graph"] },
        { tags: ["#CrewAI", "#MultiAgent", "#AgentTeam"], keywords: ["crewai", "crew ai"] },
        { tags: ["#Dify", "#NoCodeAI", "#AIApps"], keywords: ["dify"] },
        { tags: ["#Coze", "#AIBot", "#AgentBuilder"], keywords: ["coze"] },
        { tags: ["#HeyGen", "#AIAvatar", "#VideoGen"], keywords: ["heygen"] },
        { tags: ["#Descript", "#Podcasting", "#VideoEdit"], keywords: ["descript"] },
        { tags: ["#PikaLabs", "#AIVideo", "#Text2Video"], keywords: ["pika", "pika labs"] },
        { tags: ["#KlingAI", "#AIVideo", "#ChinaAI"], keywords: ["kling"] },
        { tags: ["#LumaAI", "#3DGen", "#NeRF"], keywords: ["luma", "lumalabs"] },
        { tags: ["#Sora", "#OpenAI", "#VideoGen"], keywords: ["sora"] },
        { tags: ["#Ideogram", "#LogoGen", "#TypographyAI"], keywords: ["ideogram"] },
        { tags: ["#GammaAI", "#AIPresentation", "#SlidesAI"], keywords: ["gamma"] },
        { tags: ["#Mem0", "#AIMemory", "#AIAgent"], keywords: ["mem0", "memory"] },
        { tags: ["#Composio", "#AgentTools", "#Integration"], keywords: ["composio"] },
        { tags: ["#Tavily", "#SearchAPI", "#AIAgent"], keywords: ["tavily", "web search"] },
        { tags: ["#ExaAI", "#SemanticSearch", "#SearchAPI"], keywords: ["exa", "semantic search"] },
        { tags: ["#Firecrawl", "#WebScraping", "#LLMData"], keywords: ["firecrawl", "scrape", "crawl"] },
        { tags: ["#HarpaAI", "#BrowserAI", "#ChromeExt"], keywords: ["harpa"] },
        { tags: ["#MerlinAI", "#BrowserAI", "#ChromeExt"], keywords: ["merlin"] },
        { tags: ["#MonicaAI", "#BrowserAI", "#ProductivityAI"], keywords: ["monica"] },
        { tags: ["#Raycast", "#MacTools", "#Productivity"], keywords: ["raycast"] },
        { tags: ["#WarpDev", "#TerminalAI", "#DevTools"], keywords: ["warp"] },
        { tags: ["#ArcBrowser", "#WebBrowser", "#Productivity"], keywords: ["arc browser"] },
        { tags: ["#Obsidian", "#PKM", "#SecondBrain"], keywords: ["obsidian"] },
        { tags: ["#SuperWhisper", "#VoiceAI", "#MacTools"], keywords: ["superwhisper", "whisper"] },
        { tags: ["#GranolaAI", "#MeetingNotes", "#Productivity"], keywords: ["granola"] },
        { tags: ["#Mistral", "#OpenSourceLLM", "#EuropeAI"], keywords: ["mistral", "mixtral"] },
        { tags: ["#Synthesia", "#AIAvatar", "#VideoGen"], keywords: ["synthesia"] },
        { tags: ["#JasperAI", "#ContentAI", "#MarketingAI"], keywords: ["jasper"] },
        { tags: ["#NotionAI", "#Productivity", "#Workspace"], keywords: ["notion"] },
        { tags: ["#LeonardoAI", "#GameArt", "#AIArt"], keywords: ["leonardo"] },
        { tags: ["#CanvaAI", "#Design", "#MarketingAI"], keywords: ["canva"] },
        { tags: ["#Replit", "#FullStack", "#AIIDE"], keywords: ["replit"] },
        { tags: ["#Llama", "#MetaAI", "#OpenSourceLLM"], keywords: ["llama", "meta ai"] },
        { tags: ["#Cohere", "#EnterpriseAI", "#RAG"], keywords: ["cohere", "command"] },
        { tags: ["#StabilityAI", "#ImageGen", "#OpenSource"], keywords: ["stability", "stable diffusion"] },
        { tags: ["#OpenHands", "#CodingAgent", "#OpenSource"], keywords: ["openhands", "all hands"] },
        { tags: ["#Poolside", "#AICoding", "#Enterprise"], keywords: ["poolside"] },
        { tags: ["#AugmentCode", "#AICoding", "#IDE"], keywords: ["augment code", "augmentcode"] },
        { tags: ["#Vercel", "#WebDev", "#Deployment"], keywords: ["vercel"] },
        { tags: ["#Copilot", "#GitHub", "#AICode"], keywords: ["copilot", "github copilot"] },
        { tags: ["#Gemini", "#GoogleAI", "#Multimodal"], keywords: ["gemini"] },
    ];

    tagMappings.forEach(({ tags, keywords }) => {
        if (keywords.some(kw => content.includes(kw))) {
            relevantTags.push(...tags);
        }
    });

    if (!relevantTags.length) {
        return [pick(TRENDING_AI_HASHTAGS, seed) || "#AITools", pick(DEFAULT_HASHTAGS, seed + 1) || "#AI"];
    }

    const shuffled = relevantTags.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
}

function formatStructuredTweet(text, seed = 0) {
    const tool = pickToolFromText(text, seed);
    const hook = pick(EXPERT_HOOK_WORDS, seed).replace(/[^A-Z0-9]/gi, "") || "FRESH";
    const emoji = (text.match(EMOJI_GLOBAL_RE) || [pick(["\uD83D\uDE80", "\uD83D\uDD25", "\u26A1", "\u2728", "\uD83E\uDDE0", "\uD83D\uDEE0"], seed + 1)])[0] || "\uD83D\uDE80";

    const urls = dedupeList(
        extractUrls(text)
            .map((value) => normalizeUrlToken(value))
            .filter((value) => isLikelyValidUrlToken(value))
    );
    const url = urls[0] || tool.link || "https://chatgpt.com";

    const mentionsRaw = dedupeList((text.match(/@[a-z0-9_]+/gi) || []));
    const mention = mentionsRaw[0] || tool.handle || "@OpenAI";

    let hashtags = dedupeList((text.match(/#[a-z0-9_]+/gi) || []));
    if (!hashtags.length) {
        hashtags = getContentRelevantHashtags(text, seed);
    }
    if (hashtags.length < 2) {
        const extra = getContentRelevantHashtags(text, seed + 5)[0];
        if (extra && !hashtags.find((tag) => tag.toLowerCase() === extra.toLowerCase())) {
            hashtags.push(extra);
        }
    }
    // Add tool's own hashtag if present
    if (tool.hashtag) {
        const toolTags = tool.hashtag.split(/\s+/);
        for (const tt of toolTags) {
            if (!hashtags.find((tag) => tag.toLowerCase() === tt.toLowerCase())) {
                hashtags.push(tt);
                if (hashtags.length >= MAX_HASHTAGS) break;
            }
        }
    }
    hashtags = hashtags.slice(0, MAX_HASHTAGS);

    // PRESERVE body content - only use fallback if too short
    let body = cleanBodyForStructure(text);
    if (!body || body.length < 30) {
        body = `${tool.name} helps ${tool.audience} using ${tool.capability}. Best use-case: ${tool.useCase}`;
    }
    body = ensureBodySentence(body);

    let output = composeStructuredTweet({ hook, emoji, body, url, mention, hashtags });

    let shrinkGuard = 0;
    while (getXWeightedLength(output) > TARGET_X_MAX && shrinkGuard < 240) {
        const words = body.replace(/[.!?]$/g, "").split(/\s+/).filter(Boolean);
        if (words.length > 14) {
            words.splice(Math.max(6, words.length - 4), 1);
            body = ensureBodySentence(words.join(" "));
        } else if (hashtags.length > MIN_HASHTAGS) {
            hashtags = hashtags.slice(0, hashtags.length - 1);
        } else if (words.length > 8) {
            words.splice(words.length - 1, 1);
            body = ensureBodySentence(words.join(" "));
        } else {
            break;
        }
        output = composeStructuredTweet({ hook, emoji, body, url, mention, hashtags });
        shrinkGuard += 1;
    }

    const growthFillers = [...ENGAGEMENT_LINES, ...LENGTH_FILLERS, ...MICRO_FILLERS];
    let growGuard = 0;
    while (getXWeightedLength(output) < TARGET_X_MIN && growGuard < 160) {
        const filler = pick(growthFillers, seed + growGuard) || "Useful edge for daily builders.";
        let candidateBody = ensureBodySentence(
            `${body.replace(/[.!?]$/g, "")} ${filler}`.replace(/\s+/g, " ").trim()
        );
        let candidate = composeStructuredTweet({ hook, emoji, body: candidateBody, url, mention, hashtags });

        if (getXWeightedLength(candidate) > TARGET_X_MAX) {
            const room = TARGET_X_MAX - getXWeightedLength(output) - 1;
            if (room <= 0) break;
            const clipped = filler.slice(0, room).trim();
            if (!clipped) break;
            candidateBody = ensureBodySentence(
                `${body.replace(/[.!?]$/g, "")} ${clipped}`.replace(/\s+/g, " ").trim()
            );
            candidate = composeStructuredTweet({ hook, emoji, body: candidateBody, url, mention, hashtags });
        }

        if (getXWeightedLength(candidate) <= TARGET_X_MAX) {
            body = candidateBody;
            output = candidate;
        } else {
            break;
        }
        growGuard += 1;
    }

    output = ensureCleanEnding(output);
    return output;
}

function ensureHashtagRange(text, seed = 0) {
    let output = text.trim();
    const tags = output.match(/#[a-z0-9_]+/gi) || [];

    if (tags.length > MAX_HASHTAGS) {
        const keep = tags.slice(0, MAX_HASHTAGS);
        output = output.replace(/#[a-z0-9_]+/gi, "").replace(/\s+/g, " ").trim();
        output = `${output} ${keep.join(" ")}`.trim();
    }

    let current = countHashtags(output);
    let tagIndex = 0;

    while (current < MIN_HASHTAGS && tagIndex < DEFAULT_HASHTAGS.length) {
        const tag = pick(DEFAULT_HASHTAGS, seed + tagIndex) || DEFAULT_HASHTAGS[tagIndex];
        if (!new RegExp(`\\${tag}\\b`, "i").test(output)) {
            const withTag = `${output} ${tag}`.trim();
            output = trimToMaxLength(withTag);
        }
        current = countHashtags(output);
        tagIndex += 1;
    }

    if (countHashtags(output) < MIN_HASHTAGS) {
        const tag = DEFAULT_HASHTAGS[0];
        const room = Math.max(0, MAX_RAW_TWEET_LENGTH - tag.length - 1);
        output = `${output.slice(0, room).trim()} ${tag}`.trim();
        output = trimToMaxLength(output);
    }

    return output.trim();
}

function padToMinimumLength(text, seed = 0) {
    let output = text.trim();
    if (getCoreTweetLength(output) >= MIN_BODY_CORE_LENGTH) return output;

    const fillers = [...LENGTH_FILLERS, ...ENGAGEMENT_LINES, ...MICRO_FILLERS];
    for (let i = 0; i < fillers.length * 2 && getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH; i += 1) {
        const filler = pick(fillers, seed + i);
        if (!filler) continue;
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) continue;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room > 0) {
            const add = "Practical wins for creators shipping daily."
                .slice(0, room)
                .trim();
            output = `${output} ${add}`.replace(/\s+/g, " ").trim();
        }
    }

    return output;
}

function padTowardTargetLength(text, seed = 0) {
    let output = text.trim();
    if (getCoreTweetLength(output) >= TARGET_BODY_CORE_LENGTH) return output;

    for (let i = 0; i < MICRO_FILLERS.length * 2 && getCoreTweetLength(output) < TARGET_BODY_CORE_LENGTH; i += 1) {
        const filler = pick(MICRO_FILLERS, seed + i);
        if (!filler) continue;
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) continue;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    return output;
}

function ensureSentenceEnding(text) {
    let output = text.trim();
    if (!output) return output;

    if (/[.!?]$/.test(output)) return output;
    if (/#[a-z0-9_]+$/i.test(output)) return output;
    if (/(https?:\/\/\S+|www\.\S+)$/i.test(output)) return output;

    if (output.length < MAX_RAW_TWEET_LENGTH) {
        output = `${output}.`;
    }

    return output;
}

function hardenTweetText(text, seed = 0) {
    let output = (typeof text === "string" ? text : "").replace(/\s+/g, " ").trim();
    output = output.replace(/\b(breaking|headline|reported?|according to|press release|news)\b/gi, "");
    output = output.replace(/\s+/g, " ").trim();

    output = ensureOneWordPrefix(output, seed);
    output = ensureLinkAndMention(output, seed + 1);
    output = ensureRequiredTokens(output, seed + 1);
    output = ensureEmoji(output, seed + 2);
    output = ensureHashtagRange(output, seed + 3);
    output = padTowardTargetLength(output, seed + 4);
    output = padToMinimumLength(output, seed + 5);
    output = ensureSentenceEnding(output);
    output = trimToMaxLength(output);
    output = ensureCleanEnding(output);
    output = ensureRequiredTokens(output, seed + 11);
    output = fitToXLimit(output, seed + 12);
    output = trimToMaxLength(output);
    output = ensureHashtagRange(output, seed + 6);
    output = ensureCleanEnding(output);
    output = fitToXLimit(output, seed + 13);

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        output = padTowardTargetLength(output, seed + 7);
        output = padToMinimumLength(output, seed + 8);
        output = ensureRequiredTokens(output, seed + 12);
        output = fitToXLimit(output, seed + 14);
        output = trimToMaxLength(output);
    }

    if (countHashtags(output) < MIN_HASHTAGS) {
        output = ensureHashtagRange(output, seed + 9);
    }

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room > 0) {
            const add = "high utility for daily workflows".slice(0, room).trim();
            output = `${output} ${add}`.replace(/\s+/g, " ").trim();
        }
    }

    for (let i = 0; i < 8 && getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH; i += 1) {
        const filler = pick([...MICRO_FILLERS, ...LENGTH_FILLERS], seed + 20 + i);
        if (!filler) break;
        const room = MAX_RAW_TWEET_LENGTH - output.length - 1;
        if (room <= 0) break;
        const add = filler.slice(0, room).trim();
        if (!add) break;
        output = `${output} ${add}`.replace(/\s+/g, " ").trim();
    }

    output = ensureRequiredTokens(output, seed + 13);
    output = ensureHashtagRange(output, seed + 14);
    output = ensureCleanEnding(output);
    output = fitToXLimit(output, seed + 15);
    output = trimToMaxLength(output);

    if (getCoreTweetLength(output) < MIN_BODY_CORE_LENGTH) {
        output = padToMinimumLength(output, seed + 15);
        output = ensureCleanEnding(output);
        output = fitToXLimit(output, seed + 16);
        output = trimToMaxLength(output);
    }

    output = formatStructuredTweet(output, seed + 30);
    output = fitToXLimit(output, seed + 31, TARGET_X_MAX);

    if (getXWeightedLength(output) < TARGET_X_MIN) {
        const nudge = pick(ENGAGEMENT_LINES, seed + 32) || "Strong utility for daily builders.";
        output = formatStructuredTweet(`${output} ${nudge}`, seed + 33);
        output = fitToXLimit(output, seed + 34, TARGET_X_MAX);
    }

    if (getXWeightedLength(output) > X_MAX_TWEET_LENGTH) {
        output = fitToXLimit(output, seed + 35, X_MAX_TWEET_LENGTH);
    }

    return ensureCleanEnding(output).trim();
}

function validateTweetText(text) {
    const value = typeof text === "string" ? text.trim() : "";
    const issues = [];

    if (!value) {
        issues.push("empty text");
        return issues;
    }

    const length = getCoreTweetLength(value);
    const rawLength = value.length;
    const xLength = getXWeightedLength(value);
    const hashtags = countHashtags(value);
    if (xLength < TARGET_X_MIN) issues.push(`too short X (${xLength})`);
    if (xLength > TARGET_X_MAX) issues.push(`too long X (${xLength})`);
    if (length < MIN_BODY_CORE_LENGTH) issues.push(`too short core (${length})`);
    if (length > MAX_TWEET_LENGTH) issues.push(`too long core (${length})`);
    if (rawLength > MAX_RAW_TWEET_LENGTH) issues.push(`too long raw (${rawLength})`);
    if (xLength > X_MAX_TWEET_LENGTH) issues.push(`exceeds hard X limit (${xLength})`);
    if (isNewsy(value)) issues.push("newsy framing");
    if (!ONE_WORD_PREFIX_RE.test(value)) issues.push("missing one-word prefix");
    if (!hasValidUrl(value)) issues.push("missing link");
    if (extractUrls(value).some((url) => !isLikelyValidUrlToken(url))) issues.push("broken link");
    if (countMentions(value) < 1) issues.push("missing account tag");
    if (!hasEmoji(value)) issues.push("missing emoji");
    if (hashtags < MIN_HASHTAGS) issues.push(`missing hashtags (${hashtags})`);
    if (hashtags > MAX_HASHTAGS) issues.push(`too many hashtags (${hashtags})`);

    const trimmedTail = value.replace(/[.!?]+$/g, "").trim();
    const completeEnding =
        /[.!?]$/.test(value) ||
        /#[a-z0-9_]+$/i.test(value) ||
        /@[a-z0-9_]+$/i.test(value) ||
        /(?:https?:\/\/\S+|www\.\S+)$/i.test(value);
    if (!completeEnding) issues.push("incomplete ending");
    if (FRAGMENT_END_RE.test(trimmedTail)) issues.push("truncated ending");

    return issues;
}

function normalizeTweets(rawTweets = []) {
    return rawTweets.slice(0, TARGET_TWEETS).map((tweet, index) => {
        const base = typeof tweet === "string" ? tweet : tweet?.text || "";
        return {
            text: hardenTweetText(base, index),
            sourceAge: typeof tweet === "object" ? tweet?.sourceAge || "Fresh" : "Fresh",
            imageUrl: typeof tweet === "object" ? tweet?.imageUrl : null,
        };
    });
}

function collectIssues(tweets = [], blockedTweets = []) {
    const issues = [];

    if (tweets.length !== TARGET_TWEETS) {
        issues.push(`returned ${tweets.length} tweets; expected ${TARGET_TWEETS}`);
    }

    tweets.forEach((tweet, index) => {
        const tweetIssues = validateTweetText(tweet.text);
        if (tweetIssues.length) {
            issues.push(`tweet ${index + 1}: ${tweetIssues.join(", ")} | "${tweet.text.slice(0, 120)}"`);
        }
    });

    for (let i = 0; i < tweets.length; i += 1) {
        for (let j = i + 1; j < tweets.length; j += 1) {
            if (isNearDuplicate(tweets[i].text, tweets[j].text)) {
                issues.push(`tweet ${i + 1} and tweet ${j + 1}: repetitive/too similar`);
            }
        }
    }

    tweets.forEach((tweet, index) => {
        const repeated = blockedTweets.find((previous) => isNearDuplicate(tweet.text, previous));
        if (repeated) {
            issues.push(`tweet ${index + 1}: repeats previous generated content | "${tweet.text.slice(0, 120)}"`);
        }
    });

    return issues;
}

function detectHandle(name = "") {
    const value = name.toLowerCase();
    if (value.includes("openai") || value.includes("chatgpt")) return "@OpenAI";
    if (value.includes("claude") || value.includes("anthropic")) return "@AnthropicAI";
    if (value.includes("gemini") || value.includes("google")) return "@GoogleAI";
    if (value.includes("cursor")) return "@cursor_ai";
    if (value.includes("perplexity")) return "@perplexity_ai";
    if (value.includes("runway")) return "@runwayml";
    if (value.includes("midjourney")) return "@midjourney";
    if (value.includes("suno")) return "@suno_ai_";
    if (value.includes("elevenlabs")) return "@elevenlabsio";
    if (value.includes("hugging face")) return "@huggingface";
    if (value.includes("vercel") || value.includes("v0")) return "@vercel";
    if (value.includes("copilot") || value.includes("github")) return "@GitHubCopilot";
    // Deep tool handles
    if (value.includes("devin") || value.includes("cognition")) return "@cognition_labs";
    if (value.includes("lovable")) return "@lovable_dev";
    if (value.includes("bolt") || value.includes("stackblitz")) return "@stackblitz";
    if (value.includes("windsurf") || value.includes("codeium")) return "@windsurf_ai";
    if (value.includes("deepseek")) return "@deepseek_ai";
    if (value.includes("groq")) return "@GroqInc";
    if (value.includes("together")) return "@togethercompute";
    if (value.includes("replicate")) return "@replicate";
    if (value.includes("fal")) return "@fal_ai";
    if (value.includes("langchain")) return "@LangChainAI";
    if (value.includes("crewai") || value.includes("crew")) return "@crewAIInc";
    if (value.includes("heygen")) return "@HeyGen_Official";
    if (value.includes("descript")) return "@DescriptApp";
    if (value.includes("pika")) return "@pika_labs";
    if (value.includes("sora")) return "@OpenAI";
    if (value.includes("luma")) return "@LumaLabsAI";
    if (value.includes("ideogram")) return "@ideogram_ai";
    if (value.includes("gamma")) return "@GammaAI";
    if (value.includes("mistral")) return "@MistralAI";
    if (value.includes("canva")) return "@canva";
    if (value.includes("notion")) return "@NotionHQ";
    if (value.includes("replit")) return "@Replit";
    if (value.includes("synthesia")) return "@synthesiaIO";
    if (value.includes("jasper")) return "@heyjasperai";
    if (value.includes("leonardo")) return "@LeonardoAi_";
    if (value.includes("composio")) return "@ComposioHQ";
    if (value.includes("tavily")) return "@tavily_ai";
    if (value.includes("exa")) return "@exa_labs";
    if (value.includes("firecrawl")) return "@firecrawl_dev";
    if (value.includes("raycast")) return "@raycastapp";
    if (value.includes("warp")) return "@warpdotdev";
    if (value.includes("arc")) return "@arcinternet";
    if (value.includes("obsidian")) return "@obsdmd";
    if (value.includes("jules")) return "@Google";
    if (value.includes("chrome") || value.includes("mcp")) return "@GoogleChrome";
    if (value.includes("poolside")) return "@poolsideai";
    if (value.includes("augment")) return "@AugmentCode";
    if (value.includes("meta") || value.includes("llama")) return "@AIatMeta";
    if (value.includes("cohere") || value.includes("command")) return "@cohere";
    if (value.includes("stability")) return "@StabilityAI";
    if (value.includes("mem0")) return null; // No handle, use hashtag
    if (value.includes("dify")) return null; // Use hashtag
    if (value.includes("coze")) return null; // Use hashtag
    if (value.includes("cline")) return null; // Open source, use hashtag
    if (value.includes("aider")) return null; // Open source, use hashtag
    if (value.includes("kling")) return null; // Chinese tool, use hashtag
    if (value.includes("harpa")) return null; // Use hashtag
    if (value.includes("merlin")) return null; // Use hashtag
    if (value.includes("monica")) return null; // Use hashtag
    if (value.includes("superwhisper")) return null; // Use hashtag
    if (value.includes("granola")) return null; // Use hashtag
    return null;
}

function buildSignalToolOptions(signals = []) {
    return signals.slice(0, 20).map((signal, index) => {
        const title = cleanSignalTitle(signal?.title || "");
        const name = title.split(/[|:,\-]/)[0]?.trim() || `AI Tool ${index + 1}`;
        const handle = detectHandle(name);

        // If no handle detected, create hashtag from tool name
        let hashtag = null;
        if (!handle) {
            // Create hashtag from tool name: remove special chars, capitalize words
            const cleanName = name
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');
            if (cleanName.length >= 3) {
                hashtag = `#${cleanName.replace(/\s+/g, '')}`;
            }
        }

        return {
            name,
            handle,
            hashtag, // Store fallback hashtag
            link: signal?.url || "https://producthunt.com",
            audience: "builders and creators",
            useCase: "test a practical workflow and share results quickly",
            capability: "unlock a fast, usable workflow without heavy setup",
            sourceAge: normalizeSourceAge(signal?.timeAgo, (index % 12) + 1),
        };
    });
}

function pick(arr, index) {
    if (!arr.length) return "";
    return arr[index % arr.length];
}

function buildEmergencyTweet(tool, seed = 0) {
    const hashtagA = pick(DEFAULT_HASHTAGS, seed) || DEFAULT_HASHTAGS[0];
    const hashtagB = pick(DEFAULT_HASHTAGS, seed + 1) || DEFAULT_HASHTAGS[1] || DEFAULT_HASHTAGS[0];
    const uniqueTags = [hashtagA, hashtagB].filter((tag, idx, arr) => arr.indexOf(tag) === idx).join(" ");

    const base = `${tool.name}${tool.handle ? ` ${tool.handle}` : " @OpenAI"} helps ${tool.audience} with a practical edge: ${tool.capability}. Best use-case: ${tool.useCase}. ${tool.link} ${uniqueTags}`;
    return {
        text: hardenTweetText(base, seed + 700),
        sourceAge: normalizeSourceAge(tool?.sourceAge, ((seed % 12) + 1)),
        imageUrl: null,
    };
}

function buildFallbackTweet(tool, index, entropy = 0) {
    const openers = [
        "\uD83D\uDD25",
        "\uD83D\uDE80",
        "\uD83E\uDD16",
        "\uD83D\uDCA1",
        "\uD83C\uDFAF",
        "\u26A1",
        "\u2728",
        "\uD83D\uDD0D",
        "\uD83D\uDE4C",
        "\uD83D\uDEE0\uFE0F",
    ];

    const proofLines = [
        "I tested it in a real workflow and it felt production-ready.",
        "Hands-on run today: output quality was surprisingly strong.",
        "Used it on a live task and the speed gain was obvious.",
        "Tried a real use-case and it removed manual busywork fast.",
    ];

    const hashtags = [pick(DEFAULT_HASHTAGS, index + entropy), pick(DEFAULT_HASHTAGS, index + entropy + 1)]
        .filter(Boolean)
        .filter((value, idx, self) => self.indexOf(value) === idx)
        .slice(0, 2)
        .join(" ");

    const intro = `${pick(openers, index + entropy)} ${tool.name}${tool.handle ? ` ${tool.handle}` : ""}.`;
    const body = `It helps ${tool.audience} ${tool.useCase}, and the core win is simple: ${tool.capability}.`;
    const proof = pick(proofLines, index + entropy);
    const hype = pick(ENGAGEMENT_LINES, index + entropy);
    const linkLine = `${tool.link}`;

    return {
        text: hardenTweetText(`${intro} ${linkLine} ${body} ${proof} ${hype} ${hashtags}`, index + entropy),
        sourceAge: normalizeSourceAge(tool?.sourceAge, (index % 12) + 1),
        imageUrl: null, // Will be generated later
    };
}

function buildLocalBackupTweets({ blockedTweets = [], existing = [], signals = [], nowIso = "" }) {
    const signalTools = buildSignalToolOptions(signals);
    const toolPool = [...signalTools, ...TOOL_LIBRARY];
    const output = [];
    const usedTexts = dedupeTexts([...blockedTweets, ...existing.map((item) => item.text)]);
    const entropy = Number((nowIso || "").replace(/\D/g, "").slice(-6)) || Date.now();

    for (let i = 0; i < toolPool.length * 3 && output.length < TARGET_TWEETS; i += 1) {
        const tool = toolPool[i % toolPool.length];
        const tweetObj = buildFallbackTweet(tool, i, entropy);
        const issues = validateTweetText(tweetObj.text);
        const duplicateWithOutput = output.some((item) => isNearDuplicate(item.text, tweetObj.text));
        const duplicateWithHistory = usedTexts.some((item) => isNearDuplicate(item, tweetObj.text));

        if (!issues.length && !duplicateWithOutput && !duplicateWithHistory) {
            output.push({
                text: tweetObj.text,
                sourceAge: normalizeSourceAge(tool?.sourceAge, (i % 12) + 1),
                imageUrl: tweetObj.imageUrl,
            });
        }
    }

    for (let i = 0; output.length < TARGET_TWEETS && i < 60; i += 1) {
        const tool = toolPool[(i + entropy) % toolPool.length] || TOOL_LIBRARY[i % TOOL_LIBRARY.length];
        const tweetObj = buildFallbackTweet(tool, i + 99, entropy);
        const duplicateWithOutput = output.some((item) => isNearDuplicate(item.text, tweetObj.text));
        const duplicateWithHistory = usedTexts.some((item) => isNearDuplicate(item, tweetObj.text));
        if (!duplicateWithOutput && !duplicateWithHistory && !validateTweetText(tweetObj.text).length) {
            output.push({
                text: tweetObj.text,
                sourceAge: normalizeSourceAge(tool?.sourceAge, ((i + 4) % 12) + 1),
                imageUrl: tweetObj.imageUrl,
            });
        }
    }

    return output.slice(0, TARGET_TWEETS);
}

function ensureExactTenTweets({ candidateTweets = [], blockedTweets = [], signals = [], nowIso = "" }) {
    const accepted = [];
    const historical = dedupeTexts(blockedTweets);

    const tryAdd = (tweet) => {
        if (!tweet) return;
        const baseText = typeof tweet === "string" ? tweet : tweet.text;
        const text = hardenTweetText(baseText, accepted.length + historical.length);
        const issues = validateTweetText(text);
        const duplicateWithAccepted = accepted.some((item) => isNearDuplicate(item.text, text));
        const duplicateWithHistory = historical.some((item) => isNearDuplicate(item, text));
        if (!issues.length && !duplicateWithAccepted && !duplicateWithHistory) {
            accepted.push({
                text,
                sourceAge: normalizeSourceAge(
                    typeof tweet === "object" ? tweet.sourceAge : "",
                    (accepted.length % 12) + 1
                ),
                imageUrl: typeof tweet === "object" ? tweet.imageUrl : null,
            });
        }
    };

    candidateTweets.forEach(tryAdd);

    if (accepted.length < TARGET_TWEETS && signals.length > 0) {
        const signalBasedTweets = buildSignalBasedTweets(signals, historical, accepted.length);
        signalBasedTweets.forEach(tryAdd);
    }

    if (accepted.length < TARGET_TWEETS && signals.length > 0) {
        const backupTweets = buildSmartBackupTweets(signals, historical, accepted.length);
        backupTweets.forEach(tryAdd);
    }

    if (accepted.length < TARGET_TWEETS) {
        const localBackupTweets = buildLocalBackupTweets({
            blockedTweets: historical,
            existing: accepted,
            signals,
            nowIso,
        });
        localBackupTweets.forEach(tryAdd);
    }

    return accepted.slice(0, TARGET_TWEETS);
}

function buildSmartBackupTweets(signals, blockedTweets, startSeed = 0) {
    const tweets = [];
    const now = Date.now() / 1000;
    const last24h = now - 86400;

    const usedTools = new Set();
    blockedTweets.forEach(t => {
        const match = t.match(/^([A-Z][A-Za-z]+):/);
        if (match) usedTools.add(match[1].toLowerCase());
    });

    const knownTools = ["chatgpt", "claude", "gemini", "cursor", "perplexity", "midjourney", "suno", "elevenlabs", "runway", "huggingface", "vercel", "replit", "copilot", "mistral", "anthropic", "openai", "google", "jules", "devin", "lovable", "bolt", "windsurf", "cline", "aider", "deepseek", "groq", "langchain", "crewai", "heygen", "descript", "pika", "kling", "luma", "sora", "ideogram", "gamma", "mem0", "composio", "tavily", "exa", "firecrawl", "harpa", "merlin", "monica", "raycast", "warp", "obsidian", "synthesia", "jasper", "notion", "leonardo", "canva", "mcp", "chrome", "poolside", "augment", "openhands", "stability", "cohere", "replicate", "fal"];

    const knownHandles = {
        "chatgpt": "@OpenAI",
        "openai": "@OpenAI",
        "claude": "@AnthropicAI",
        "anthropic": "@AnthropicAI",
        "gemini": "@GoogleAI",
        "google": "@GoogleAI",
        "cursor": "@cursor_ai",
        "perplexity": "@perplexity_ai",
        "midjourney": "@midjourney",
        "runway": "@runwayml",
        "suno": "@suno_ai_",
        "elevenlabs": "@elevenlabsio",
        "huggingface": "@huggingface",
        "vercel": "@vercel",
        "replit": "@Replit",
        "copilot": "@GitHubCopilot",
        "mistral": "@MistralAI",
        "meta": "@AIatMeta",
        "stability": "@StabilityAI",
        // Deep tools
        "jules": "@Google",
        "devin": "@cognition_labs",
        "lovable": "@lovable_dev",
        "bolt": "@stackblitz",
        "windsurf": "@windsurf_ai",
        "deepseek": "@deepseek_ai",
        "groq": "@GroqInc",
        "langchain": "@LangChainAI",
        "crewai": "@crewAIInc",
        "heygen": "@HeyGen_Official",
        "descript": "@DescriptApp",
        "pika": "@pika_labs",
        "luma": "@LumaLabsAI",
        "ideogram": "@ideogram_ai",
        "gamma": "@GammaAI",
        "composio": "@ComposioHQ",
        "tavily": "@tavily_ai",
        "exa": "@exa_labs",
        "firecrawl": "@firecrawl_dev",
        "raycast": "@raycastapp",
        "warp": "@warpdotdev",
        "obsidian": "@obsdmd",
        "synthesia": "@synthesiaIO",
        "jasper": "@heyjasperai",
        "notion": "@NotionHQ",
        "leonardo": "@LeonardoAi_",
        "canva": "@canva",
        "replicate": "@replicate",
        "fal": "@fal_ai",
        "poolside": "@poolsideai",
        "augment": "@AugmentCode",
        "cohere": "@cohere",
        "sora": "@OpenAI",
        "chrome": "@GoogleChrome",
        "mcp": "@GoogleChrome",
    };

    signals.forEach((signal, idx) => {
        const title = signal.title || "";
        const name = title.split(/[|:,\-]/)[0]?.trim().toLowerCase() || "";

        const isKnownTool = knownTools.some(k => name.includes(k));

        if (isKnownTool) {
            const hasNewIndicator = /new|update|v\d|version|release|feature|launch/i.test(title);
            if (!hasNewIndicator) return;
        }

        const toolKey = title.split(/[|:,\-]/)[0]?.trim().toLowerCase() || "newtool";
        if (usedTools.has(toolKey)) return;
        usedTools.add(toolKey);

        let mention = "";
        for (const [key, handle] of Object.entries(knownHandles)) {
            if (name.includes(key)) {
                mention = handle;
                break;
            }
        }

        const hashtags = getContentRelevantHashtags(title, startSeed + idx);
        const url = signal.url || "https://github.com";
        const hook = pick(EXPERT_HOOK_WORDS, startSeed + idx) || "FRESH";

        const toolName = title.split(/[|:,\-]/)[0]?.trim() || "New Tool";
        const body = title.length > 80 ? title.slice(0, 80) + "..." : title;

        let text = `${hook}: 🚀 ${body} ${url} ${hashtags.slice(0, 2).join(" ")}`;
        if (mention) {
            text = `${text} ${mention}`;
        }

        tweets.push({
            text: hardenTweetText(text, startSeed + idx + 200),
            sourceAge: signal.timeAgo || "fresh",
            imageUrl: null,
        });
    });

    return tweets;
}

function buildSignalBasedTweets(signals, blockedTweets, startSeed = 0) {
    const tweets = [];
    const now = Date.now() / 1000;
    const last24h = now - 86400;

    const freshSignals = signals
        .filter(s => s.timestamp >= last24h)
        .slice(0, 15);

    const usedTools = new Set();
    blockedTweets.forEach(t => {
        const match = t.match(/^([A-Z][A-Za-z]+):/);
        if (match) usedTools.add(match[1].toLowerCase());
    });

    freshSignals.forEach((signal, idx) => {
        const toolName = signal.title?.split(/[|:,\-]/)[0]?.trim() || "NewTool";
        const toolKey = toolName.toLowerCase();
        if (usedTools.has(toolKey)) return;
        usedTools.add(toolKey);

        const hashtags = getContentRelevantHashtags(signal.title || "", startSeed + idx);
        const url = signal.url || "https://github.com";
        const hook = pick(EXPERT_HOOK_WORDS, startSeed + idx) || "FRESH";

        const body = signal.title?.slice(0, 100) || "New AI tool discovered";
        const text = `${hook}: 🚀 ${body} ${url} ${hashtags.slice(0, 2).join(" ")}`;

        tweets.push({
            text: hardenTweetText(text, startSeed + idx + 100),
            sourceAge: signal.timeAgo || "fresh",
            imageUrl: null,
        });
    });

    return tweets;
}

async function requestTweets({
    endpoint,
    nowIso,
    toolSignalContext,
    historyPrompt,
    retryFeedback,
}) {
    const prompt = [
        SYSTEM_PROMPT,
        "",
        `NOW_UTC: ${nowIso}`,
        "",
        "LAST 24H AI TOOL SIGNALS:",
        toolSignalContext,
        historyPrompt,
        "",
        "═══════════════════════════════════════",
        "CRITICAL TASK INSTRUCTIONS:",
        "═══════════════════════════════════════",
        "",
        `You MUST generate ${TARGET_TWEETS} tweets. Each tweet about a DIFFERENT tool from the signal list.`,
        "",
        "🔍 DEEP RESEARCH PER TOOL:",
        "- Look at the description and URL in the signal - understand what the tool ACTUALLY does",
        "- For GitHub repos: read the description, understand the use case",
        "- For ProductHunt: understand the target audience from the tagline",
        "- Be SPECIFIC: 'generates TypeScript types from OpenAPI specs' NOT 'useful tool'",
        "",
        "📝 COMPLETENESS - EVERY TWEET MUST BE COMPLETE:",
        "- Full sentences that end properly (period, hashtag, URL, or @handle)",
        "- NEVER cut off mid-sentence or mid-word",
        "- If a tweet is too long, rewrite it shorter instead of truncating",
        `- Each tweet must be ${TARGET_X_MIN}-${TARGET_X_MAX} X-weighted chars`,
        `- URLs count as ${X_URL_LENGTH} chars in X-weighted count`,
        `- NEVER exceed ${X_MAX_TWEET_LENGTH} chars`,
        "",
        "🏷️ HASHTAG RESEARCH:",
        "- For MCP servers → use #MCP",
        "- For coding agents → use #CodingAgent or #AIAgent",
        "- For Chrome/browser tools → use #ChromeExt or #BrowserAI",
        "- For app builders → use #AppBuilder or #NoCode",
        "- Research the specific category and use RELEVANT hashtags",
        "- Use 2 hashtags per tweet, relevant to the specific tool",
        "",
        "👤 ACCOUNT TAGGING:",
        "- Check if the tool/project has a known Twitter handle",
        "- Google/Chrome tools → @GoogleChrome or @Google",
        "- OpenAI tools → @OpenAI",
        "- Independent tools → find their actual handle or use a category hashtag",
        "- Each tweet needs at least 1 @mention",
        "",
        "❌ ABSOLUTELY FORBIDDEN:",
        "- Generic descriptions ('great tool', 'check this out', 'useful AI')",
        "- Mentioning source ('on GitHub', 'Show HN', 'ProductHunt launched')",
        "- Old tools without NEW updates (no ChatGPT/Claude/Midjourney unless NEW feature)",
        "- Repeating the same tool in multiple tweets",
        "- Incomplete/cut-off sentences",
        "- Making up tool names not in the signal list",
        "- Missing CTA at the end — every tweet MUST ask a question or prompt engagement",
        "",
        "🎣 USE THESE HOOKS (different one per tweet):",
        "🔥 JUST LAUNCHED: | 🚀 This went viral: | 👀 SPOTTED: | 🤯 NEW: | 💡 AI builders: | 📈 Trending: | ⚡ BREAKING: | 🎯 HIDDEN GEM:",
        "",
        "💬 EVERY TWEET MUST END WITH A CTA (pick one):",
        "- 'Which one would you try first? 👇'",
        "- 'Drop a 🔥 if you'd use this'",
        "- 'Thoughts? 👇'",
        "- 'Worth the hype? Let me know 👇'",
        "- 'Rate this 1-10 👇'",
        "- 'This + your current stack = 🔥 or 💀?'",
        "- 'Who's testing this today? 🙋'",
        "",
        "📊 PRIORITY: LLM/model releases > viral GitHub repos > ProductHunt top launches > MCP servers > general AI tools",
        "",
        retryFeedback ? `⚠️ PREVIOUS ATTEMPT HAD ISSUES — FIX THESE:\n${retryFeedback}\n` : "",
        `Current UTC time: ${nowIso}`,
        "",
        `Return ONLY valid JSON with exactly ${TARGET_TWEETS} tweets. Each must have: HOOK + specifics + URL + @handle + hashtags + CTA.`,
    ]
        .filter(Boolean)
        .join("\n");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 8192,
                    topP: 0.95,
                    topK: 40,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text)
            .filter(Boolean)
            .join("");

        if (!content) {
            throw new Error("No content in Gemini response");
        }

        return parseTweetsFromContent(content);
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function generateTweets(options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing required environment variable: GEMINI_API_KEY");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    const nowIso = new Date().toISOString();

    let signals = [];
    let toolSignalContext = `24h AI tool pool fallback: ${TOOL_FALLBACK_CONTEXT}.`;
    let signalsError = null;

    try {
        signals = await getTrendingNews();
        if (signals.length === 0) {
            signalsError = "No fresh AI tool signals found in last 24h. Please try again later when new tools launch.";
        } else {
            toolSignalContext = buildToolSignalContext(signals);
        }
    } catch (error) {
        console.error("Tool signal fetch failed:", error);
        signalsError = error.message;
    }

    if (signalsError) {
        throw new Error(`Cannot generate tweets: ${signalsError}. Check back later for fresh AI tool launches!`);
    }

    const avoidTweets = dedupeTexts(Array.isArray(options?.avoidTweets) ? options.avoidTweets : []);
    let historyPrompt = "";
    let blockedTweets = [...avoidTweets];
    try {
        const [previousTweets, runTweets] = await Promise.all([
            getLastDaysTweets(3),
            getRecentRunTweets(24, 180),
        ]);
        blockedTweets = dedupeTexts([...avoidTweets, ...runTweets, ...previousTweets]);
        historyPrompt = buildHistoryPrompt(blockedTweets, HISTORY_TWEET_LIMIT);
    } catch (error) {
        console.error("History fetch failed:", error);
        historyPrompt = buildHistoryPrompt(avoidTweets, HISTORY_TWEET_LIMIT);
    }

    let retryFeedback = "";
    let lastCandidate = [];

    for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
        try {
            const rawTweets = await requestTweets({
                endpoint,
                nowIso,
                toolSignalContext,
                historyPrompt,
                retryFeedback,
            });

            const candidateTweets = normalizeTweets(rawTweets);
            lastCandidate = candidateTweets;
            const issues = collectIssues(candidateTweets, blockedTweets);

            if (!issues.length) {
                let tweets = ensureExactTenTweets({
                    candidateTweets,
                    blockedTweets,
                    signals,
                    nowIso,
                });
                return tweets;
            }

            retryFeedback = issues.join("\n");
            console.warn(`[Gemini validation] attempt ${attempt} failed:\n${retryFeedback}`);
        } catch (error) {
            retryFeedback = `Attempt ${attempt} failed: ${error.message}`;
            console.error("Gemini attempt error:", error);
        }
    }

    let tweets = ensureExactTenTweets({
        candidateTweets: lastCandidate,
        blockedTweets,
        signals,
        nowIso,
    });

    return tweets;
}
