"use client";

import { useState } from "react";

export default function TweetCard({ tweet, index, date, isTweeted, onMarkTweeted }) {
    const [copied, setCopied] = useState(false);

    const tweetText = typeof tweet === "string" ? tweet : tweet.text;
    const sourceAge = typeof tweet === "object" ? tweet.sourceAge : "";
    const charCount = tweetText.length;
    const isWarning = charCount < 270 || charCount > 275;

    function freshnessHoursLabel(value) {
        if (!value || typeof value !== "string") return "1h";
        const normalized = value.toLowerCase().trim();
        const match = normalized.match(/(\d+)\s*([smhd])/i);
        if (!match) return "1h";
        const amount = Number(match[1]) || 1;
        const unit = match[2].toLowerCase();
        if (unit === "s") return "1h";
        if (unit === "m") return `${Math.max(1, Math.ceil(amount / 60))}h`;
        if (unit === "h") return `${Math.max(1, amount)}h`;
        if (unit === "d") return `${Math.max(1, amount * 24)}h`;
        return "1h";
    }

    const freshnessLabel = freshnessHoursLabel(sourceAge);

    // Highlight hashtags and mentions
    function renderTweetText(text) {
        const parts = text.split(/(#\w+|@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith("#")) return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
            if (part.startsWith("@")) return <span key={i} className="text-sky-400 font-semibold">{part}</span>;
            return part;
        });
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(tweetText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
            // Fallback
            try {
                const el = document.createElement("textarea");
                el.value = tweetText;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) { }
        }
    };

    const handleTweetIntent = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(url, "_blank");
    };

    return (
        <div
            className={`flex flex-col bg-[#1e293b] rounded-xl overflow-hidden border transition-all duration-300 ${isTweeted
                ? "border-green-500/30 opacity-75 grayscale-[0.5]"
                : "border-[#334155] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
                }`}
        >
            {/* Minimal Header */}
            <div className={`h-1.5 w-full ${isTweeted ? "bg-green-500/20" : "bg-gradient-to-r from-blue-600 to-cyan-500"}`} />

            {/* Content Body */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider bg-slate-800/50 px-2 py-0.5 rounded">
                            {freshnessLabel} • #{index + 1}
                        </span>
                        {/* Freshness Badge */}
                        {sourceAge && sourceAge !== "Fresh" && (
                            <div className="group relative flex items-center cursor-help">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${sourceAge.includes("d")
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                    {sourceAge}
                                </span>
                                <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none z-20">
                                    Source: {sourceAge} ago
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isTweeted && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20 uppercase tracking-wide">
                                Posted
                            </span>
                        )}
                        <span className={`text-xs font-mono ${isWarning ? "text-red-400 font-bold" : "text-slate-500"}`}>
                            {charCount}/270-275
                        </span>
                    </div>
                </div>

                <p className="text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap font-medium mb-6 flex-1">
                    {renderTweetText(tweetText)}
                </p>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center mt-auto">
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className={`p-2 rounded-lg transition-colors group relative ${copied ? "bg-green-500/10 text-green-400" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={handleTweetIntent}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors"
                            title="Post on X"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={() => onMarkTweeted?.(date, index)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all bg-opacity-90 hover:bg-opacity-100 ${isTweeted
                            ? "bg-slate-800 text-slate-500 hover:bg-slate-700"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                            }`}
                    >
                        {isTweeted ? "UNDO" : "MARK DONE"}
                    </button>
                </div>
            </div>
        </div>
    );
}
