import { createContext, useContext, useEffect, useState } from "react";

/** Keep in sync with the inline script in `index.html`. */
export const THEME_STORAGE_KEY = "marketpulse-theme";

const ThemeContext = createContext(null);

function readStoredTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyDomTheme(mode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyDomTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore quota / private mode
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const value = { theme, setTheme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
