"use client";

import { useState } from "react";

const navItems = [
    {
        id: 'home',
        label: 'Home',
        icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-current">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        id: 'stats',
        label: 'Stats',
        icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-current">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        id: 'history',
        label: 'History',
        icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-current">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-current">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
];

export default function MobileBottomNav({ currentView, onNavigate }) {
    const active = currentView || 'home';

    const handleNav = (itemId) => {
        if (onNavigate) onNavigate(itemId);
    };

    return (
        <nav className="mobile-bottom-nav" role="navigation" aria-label="Main navigation">
            <div className="mobile-nav-items">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`mobile-nav-item ${active === item.id ? 'active' : ''}`}
                            onClick={() => handleNav(item.id)}
                            aria-label={`Go to ${item.label}`}
                            aria-current={active === item.id ? 'page' : undefined}
                            data-platform={item.id === 'home' ? undefined : item.id}
                        >
                            <Icon />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
