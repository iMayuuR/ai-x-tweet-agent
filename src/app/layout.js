import "./globals.css";

export const metadata = {
  title: "AI Daily Tweets | AI-Powered Tweet Generator",
  description:
    "Get 10 curated AI tweets generated daily by AI. Copy or post directly to X (Twitter). Stay ahead of AI trends, tools, and insights.",
  keywords: ["AI tweets", "Twitter AI", "AI content", "daily tweets", "AI tools", "AI trends"],
  authors: [{ name: "AI Tweet Agent" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "AI Daily Tweets",
    description: "10 curated AI tweets, freshly generated every day.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI Daily Tweets",
    description: "10 curated AI tweets, freshly generated every day.",
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
        <link rel="apple-touch-icon" href="/icon-192.png" />
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
