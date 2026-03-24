"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { THEME_COOKIE } from "@/lib/theme-cookie";
import type { UserPreferences } from "@/lib/user-preferences-schema";

type Theme = UserPreferences["theme"];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

function resolveDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

function applyDomTheme(theme: Theme) {
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle("dark", dark);
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  const applyAndPersist = useCallback((t: Theme) => {
    setThemeState(t);
    applyDomTheme(t);
    setCookie(THEME_COOKIE, t);
  }, []);

  useEffect(() => {
    async function syncFromServer() {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { preferences?: { theme?: Theme } };
        const t = data.preferences?.theme;
        if (t === "light" || t === "dark" || t === "system") {
          applyAndPersist(t);
        }
      } catch {
        // ignorar
      }
    }

    const fromCookie = readCookie(THEME_COOKIE);
    if (fromCookie === "light" || fromCookie === "dark" || fromCookie === "system") {
      applyAndPersist(fromCookie);
      return;
    }
    void syncFromServer();
    // montagem única: cookie ou API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDomTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: applyAndPersist,
    }),
    [theme, applyAndPersist],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
