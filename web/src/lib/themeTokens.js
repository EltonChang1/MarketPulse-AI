const FALLBACKS = {
  background: "#ffffff",
  foreground: "#111827",
  card: "#ffffff",
  border: "#d1d5db",
  muted: "#f4f4f5",
  "muted-foreground": "#6b7280",
  primary: "#111827",
  secondary: "#e5e7eb",
  positive: "#166534",
  negative: "#b91c1c",
  destructive: "#b91c1c",
};

/**
 * Resolve CSS token to concrete color string for JS chart libraries.
 */
export function tokenColor(token, fallback) {
  if (typeof window === "undefined") return fallback || FALLBACKS[token] || "#111827";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return raw ? `hsl(${raw})` : fallback || FALLBACKS[token] || "#111827";
}

export function tokenColorAlpha(token, alpha, fallback) {
  if (typeof window === "undefined") return fallback || FALLBACKS[token] || "#111827";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return raw ? `hsl(${raw} / ${alpha})` : fallback || FALLBACKS[token] || "#111827";
}
