import React from 'react';
import { Shield, ScanLine, PlusSquare, Settings, Lock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ThemeToggle } from './ThemeToggle';

// ...

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { name: 'Vault', path: '/', icon: Lock },
        { name: 'Scan', path: '/scan', icon: ScanLine },
        { name: 'Generate', path: '/generate', icon: PlusSquare }, // Or "Add"
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-background text-textMain flex flex-col font-sans selection:bg-primary selection:text-white">
            {/* Header */}
            <header className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary">
                            <Shield size={24} />
                        </div>
                        <span className="font-bold text-lg tracking-tight hidden sm:inline">Airgap<span className="text-primary">Vault</span></span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <nav className="hidden md:flex gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={clsx(
                                        "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                        location.pathname === item.path
                                            ? "bg-primary/10 text-primary"
                                            : "text-textMuted hover:text-textMain hover:bg-white/5"
                                    )}
                                >
                                    <item.icon size={16} />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        <div className="scale-90 origin-right">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-24 md:pb-6 animate-fade-in">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-border pb-safe z-50">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform",
                                location.pathname === item.path ? "text-primary" : "text-textMuted"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </div>
    );
};
