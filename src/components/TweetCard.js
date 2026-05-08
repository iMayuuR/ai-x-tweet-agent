"use client";

import { useState, useRef, useEffect } from "react";

const PLATFORMS = {
    x: {
        name: 'X',
        icon: (props) => (
            <svg {...props} viewBox="0 0 24 24" fill="currentColor" className="text-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        color: '#1d9bf0',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border-[#1d9bf0]',
        hoverClass: 'hover:bg-[#1d9bf0]/10',
        label: 'Post to X',
    },
    instagram: {
        name: 'Instagram',
        icon: (props) => (
            <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-current">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
        ),
        color: '#E4405F',
        bgClass: 'bg-[#FCFCFC]',
        textClass: 'text-[#E4405F]',
        borderClass: 'border-[#E4405F]',
        hoverClass: 'hover:bg-[#E4405F]/10',
        label: 'Open Instagram',
    },
    threads: {
        name: 'Threads',
        icon: (props) => (
            <svg {...props} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/>
            </svg>
        ),
        color: '#ffffff',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border-white',
        hoverClass: 'hover:bg-white/10',
        label: 'Open Threads',
    },
    copy: {
        name: 'Copy',
        icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-current">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
        color: 'currentColor',
        bgClass: 'bg-slate-800',
        textClass: 'text-slate-300',
        borderClass: 'border-slate-600',
        hoverClass: 'hover:bg-slate-700',
        label: 'Copy',
    },
};

export default function TweetCard({
    tweet,
    index,
    date,
    isTweeted,
    onMarkTweeted,
    markDisabled = false,
    onPostToPlatform,
    postedTo = [],
    onCopy,
    copyText,
}) {
    const [copied, setCopied] = useState(false);
    const [postingToPlatform, setPostingToPlatform] = useState(null);
    const [showPlatformMenu, setShowPlatformMenu] = useState(false);
    const platformMenuRef = useRef(null);

    const tweetText = typeof tweet === "string" ? tweet : tweet.text;
    const sourceAge = typeof tweet === "object" ? tweet.sourceAge : "";

    function coreCharCount(text) {
        const value = typeof text === "string" ? text : "";
        const withoutPrefix = value.replace(/^[A-Z][A-Z0-9]{2,16}:\s*/i, "");
        const withoutTags = withoutPrefix.replace(/#[a-z0-9_]+/gi, " ");
        const withoutEmoji = withoutTags.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "");
        return withoutEmoji.replace(/\s+/g, " ").trim().length;
    }

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

    const rawCharCount = tweetText.length;
    const effectiveCharCount = coreCharCount(tweetText);
    const xCharCount = xLength(tweetText);
    const isWarning = xCharCount < 270 || xCharCount > 275;

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
            const textToCopy = copyText || tweetText;
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (onCopy) onCopy(textToCopy);
        } catch (err) {
            console.error("Failed to copy:", err);
            try {
                const el = document.createElement("textarea");
                el.value = textToCopy;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                if (onCopy) onCopy(textToCopy);
            } catch (e) { }
        }
    };

    const handlePlatformPost = async (platform) => {
        if (postingToPlatform) return;
        setPostingToPlatform(platform);

        try {
            if (onPostToPlatform) {
                await onPostToPlatform(platform, tweetText, { index, date });
            }
        } finally {
            setTimeout(() => setPostingToPlatform(null), 2000);
        }
    };

    // Close platform menu on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (platformMenuRef.current && !platformMenuRef.current.contains(event.target)) {
                setShowPlatformMenu(false);
            }
        };

        if (showPlatformMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showPlatformMenu]);

    // Build platform buttons to show based on availability and posted status
    const getAvailablePlatforms = () => {
        const platforms = [];
        const platformsConfig = {
            x: { ...PLATFORMS.x, method: 'web_intent' },
            threads: { ...PLATFORMS.threads, method: 'deep_link' },
            copy: { ...PLATFORMS.copy, method: 'copy' },
        };

        Object.entries(platformsConfig).forEach(([key, config]) => {
            const alreadyPosted = postedTo.includes(key);
            platforms.push({
                key,
                ...config,
                alreadyPosted,
            });
        });

        return platforms;
    };

    const availablePlatforms = getAvailablePlatforms();

    return (
        <div
            className={`flex flex-col bg-[#1e293b] rounded-xl overflow-hidden border transition-all duration-300 ${isTweeted
                ? "border-green-500/30 opacity-75"
                : "border-[#334155] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
                } ${isTweeted ? 'tweeted' : ''}`}
        >
            {/* Top border gradient */}
            <div className={`h-1.5 w-full ${isTweeted ? "bg-green-500/30" : postedTo.length > 0 ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-blue-600 to-cyan-500"}`} />

            {/* Platform posted indicators */}
            {postedTo.length > 0 && (
                <div className="flex gap-1 px-3 py-2 bg-slate-900/30 border-b border-slate-700/30">
                    {postedTo.map(platform => {
                        const config = PLATFORMS[platform];
                        if (!config) return null;
                        return (
                            <span
                                key={platform}
                                className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                                style={{
                                    backgroundColor: `${config.color}20`,
                                    color: config.color,
                                    border: `1px solid ${config.color}40`
                                }}
                                title={`Posted to ${config.name}`}
                            >
                                {(() => {
                                    const Icon = config.icon;
                                    return <Icon className="w-3 h-3 text-current" style={{ color: config.color }} />;
                                })()}
                                <span className="hidden sm:inline">{config.name}</span>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Content Body */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider bg-slate-800/50 px-2 py-0.5 rounded">
                            {freshnessLabel} - #{index + 1}
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
                                    Source: {sourceAge}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isTweeted && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20 uppercase tracking-wide">
                                Done
                            </span>
                        )}
                        <span
                            title={`Raw: ${rawCharCount} | Core: ${effectiveCharCount}`}
                            className={`text-xs font-mono ${isWarning ? "text-red-400 font-bold" : "text-slate-500"}`}
                        >
                            {xCharCount}/280
                        </span>
                    </div>
                </div>


                <p className="text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap font-medium flex-1">
                    {renderTweetText(tweetText)}
                </p>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between mt-auto gap-2">
                    {/* Platform actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Copy button (always visible) */}
                        <button
                            onClick={handleCopy}
                            disabled={postingToPlatform === 'copy'}
                            className={`p-2.5 rounded-lg transition-all duration-200 flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center ${copied
                                ? "bg-green-500/10 text-green-400 border border-green-500/30"
                                : postingToPlatform === 'copy'
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
                                }`}
                            title={copied ? "Copied!" : "Copy"}
                        >
                            {copied ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : postingToPlatform === 'copy' ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                PLATFORMS.copy.icon({ className: 'w-5 h-5' })
                            )}
                            <span className="text-xs font-medium hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                        </button>

                        {/* Platform post buttons */}
                        {availablePlatforms.filter(p => p.key !== 'copy').map(platform => (
                            <button
                                key={platform.key}
                                onClick={() => handlePlatformPost(platform.key)}
                                disabled={postingToPlatform !== null || isTweeted}
                                className={`p-2.5 rounded-lg transition-all duration-200 flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center ${platform.alreadyPosted
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                    : postingToPlatform === platform.key
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : `${platform.hoverClass} ${platform.textClass} border ${platform.borderClass}`
                                    }`}
                                title={`${platform.label}${platform.alreadyPosted ? ' (posted)' : ''}`}
                            >
                                {postingToPlatform === platform.key ? (
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : platform.alreadyPosted ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                ) : (
                                    platform.icon({ className: 'w-5 h-5' })
                                )}
                                <span className="text-xs font-medium hidden sm:inline">{platform.alreadyPosted ? 'Posted' : platform.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Mark as done button */}
                    <button
                        disabled={markDisabled || postingToPlatform !== null}
                        onClick={() => onMarkTweeted?.(date, index)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all flex-shrink-0 ${isTweeted
                            ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500"
                            } disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]`}
                    >
                        {markDisabled ? "LOCKED" : isTweeted ? "UNDO" : "MARK DONE"}
                    </button>
                </div>
            </div>
        </div>
    );
}
