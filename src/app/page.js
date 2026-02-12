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
  const [savedRuns, setSavedRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");

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

  async function fetchSavedRuns() {
    try {
      const res = await fetch("/api/runs?list=true");
      const json = await res.json();
      if (json.success) {
        setSavedRuns(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch saved runs", e);
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
        const tweetItems = json.data.tweets;
        setTweets(tweetItems);
        setTweetedStatus(
          Array.isArray(tweetItems)
            ? tweetItems.map((t) => Boolean(typeof t === "object" && t?.posted))
            : []
        );
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
    setSelectedRunId("");
    setSelectedHistoryDate(newDate); // newDate is YYYY-MM-DD or null
    fetchCached(newDate);
  }

  async function handleRunSelect(runId) {
    setSelectedRunId(runId || "");
    if (!runId) {
      fetchCached(selectedHistoryDate || null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs?id=${encodeURIComponent(runId)}`);
      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Failed to load saved run");
      }

      const run = json.data;
      const tweetItems = run.tweets || [];
      setTweets(tweetItems);
      setTweetedStatus(
        Array.isArray(tweetItems)
          ? tweetItems.map((t) => Boolean(typeof t === "object" && t?.posted))
          : []
      );
      setDate(run.date || null);
      setGeneratedAt(run.generatedAt || null);
      setIsEmpty(false);
      setSelectedHistoryDate(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Generate new tweets (explicit button press)
  async function handleGenerate() {
    // Prevent generating if viewing history
    if (selectedHistoryDate) return;

    setGenerating(true);
    setError(null);
    try {
      const avoidTweets = tweets
        .map((t) => (typeof t === "string" ? t : t?.text))
        .filter(Boolean);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "client", avoidTweets }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate tweets");
      }

      const tweetItems = json.data.tweets;
      setTweets(tweetItems);
      setTweetedStatus(
        Array.isArray(tweetItems)
          ? tweetItems.map((t) => Boolean(typeof t === "object" && t?.posted))
          : []
      );
      setDate(json.data.date);
      setGeneratedAt(json.data.generatedAt);
      setIsEmpty(false);
      setSelectedRunId("");

      // Refresh history list as today might be new
      fetchHistoryDates();
      fetchSavedRuns();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    fetchCached();
    fetchHistoryDates();
    fetchSavedRuns();
  }, []);

  async function handleMarkTweeted(targetDate, index) {
    if (selectedRunId) return;
    if (!targetDate || typeof index !== "number") return;
    if (!Array.isArray(tweetedStatus)) return; // Guard against undefined state

    const previous = tweetedStatus[index] || false;
    const next = !previous;

    // Optimistic update
    setTweetedStatus((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((value, i) => (i === index ? next : value));
    });

    setTweets((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((tweet, i) => {
        if (i !== index) return tweet;
        if (typeof tweet === "string") return { text: tweet, posted: next }; // Convert string to object
        if (!tweet) return tweet;
        return { ...tweet, posted: next };
      });
    });

    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate, index }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to mark tweet");
      }

      const serverStatus = Boolean(json.tweetedStatus);
      setTweetedStatus((prev) => prev.map((value, i) => (i === index ? serverStatus : value)));
      setTweets((prev) =>
        prev.map((tweet, i) => {
          if (i !== index) return tweet;
          if (typeof tweet === "string") return { text: tweet, posted: serverStatus };
          if (!tweet) return tweet;
          return { ...tweet, posted: serverStatus };
        })
      );
    } catch (err) {
      console.error("Mark tweet failed:", err);
      // Revert on error
      setTweetedStatus((prev) => prev.map((value, i) => (i === index ? previous : value)));
      setTweets((prev) =>
        prev.map((tweet, i) => {
          if (i !== index) return tweet;
          if (typeof tweet === "string") return { text: tweet, posted: previous };
          if (!tweet) return tweet;
          return { ...tweet, posted: previous };
        })
      );
      setError(err.message);
    }
  }

  const tweetedCount = tweetedStatus.filter(Boolean).length;
  const pendingCount = tweets.length - tweetedCount;

  function xLength(text) {
    const value = typeof text === "string" ? text : "";
    if (!value) return 0;
    const urlRe = /https?:\/\/\S+|www\.\S+/gi;
    const urls = [...value.matchAll(urlRe)];
    if (!urls.length) return Array.from(value).length;

    let total = 0;
    let cursor = 0;
    for (const match of urls) {
      const start = match.index ?? 0;
      const token = match[0] || "";
      const end = start + token.length;
      if (start > cursor) total += Array.from(value.slice(cursor, start)).length;
      total += 23;
      cursor = end;
    }
    if (cursor < value.length) total += Array.from(value.slice(cursor)).length;
    return total;
  }

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
        savedRuns={savedRuns}
        selectedRunId={selectedRunId}
        onRunSelect={handleRunSelect}
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

        {/* Empty state - no cached tweets, show Generate button */}
        {!loading && isEmpty && !generating && !error && (
          <div className="empty-container fade-in">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </div>
            <h2 className="empty-title">No tweets yet</h2>
            <p className="empty-subtitle">Click below to generate 10 fresh AI tools tweets based on today&apos;s launches and updates</p>
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
              <p className="loading-subtext">Scanning latest AI tool launches and updates with Gemini</p>
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
                    tweets.reduce((sum, t) => sum + xLength(typeof t === "string" ? t : t.text), 0) / tweets.length
                  )}
                </span> avg X
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
                  markDisabled={Boolean(selectedRunId)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
