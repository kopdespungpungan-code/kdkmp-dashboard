"use client";

import { useTheme } from "@/components/providers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/components/ui/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => {
        const next = theme === "dark" ? "light" : theme === "light" ? "dark" : "system";
        setTheme(next);
      }}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className={cn(
        "rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className,
      )}
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-5 h-5" />
      <span className="sr-only">{isDark ? "Mode gelap aktif" : "Mode terang aktif"}</span>
    </button>
  );
}
