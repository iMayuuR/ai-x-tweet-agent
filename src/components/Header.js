"use client";

import { useMemo, useState, useEffect } from "react";

export default function Header({
    date,
    onLogout,
    historyDates = [],
    onDateSelect,
    selectedDate,
    savedRuns = [],
    selectedRunId,
    onRunSelect,
}) {
    const formattedDate = useMemo(() => {
        const d = date ? new Date(date + "T00:00:00") : new Date();
        return d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }, [date]);

    const formatRunLabel = (run) => {
        const generated = run?.generatedAt ? new Date(run.generatedAt) : null;
        const timeLabel = generated
            ? generated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
            : "Saved";
        const count = run?.count || 10;
        return `${timeLabel} - ${count}`;
    };

    const [installPrompt, setInstallPrompt] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((result) => {
            if (result.outcome === "accepted") {
                setInstallPrompt(null);
            }
        });
    };

    return (
        <header className="header fade-in">
            <div className="header-top-row">
                {/* Desktop Selectors (Keep for accessibility/visibility on large screens if desired, 
                    or hide them and relying fully on the new menu. 
                    Let's hide the old selectors on mobile at least, or just keep them as is and add the button.)
                */}

                {/* We'll keep the selectors for now but they might be redundant. 
                   Let's assume the user wants the BUTTON to be the primary way. 
                   I will hide the original selectors with a class if needed, but for now specific requirement 
                   was just "button de".
                */}

                {/* Spacer to push actions to right if selectors are gone/hidden */}
                <div style={{ flex: 1 }}></div>

                <div className="header-actions">
                    {/* Install App Button */}
                    {installPrompt && (
                        <button
                            className="btn-install"
                            onClick={handleInstall}
                            title="Install App"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                            <span className="install-text">Install</span>
                        </button>
                    )}

                    {/* History Container (Button + Popover) */}
                    <div className="history-container relative">
                        <button
                            className={`btn-icon ${showHistory ? "active" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowHistory(!showHistory);
                            }}
                            title="History & Saved Runs"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>

                        {showHistory && (
                            <div className="history-popover">
                                <div className="history-section">
                                    <h3>Recent Days</h3>
                                    {historyDates.length > 0 ? (
                                        <div className="history-list">
                                            <button
                                                className={`history-item ${!selectedDate && !selectedRunId ? "active" : ""}`}
                                                onClick={() => { onDateSelect(null); setShowHistory(false); }}
                                            >
                                                Today
                                            </button>
                                            {historyDates.map(d => (
                                                <button
                                                    key={d}
                                                    className={`history-item ${selectedDate === d ? "active" : ""}`}
                                                    onClick={() => { onDateSelect(d); setShowHistory(false); }}
                                                >
                                                    {new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-history">No history yet</div>
                                    )}
                                </div>

                                {savedRuns.length > 0 && (
                                    <div className="history-section">
                                        <h3>Saved Sessions (24h)</h3>
                                        <div className="history-list">
                                            {savedRuns.map(run => (
                                                <button
                                                    key={run.id}
                                                    className={`history-item ${selectedRunId === run.id ? "active" : ""}`}
                                                    onClick={() => { onRunSelect(run.id); setShowHistory(false); }}
                                                >
                                                    {formatRunLabel(run)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {onLogout && (
                        <button className="btn-logout" onClick={onLogout} aria-label="Logout">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="header-badge">
                <span className="header-badge-dot"></span>
                AI-Powered
            </div>

            <h1>AI Tools Explorer</h1>

            <p className="header-subtitle">
                Daily viral AI tweets and tool discoveries
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
