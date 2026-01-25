import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "../contexts/ThemeContext"
import { useEffect, useState } from "react"
import clsx from "clsx"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-[140px] h-[40px] bg-surfaceHighlight rounded-lg animate-pulse" />
    }

    return (
        <div className="flex items-center gap-1 p-1 bg-surfaceHighlight rounded-lg border border-border">
            <button
                onClick={() => setTheme("light")}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    theme === "light"
                        ? "bg-background text-primary shadow-sm scale-105"
                        : "text-textMuted hover:text-textMain hover:bg-background/50"
                )}
                aria-label="Light Mode"
                title="Light Mode"
            >
                <Sun size={18} />
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    theme === "dark"
                        ? "bg-background text-primary shadow-sm scale-105"
                        : "text-textMuted hover:text-textMain hover:bg-background/50"
                )}
                aria-label="Dark Mode"
                title="Dark Mode"
            >
                <Moon size={18} />
            </button>
            <button
                onClick={() => setTheme("system")}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    theme === "system"
                        ? "bg-background text-primary shadow-sm scale-105"
                        : "text-textMuted hover:text-textMain hover:bg-background/50"
                )}
                aria-label="System Theme"
                title="System Theme"
            >
                <Monitor size={18} />
            </button>
        </div>
    )
}
