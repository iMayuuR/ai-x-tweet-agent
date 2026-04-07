"use client";

import { useState, useEffect, useCallback } from "react";

export default function StatsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(30);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/stats?days=${days}`);
            const json = await res.json();
            if (json.success) {
                setStats(json.stats);
            } else {
                setError(json.error || "Failed to load stats");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats, days]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Loading statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={fetchStats} className="btn btn-generate">
                    Retry
                </button>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12 text-slate-400">
                No statistics available yet.
            </div>
        );
    }

    const { totalPosts, platformStats, dailyStats, successRates } = stats;
    const platforms = [
        { key: 'x', name: 'X / Twitter', color: '#1d9bf0', icon: '𝕏' },
        { key: 'instagram', name: 'Instagram', color: '#E4405F', icon: '📷' },
        { key: 'threads', name: 'Threads', color: '#ffffff', icon: '🧵' },
    ];

    // Sort daily stats by date (ascending)
    const sortedDaily = Object.entries(dailyStats)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .slice(-14); // Show last 14 days

    const maxDaily = Math.max(...Object.values(dailyStats), 1);

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Statistics</h2>
                    <p className="text-slate-400 text-sm">Your posting activity and platform performance</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Days:</label>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            {/* Total Posts Card */}
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-white mb-2">{totalPosts}</div>
                <div className="text-blue-400 font-medium uppercase tracking-wide text-sm">Total Posts</div>
                <p className="text-slate-400 text-xs mt-2">All-time posting across all platforms</p>
            </div>

            {/* Platform Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {platforms.map(({ key, name, color, icon }) => {
                    const count = platformStats[key] || 0;
                    const percentage = successRates[key]?.percentage || 0;
                    return (
                        <div
                            key={key}
                            className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{icon}</span>
                                <span className="font-semibold text-white">{name}</span>
                            </div>
                            <div className="text-4xl font-bold mb-1" style={{ color }}>{count}</div>
                            <div className="text-slate-400 text-sm">posts</div>
                            <div className="mt-3 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${percentage}%`, backgroundColor: color }}
                                />
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{percentage}% of total</div>
                        </div>
                    );
                })}
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Daily Activity (Last {sortedDaily.length} Days)</h3>
                {sortedDaily.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No activity yet</p>
                ) : (
                    <div className="space-y-3">
                        {sortedDaily.map(([date, count]) => {
                            const dateObj = new Date(date + "T00:00:00");
                            const formatted = dateObj.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                            });
                            const percent = (count / maxDaily) * 100;
                            return (
                                <div key={date} className="flex items-center gap-4">
                                    <div className="w-20 text-xs text-slate-400 text-right font-mono">
                                        {formatted}
                                    </div>
                                    <div className="flex-1 bg-slate-700/50 rounded-full h-6 overflow-hidden relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-start pl-3">
                                            <span className="text-xs font-bold text-white drop-shadow-md">
                                                {count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Reset Stats Button */}
            <div className="text-center pt-4">
                <button
                    onClick={async () => {
                        if (confirm("Are you sure you want to reset all statistics? This cannot be undone.")) {
                            try {
                                const res = await fetch("/api/stats", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ confirm: true }),
                                });
                                const json = await res.json();
                                if (json.success) {
                                    alert("Statistics reset successfully!");
                                    fetchStats();
                                } else {
                                    alert("Failed to reset: " + json.error);
                                }
                            } catch (err) {
                                alert("Error: " + err.message);
                            }
                        }
                    }}
                    className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                >
                    Reset Statistics
                </button>
            </div>
        </div>
    );
}
