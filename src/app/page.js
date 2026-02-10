"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import TweetCard from "@/components/TweetCard";

export default function Home() {
  const [tweets, setTweets] = useState([]);
  const [tweetedStatus, setTweetedStatus] = useState([]);
  const [date, setDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);

  // History state
  const [historyDates, setHistoryDates] = useState([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);

  // Load available history dates
  async function fetchHistoryDates() {
    try {
      const res = await fetch("/api/daily?list=true");
      const json = await res.json();
      if (json.success) {
        setHistoryDates(json.dates || []);
      }
    } catch (e) {
      console.error("Failed to fetch history dates", e);
    }
  }

  // Load cached tweets (for today or specific date)
  async function fetchCached(targetDate = null) {
    setLoading(true);
    setError(null);
    try {
      const url = targetDate ? `/api/daily?date=${targetDate}` : "/api/daily";
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load tweets");
      }

      if (json.data && json.data.tweets) {
        setTweets(json.data.tweets);
        setTweetedStatus(json.data.tweetedStatus || []);
        setDate(json.data.date);
        setGeneratedAt(json.data.generatedAt);
        setIsEmpty(false);
      } else {
        // If history date empty, it means no data (shouldn't happen if list is correct)
        // If today empty, show generate button
        if (targetDate) {
          setError("No data found for this date.");
          setTweets([]);
        } else {
          setIsEmpty(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle date selection from header
  function handleDateSelect(newDate) {
    setSelectedHistoryDate(newDate); // newDate is YYYY-MM-DD or null
    fetchCached(newDate);
  }

  // Generate new tweets (explicit button press)
  async function handleGenerate() {
    // Prevent generating if viewing history
    if (selectedHistoryDate) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "client" }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate tweets");
      }

      setTweets(json.data.tweets);
      setTweetedStatus(json.data.tweetedStatus || []);
      setDate(json.data.date);
      setGeneratedAt(json.data.generatedAt);
      setIsEmpty(false);

      // Refresh history list as today might be new
      fetchHistoryDates();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    fetchCached();
    fetchHistoryDates();
  }, []);

  function handleMarkTweeted(newStatus) {
    setTweetedStatus(newStatus);
  }

  const tweetedCount = tweetedStatus.filter(Boolean).length;
  const pendingCount = tweets.length - tweetedCount;

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <>
      <Header
        date={date}
        onLogout={handleLogout}
        historyDates={historyDates}
        selectedDate={selectedHistoryDate}
        onDateSelect={handleDateSelect}
      />

      <main className="main-content">
        {/* Loading cached tweets */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div>
              <p className="loading-text">Loading tweets...</p>
            </div>
          </div>
        )}

        {/* Empty state — no cached tweets, show Generate button */}
        {!loading && isEmpty && !generating && !error && (
          <div className="empty-container fade-in">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </div>
            <h2 className="empty-title">No tweets yet</h2>
            <p className="empty-subtitle">Click below to generate 10 fresh AI tweets based on today&apos;s latest news</p>
            <button className="btn btn-generate" onClick={handleGenerate}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate Tweets
            </button>
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div>
              <p className="loading-text">Generating today&apos;s AI tweets...</p>
              <p className="loading-subtext">Searching latest AI news with Gemini</p>
            </div>
            <div className="tweets-grid" style={{ width: "100%", marginTop: "16px" }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && !generating && (
          <div className="error-container">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-message">{error}</p>
            <button className="btn btn-retry" onClick={handleGenerate}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Try Again
            </button>
          </div>
        )}

        {/* Tweets loaded */}
        {!loading && !generating && !error && tweets.length > 0 && (
          <>
            {/* Stats bar + Generate More */}
            <div className="stats-bar fade-in">
              <div className="stat-item">
                <span className="stat-value">{pendingCount}</span> pending
              </div>
              <div className="stat-item">
                <span className="stat-value stat-tweeted">{tweetedCount}</span> tweeted
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Math.round(
                    tweets.reduce((sum, t) => sum + (typeof t === "string" ? t.length : t.text.length), 0) / tweets.length
                  )}
                </span> avg chars
              </div>
              {generatedAt && (
                <div className="stat-item">
                  <span className="stat-value">
                    {new Date(generatedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              )}
              <button className="btn btn-generate-more" onClick={handleGenerate} disabled={generating}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Generate More
              </button>
            </div>

            {/* Tweet cards */}
            <div className="tweets-grid">
              {tweets.map((tweet, index) => (
                <TweetCard
                  key={index}
                  tweet={tweet}
                  index={index}
                  date={date}
                  isTweeted={tweetedStatus[index] || false}
                  onMarkTweeted={handleMarkTweeted}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
