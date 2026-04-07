import "./globals.css";

export const metadata = {
  title: "AI Social Agent | Multi-Platform Posting",
  description:
    "Generate AI-powered posts and publish to X, Instagram, and Threads. Daily viral content powered by Gemini with multi-platform sharing.",
  keywords: [
    "AI social media",
    "multi-platform posting",
    "AI content generator",
    "Twitter automation",
    "Instagram sharing",
    "Threads posts",
    "Gemini AI",
    "automated social media",
    "daily content",
    "AI tools",
  ],
  authors: [{ name: "AI Social Agent" }],
  creator: "AI Social Agent",
  publisher: "AI Social Agent",
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
    title: "AI Social Agent | Multi-Platform Social Media Tool",
    description: "Generate AI-powered posts and publish to X, Instagram, Threads. Daily content powered by Gemini.",
    url: "https://ai-x-tweet-agent.vercel.app",
    siteName: "AI Social Agent",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Social Agent",
    description: "Multi-platform social media posting powered by AI. Generate and post to X, Instagram, Threads.",
    creator: "@AISocialAgent",
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
        <meta name="apple-mobile-web-app-title" content="AI Social Agent" />
        <meta name="application-name" content="AI Social Agent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0a0f" />
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
              <br className="hidden sm:block" />
              Multi-platform posting powered by AI • Review before posting
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
