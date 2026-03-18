const PORTFOLIO_KEY = "marketpulse_portfolio_v1";

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(next) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(next || {}));
}

export function getPortfolioKeyForUser(user) {
  if (user?.email) return String(user.email).toLowerCase();
  return "guest";
}

export function getPortfolioForUser(user) {
  const store = readStore();
  const key = getPortfolioKeyForUser(user);
  const rows = store[key];
  return Array.isArray(rows) ? rows : [];
}

export function savePortfolioForUser(user, holdings) {
  const store = readStore();
  const key = getPortfolioKeyForUser(user);
  store[key] = Array.isArray(holdings) ? holdings : [];
  writeStore(store);
}
