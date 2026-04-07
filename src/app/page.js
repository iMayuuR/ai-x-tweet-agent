"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const MobileBottomNav = dynamic(() => import("@/components/MobileBottomNav"), {
    ssr: false,
    loading: () => null,
});

import Header from "@/components/Header";
import TweetCard from "@/components/TweetCard";
import Snackbar from "@/components/Snackbar";
import StatsView from "@/components/StatsView";
import HistoryView from "@/components/HistoryView";
import SettingsView from "@/components/SettingsView";

export default function Home() {
    const [tweets, setTweets] = useState([]);
    const [tweetedStatus, setTweetedStatus] = useState([]);
    const [postedToMap, setPostedToMap] = useState({});
    const [date, setDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [isEmpty, setIsEmpty] = useState(false);
    const [activeFeedback, setActiveFeedback] = useState(null);
    const [currentView, setCurrentView] = useState('home');

    // Handle bottom nav navigation
    const handleNavigate = useCallback((view) => {
        if (view === 'home') {
            setCurrentView('home');
        } else {
            // Show "Coming Soon" for unimplemented views
            setActiveFeedback({
                index: null,
                platform: null,
                status: 'error', // use warning style
                message: `${view.charAt(0).toUpperCase() + view.slice(1)} - Coming Soon!`
            });
            setTimeout(() => setActiveFeedback(null), 2000);
        }
    }, []);

    // History state
    const [historyDates, setHistoryDates] = useState([]);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
    const [savedRuns, setSavedRuns] = useState([]);
    const [selectedRunId, setSelectedRunId] = useState("");

    // Load postedTo status from cache for each tweet
    const loadPostedStatus = useCallback((tweetItems) => {
        const newPostedToMap = {};
        tweetItems.forEach((tweet, idx) => {
            if (tweet && tweet.postedTo && Array.isArray(tweet.postedTo)) {
                newPostedToMap[idx] = tweet.postedTo;
            }
        });
        setPostedToMap(newPostedToMap);
    }, []);

    // Fetch stats for stats view
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats');
            const json = await res.json();
            if (json.success) {
                return json.stats;
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
        return null;
    }, []);

    // Render Home view
    const renderHomeView = () => {
        // ... existing return JSX
    };

    // Render Stats view
    const renderStatsView = () => {
        // To be implemented with state
    };

    // Render History view
    const renderHistoryView = () => {
        // To be implemented
    };

    // Render Settings view
    const renderSettingsView = () => {
        // To be implemented
    };

    // Load available history dates
    const fetchHistoryDates = useCallback(async () => {
        try {
            const res = await fetch("/api/daily?list=true");
            const json = await res.json();
            if (json.success) {
                setHistoryDates(json.dates || []);
            }
        } catch (e) {
            console.error("Failed to fetch history dates", e);
        }
    }, []);

    const fetchSavedRuns = useCallback(async () => {
        try {
            const res = await fetch("/api/runs?list=true");
            const json = await res.json();
            if (json.success) {
                setSavedRuns(json.data || []);
            }
        } catch (e) {
            console.error("Failed to fetch saved runs", e);
        }
    }, []);

    // Load cached tweets (for today or specific date)
    const fetchCached = useCallback(async (targetDate = null) => {
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
                loadPostedStatus(tweetItems);
                setDate(json.data.date);
                setGeneratedAt(json.data.generatedAt);
                setIsEmpty(false);
            } else {
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
    }, []);

    // Handle date selection from header
    function handleDateSelect(newDate) {
        setSelectedRunId("");
        setSelectedHistoryDate(newDate);
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
            loadPostedStatus(tweetItems);
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

    // Generate new tweets
    async function handleGenerate() {
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
            setTweetedStatus(Array.isArray(tweetItems) ? tweetItems.map(() => false) : []);
            setPostedToMap({});
            setDate(json.data.date);
            setGeneratedAt(json.data.generatedAt);
            setIsEmpty(false);
            setSelectedRunId("");

            fetchHistoryDates();
            fetchSavedRuns();
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    }

    // Post to platform - opens deep link directly, then marks as posted
    async function handlePostToPlatform(platform, text, { index, date }) {
        // Set active feedback for this operation
        setActiveFeedback({ index, platform, status: 'loading' });

        try {
            // Build deep link URL directly on client (opens immediately, avoids popup blocker)
            let deepLinkUrl = '';
            if (platform === 'x') {
                deepLinkUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            } else if (platform === 'threads') {
                deepLinkUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
            }

            // Open URL immediately in new tab (synchronous, triggered by user click)
            if (deepLinkUrl) {
                window.open(deepLinkUrl, '_blank', 'noopener,noreferrer');
            }

            // Mark as posted on backend (fire in background, don't await to keep UI snappy)
            if (date && typeof index === 'number') {
                fetch('/api/mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, index, platform }),
                }).catch(err => {
                    console.error('Failed to mark as posted:', err);
                });
            }

            // Update local state optimistically
            setPostedToMap(prev => {
                const current = prev[index] || [];
                const updated = [...new Set([...current, platform])];
                return { ...prev, [index]: updated };
            });

            setActiveFeedback({ index, platform, status: 'success', message: `Opened ${platform}!` });
        } catch (err) {
            console.error("Post failed:", err);
            setActiveFeedback({ index, platform, status: 'error', message: err.message });
        }

        // Clear active feedback after 4 seconds
        setTimeout(() => {
            setActiveFeedback(null);
        }, 4000);
    }

    // Copy with feedback
    function handleCopy(index, text) {
        // The actual copy is done in the component, we just track it
        console.log(`Copied tweet ${index + 1}`);
    }

    // Mark as tweeted (legacy toggle)
    async function handleMarkTweeted(targetDate, index) {
        if (selectedRunId) return;
        if (!targetDate || typeof index !== "number") return;
        if (!Array.isArray(tweetedStatus)) return;

        const previous = tweetedStatus[index] || false;
        const next = !previous;

        // Optimistic update
        setTweetedStatus((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((value, i) => (i === index ? next : value));
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
        } catch (err) {
            console.error("Mark tweet failed:", err);
            setTweetedStatus((prev) => prev.map((value, i) => (i === index ? previous : value)));
            setError(err.message);
        }
    }

    async function handleLogout() {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.href = "/login";
    }

    useEffect(() => {
        fetchCached();
        fetchHistoryDates();
        fetchSavedRuns();
    }, [fetchCached, fetchHistoryDates, fetchSavedRuns]);

    const xCharCount = (text) => {
        if (!text) return 0;
        const urlRe = /https?:\/\/\S+|www\.\S+/gi;
        const urls = [...text.matchAll(urlRe)];
        if (!urls.length) return Array.from(text).length;

        let total = 0;
        let cursor = 0;
        for (const match of urls) {
            const start = match.index ?? 0;
            const token = match[0] || "";
            const end = start + token.length;
            if (start > cursor) total += Array.from(text.slice(cursor, start)).length;
            total += 23;
            cursor = end;
        }
        if (cursor < text.length) total += Array.from(text.slice(cursor)).length;
        return total;
    };

    const avgXLength = tweets.length > 0
        ? Math.round(tweets.reduce((sum, t) => {
            const txt = typeof t === "string" ? t : t.text;
            return sum + xCharCount(txt);
        }, 0) / tweets.length)
        : 0;

    // Stats bar component
    const StatsBar = () => (
        <div className="stats-bar fade-in">
            <div className="stat-item">
                <span className="stat-value">{tweets.length - tweetedStatus.filter(Boolean).length}</span> pending
            </div>
            <div className="stat-item">
                <span className="stat-value stat-tweeted">{tweetedStatus.filter(Boolean).length}</span> marked
            </div>
            <div className="stat-item">
                <span className="stat-value">{avgXLength}</span> avg X
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
    );

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
                {currentView === 'home' && (
                    <>
                        {loading && (
                            <div className="loading-container">
                                <div className="loading-spinner" />
                                <div>
                                    <p className="loading-text">Loading tweets...</p>
                                </div>
                            </div>
                        )}

                        {!loading && isEmpty && !generating && !error && (
                            <div className="empty-container fade-in">
                                <div className="empty-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                </div>
                                <h2 className="empty-title">No tweets yet</h2>
                                <p className="empty-subtitle">Generate 10 fresh AI tools tweets based on today&apos;s launches and updates</p>
                                <button className="btn btn-generate" onClick={handleGenerate}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                    </svg>
                                    Generate Tweets
                                </button>
                            </div>
                        )}

                        {generating && (
                            <div className="loading-container">
                                <div className="loading-spinner" />
                                <div>
                                    <p className="loading-text">Generating today&apos;s AI tweets...</p>
                                    <p className="loading-subtext">Scanning latest AI tool launches and updates</p>
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

                        {!loading && !generating && !error && tweets.length > 0 && (
                            <>
                                <StatsBar />
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
                                            postedTo={postedToMap[index] || []}
                                            onPostToPlatform={handlePostToPlatform}
                                            onCopy={(text) => handleCopy(index, text)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                {currentView === 'stats' && <StatsView />}
                {currentView === 'history' && (
                    <HistoryView
                        onDateSelect={handleDateSelect}
                        onRunSelect={handleRunSelect}
                        historyDates={historyDates}
                        selectedDate={selectedHistoryDate}
                        savedRuns={savedRuns}
                        selectedRunId={selectedRunId}
                    />
                )}
                {currentView === 'settings' && <SettingsView />}
            </main>

            {/* Mobile bottom navigation */}
            <MobileBottomNav currentView={currentView} onNavigate={setCurrentView} />

            {/* Snackbar for feedback */}
            {activeFeedback && (
                <Snackbar
                    message={activeFeedback.message}
                    type={activeFeedback.status === 'loading' ? 'success' : activeFeedback.status}
                    platform={activeFeedback.status === 'loading' ? activeFeedback.platform : null}
                    duration={activeFeedback.status === 'loading' ? 0 : 4000}
                    onClose={() => setActiveFeedback(null)}
                />
            )}
        </>
    );
}
