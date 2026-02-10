"use client";

import { useState } from "react";

export default function TweetCard({ tweet, index, date, isTweeted, onMarkTweeted }) {
    const [copied, setCopied] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    const tweetText = typeof tweet === "string" ? tweet : tweet.text;
    const imageUrl = typeof tweet === "string" ? null : tweet.imageUrl;
    const charCount = tweetText.length;
    const isWarning = charCount > 260;

    // Highlight hashtags and mentions
    function renderTweetText(text) {
        const parts = text.split(/(#\w+|@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith("#")) return <span key={i} className="hashtag">{part}</span>;
            if (part.startsWith("@")) return <span key={i} className="mention">{part}</span>;
            return part;
        });
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(tweetText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const el = document.createElement("textarea");
            el.value = tweetText;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    function handleTweet() {
        const encoded = encodeURIComponent(tweetText);
        window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank", "noopener,noreferrer");
    }

    async function handleDownloadImage() {
        if (!imageUrl) return;
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tweet-${index + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            window.open(imageUrl, "_blank");
        }
    }

    async function handleMark() {
        try {
            const res = await fetch("/api/mark", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, index }),
            });
            const data = await res.json();
            if (data.success && onMarkTweeted) {
                onMarkTweeted(data.tweetedStatus);
            }
        } catch (err) {
            console.error("Failed to mark tweet:", err);
        }
    }

    return (
        <div className={`tweet-card fade-in-up stagger-${index + 1} ${isTweeted ? "tweeted" : ""}`}>
            {/* Image */}
            {imageUrl && !imgError && (
                <div className={`tweet-image-wrapper ${imgLoaded ? "loaded" : ""}`}>
                    <img
                        src={imageUrl}
                        alt="AI generated illustration"
                        className="tweet-image"
                        loading="lazy"
                        onLoad={() => setImgLoaded(true)}
                        onError={() => setImgError(true)}
                    />
                    {!imgLoaded && <div className="tweet-image-skeleton" />}
                    {imgLoaded && (
                        <button className="btn btn-download-img" onClick={handleDownloadImage} aria-label="Download image">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                    )}
                </div>
            )}

            <div className="tweet-card-header">
                <div className="tweet-number">{index + 1}</div>
                <div className="tweet-header-right">
                    {isTweeted && <span className="tweeted-badge">✓ Tweeted</span>}
                    <span className={`tweet-char-count ${isWarning ? "warning" : ""}`}>
                        {charCount}/280
                    </span>
                </div>
            </div>

            <p className="tweet-text">{renderTweetText(tweetText)}</p>

            <div className="tweet-actions">
                <button
                    className={`btn btn-copy ${copied ? "copied" : ""}`}
                    onClick={handleCopy}
                    aria-label="Copy tweet"
                >
                    {copied ? (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            Copy
                        </>
                    )}
                </button>

                <button className="btn btn-tweet" onClick={handleTweet} aria-label="Tweet on X">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    Tweet
                </button>

                <button
                    className={`btn btn-mark ${isTweeted ? "marked" : ""}`}
                    onClick={handleMark}
                    aria-label={isTweeted ? "Unmark as tweeted" : "Mark as tweeted"}
                >
                    {isTweeted ? (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Done
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="16 12 12 8 8 12" /><line x1="12" y1="16" x2="12" y2="8" /></svg>
                            Mark
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
