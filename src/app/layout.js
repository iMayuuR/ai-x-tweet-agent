import "./globals.css";

export const metadata = {
  title: "AI Tools Explorer | Daily Viral Tweets Generator",
  description:
    "Discover the latest AI tools, launches, and updates. Generate 10 viral, ready-to-post tweets daily. Powered by Gemini 2.5 & Multi-Source News Engine (Product Hunt, GitHub, Reddit).",
  keywords: [
    "AI tweets",
    "AI tools",
    "Gemini 2.5",
    "AI agents",
    "Product Hunt trends",
    "GitHub AI",
    "Twitter AI",
    "daily content generator",
    "automated social media",
  ],
  authors: [{ name: "AI Tools Explorer" }],
  creator: "AI Tools Explorer",
  publisher: "AI Tools Explorer",
  alternates: {
    canonical: "https://ai-x-tweet-agent.vercel.app",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "AI Tools Explorer | Daily Viral Tweets",
    description: "Generate 10 practical, viral AI tweets daily. Track launches from Product Hunt, GitHub, and more.",
    url: "https://ai-x-tweet-agent.vercel.app",
    siteName: "AI Tools Explorer",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Tools Explorer",
    description: "Daily AI tool discoveries and viral tweet generator. Powered by Gemini.",
    creator: "@AIToolsExplorer",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Tweets" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body suppressHydrationWarning>
        <div className="bg-grid" />
        <div className="app-container">
          {children}
          <footer className="footer">
            <p className="footer-text">
              Built with ❤️ using Next.js &amp; Google Gemini
              <br />
              Tweets are AI-generated. Review before posting.
            </p>
          </footer>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', () => {
                                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                                });
                            }
                        `,
          }}
        />
      </body>
    </html>
  );
}
