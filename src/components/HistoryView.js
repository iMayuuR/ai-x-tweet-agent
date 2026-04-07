"use client";

import { useEffect, useState } from "react";

export default function HistoryView({ onDateSelect, onRunSelect, historyDates, selectedDate, savedRuns, selectedRunId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [localDates, setLocalDates] = useState(historyDates || []);
    const [localRuns, setLocalRuns] = useState(savedRuns || []);

    // Refresh data on mount
    useEffect(() => {
        // Props already provide data from parent, but we can fetch if needed
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return "Today";
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const formatRunTime = (run) => {
        const generated = run?.generatedAt ? new Date(run.generatedAt) : null;
        if (!generated) return "Unknown";
        const timeStr = generated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        const count = run?.count || 0;
        return `${timeStr} • ${count} tweets`;
    };

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="text-center pb-4 border-b border-slate-700/30">
                <h2 className="text-2xl font-bold text-white mb-2">History</h2>
                <p className="text-slate-400 text-sm">View and restore previous tweet generations</p>
            </div>

            {/* Recent Dates Section */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Recent Days
                </h3>
                {localDates.length === 0 ? (
                    <p className="text-slate-500 text-center py-6 text-sm">No previous days available</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        <button
                            onClick={() => onDateSelect(null)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between group ${
                                !selectedDate && !selectedRunId
                                    ? "bg-blue-500/20 border border-blue-500/30 text-blue-300"
                                    : "bg-slate-700/30 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500"
                            }`}
                        >
                            <span className="font-medium">Today</span>
                            <span className="text-xs text-slate-400 group-hover:text-slate-300">Load</span>
                        </button>
                        {localDates.map((date) => (
                            <button
                                key={date}
                                onClick={() => onDateSelect(date)}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between group ${
                                    selectedDate === date
                                        ? "bg-blue-500/20 border border-blue-500/30 text-blue-300"
                                        : "bg-slate-700/30 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500"
                                }`}
                            >
                                <span className="font-medium">{formatDate(date)}</span>
                                <span className="text-xs text-slate-400 group-hover:text-slate-300">Load</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Saved Runs Section */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Saved Sessions (Last 24h)
                </h3>
                {localRuns.length === 0 ? (
                    <p className="text-slate-500 text-center py-6 text-sm">No saved sessions available</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {localRuns.map((run) => (
                            <button
                                key={run.id}
                                onClick={() => onRunSelect(run.id)}
                                disabled={!!selectedRunId}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between group ${
                                    selectedRunId === run.id
                                        ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                                        : "bg-slate-700/30 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                }`}
                            >
                                <div>
                                    <div className="font-medium text-sm">{formatRunTime(run)}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{run.date ? formatDate(run.date) : ''}</div>
                                </div>
                                <span className="text-xs bg-slate-600 px-2 py-1 rounded group-hover:bg-slate-500 transition-colors">
                                    {run.count || 0} tweets
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-200">
                        <p className="font-semibold mb-1">How to use:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-100/80">
                            <li>Click a date to view that day&apos;s tweets</li>
                            <li>Click a saved session to restore a specific generation run</li>
                            <li>If a session is already loaded, it will be marked as selected</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
