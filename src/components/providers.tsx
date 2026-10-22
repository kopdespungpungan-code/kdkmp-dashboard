"use client";

import * as React from "react";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";

library.add(fas);

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextType | null>(null);

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("kdkmp-theme") as Theme) ?? "system";
};

const setStoredTheme = (theme: Theme) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("kdkmp-theme", theme);
};

const applyTheme = (resolved: "light" | "dark") => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    setThemeState(stored);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = getSystemTheme();
    } else {
      resolved = theme;
    }
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setStoredTheme(newTheme);

    let resolved: "light" | "dark";
    if (newTheme === "system") {
      resolved = getSystemTheme();
    } else {
      resolved = newTheme;
    }
    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  // Listen for system theme changes
  React.useEffect(() => {
    if (!mounted || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme, mounted]);

  const value: ThemeContextType = { theme, setTheme, resolvedTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function Providers({ children, defaultTheme = "system" }: { children: React.ReactNode; defaultTheme?: Theme }) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      {children}
    </ThemeProvider>
  );
}
