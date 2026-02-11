"use client";

import { useMemo } from "react";

export default function Header({ date, onLogout, historyDates = [], onDateSelect, selectedDate }) {
    const formattedDate = useMemo(() => {
        const d = date ? new Date(date + "T00:00:00") : new Date();
        return d.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }, [date]);

    return (
        <header className="header fade-in">
            <div className="header-top-row">
                {historyDates.length > 0 && (
                    <div className="history-selector-wrapper">
                        <select
                            className="history-select"
                            value={selectedDate || ""}
                            onChange={(e) => onDateSelect(e.target.value || null)}
                        >
                            <option value="">Today&apos;s Tweets</option>
                            {historyDates.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                        <svg
                            className="select-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                )}

                {onLogout && (
                    <button className="btn btn-logout" onClick={onLogout} aria-label="Logout">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="header-badge">
                <span className="header-badge-dot"></span>
                AI-Powered
            </div>

            <h1>Daily AI Tweets</h1>

            <p className="header-subtitle">
                10 curated AI tweets, freshly generated every day.
                <br />
                Copy or post directly to X.
            </p>

            {formattedDate && (
                <div className="header-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formattedDate}
                </div>
            )}
        </header>
    );
}
