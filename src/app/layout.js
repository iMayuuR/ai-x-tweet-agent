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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
  themeColor: "#060a16",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="X AI Tweet" />
        <meta name="application-name" content="X AI Tweet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
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
