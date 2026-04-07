"use client";

import { useState, useEffect } from "react";

export default function SettingsView() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [envVars, setEnvVars] = useState({
        GEMINI_API_KEY: false,
        AUTH_PASSWORD: false,
    });

    const fetchConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/config");
            const json = await res.json();
            if (json.success) {
                setConfig(json.config);
            } else {
                setError(json.error || "Failed to load configuration");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Check which env vars are set (client-side limited check)
    useEffect(() => {
        // Since env vars are server-side, we infer from config API
        fetchConfig();
    }, []);

    const PlatformCard = ({ platform, data }) => {
        if (!data) return null;
        const isConfigured = data.configured;
        const available = data.available;
        const methods = data.methods || [];
        const displayName = data.displayName || platform;

        let statusColor = isConfigured ? "text-green-400" : "text-yellow-400";
        let statusText = isConfigured ? "Configured" : "Not Configured";

        return (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{displayName}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isConfigured ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {statusText}
                    </span>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isConfigured ? '#00c853' : '#eab308' }}></span>
                        {available ? "Available" : "Not Available"}
                    </div>
                    <div className="mt-2">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Posting Methods</div>
                        <div className="flex flex-wrap gap-2">
                            {methods.map(method => (
                                <span key={method} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded border border-slate-600/50">
                                    {method.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handleTestApi = async () => {
        alert("API test not implemented yet. You can verify by generating tweets.");
    };

    const copyEnvInstructions = () => {
        const instructions = `# AI Social Agent - Environment Configuration
# Copy these to your .env file and fill in your actual values

# Required: Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# Required: App Authentication Password
AUTH_PASSWORD=your-secret-password

# Optional: Custom Gemini Model (default: gemini-2.5-flash)
# GEMINI_MODEL=gemini-2.5-flash`;

        navigator.clipboard.writeText(instructions).then(() => {
            alert("Environment configuration template copied to clipboard!");
        }).catch(() => {
            alert("Failed to copy. Please copy manually from console.");
            console.log(instructions);
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Loading settings...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={fetchConfig} className="btn btn-generate">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="text-center pb-4 border-b border-slate-700/30">
                <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
                <p className="text-slate-400 text-sm">Configure your platforms and preferences</p>
            </div>

            {/* Platform Configuration */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Platform Status
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config?.platforms && (
                        <>
                            <PlatformCard platform="x" data={config.platforms.x} />
                            <PlatformCard platform="threads" data={config.platforms.threads} />
                        </>
                    )}
                </div>
            </div>

            {/* Environment Configuration */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Environment Variables
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                    Environment variables are set on the server. Use the template below to configure your app.
                </p>
                <button
                    onClick={copyEnvInstructions}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy .env Template
                </button>
                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-x-auto">
                    <pre className="text-xs text-slate-300 font-mono">
                        {`# Required
GEMINI_API_KEY=your-gemini-api-key
AUTH_PASSWORD=your-secret-password

# Optional: Custom Gemini Model (default: gemini-2.5-flash)
# GEMINI_MODEL=gemini-2.5-flash`}
                    </pre>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                    Note: After changing environment variables, restart the server (<code className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">npm run dev</code>) or redeploy to Vercel.
                </p>
            </div>

            {/* About */}
            <div className="bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-2">About AI Social Agent</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    AI Social Agent generates AI tool tweets using Google Gemini and allows sharing to multiple platforms.
                    Built with Next.js, featuring PWA support and multi-platform sharing via deep links.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">Next.js 16</span>
                    <span className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">Gemini AI</span>
                </div>
            </div>
        </div>
    );
}
