"use client";

import { useTheme } from "@/components/providers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/components/ui/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const base =
    "inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200";

  return (
    <div
      role="group"
      aria-label="Mode tampilan"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        title="Mode terang"
        className={cn(
          base,
          !isDark
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <FontAwesomeIcon icon={faSun} className="h-3.5 w-3.5" />
        <span className="sr-only">Mode terang</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        title="Mode gelap"
        className={cn(
          base,
          isDark
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <FontAwesomeIcon icon={faMoon} className="h-3.5 w-3.5" />
        <span className="sr-only">Mode gelap</span>
      </button>
    </div>
  );
}
