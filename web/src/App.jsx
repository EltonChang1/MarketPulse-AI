import { useEffect, useMemo, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthProvider, useAuth } from "./context/AuthContext";
import StockDetailView from "./components/StockDetailView";
import StockDetailPage from "./components/StockDetailPage";
import SignUpPage from "./components/SignUpPage";
import SignInPage from "./components/SignInPage";
import HomePage from "./components/HomePage";
import PortfolioPage from "./components/PortfolioPage";
import BriefingsPage from "./components/BriefingsPage";
import AskMarketPulse from "./components/AskMarketPulse";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const REFRESH_MS = 60_000;
const MARKER_OPTIONS = [8, 10, 12, 15, 20];
const PER_INDICATOR_OPTIONS = [2, 3, 4, 5];
const PERIOD_OPTIONS = ["week", "month", "quarter", "halfYear", "year"];
const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "gainers", label: "Gainers ↑" },
  { value: "losers", label: "Losers ↓" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "bullish", label: "Bullish First" },
  { value: "bearish", label: "Bearish First" },
];
const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "BRK-B", "TSLA", "AVGO", "JPM"];
const LS_WATCHLIST_KEY = "marketpulse_watchlist";
const SYMBOL_REGEX = /^[A-Z]{1,7}(-[A-Z])?$/;

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function marketCapLabel(value) {
  if (!value || typeof value !== "number") return "-";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  return `${(value / 1e6).toFixed(2)}M`;
}

function scoreBadge(impact) {
  if (impact === "positive") return "badge positive";
  if (impact === "negative") return "badge negative";
  return "badge neutral";
}

function trendImpactFromDirection(direction) {
  if (direction === "up") return "positive";
  if (direction === "down") return "negative";
  return "neutral";
}

function getInitialMarkerSettings() {
  if (typeof window === "undefined") {
    return { markers: 10, perIndicator: 3 };
  }

  const params = new URLSearchParams(window.location.search);
  const markersFromUrl = Number.parseInt(params.get("markers") || "", 10);
  const perIndicatorFromUrl = Number.parseInt(params.get("perIndicator") || "", 10);

  return {
    markers: MARKER_OPTIONS.includes(markersFromUrl) ? markersFromUrl : 10,
    perIndicator: PER_INDICATOR_OPTIONS.includes(perIndicatorFromUrl) ? perIndicatorFromUrl : 3,
  };
}

function getInitialViewState() {
  if (typeof window === "undefined") {
    return { selected: "AAPL", detailView: false, selectedPrediction: "week" };
  }

  const params = new URLSearchParams(window.location.search);
  const symbol = (params.get("symbol") || "AAPL").toUpperCase();
  const view = params.get("view");
  const period = params.get("period") || "week";

  return {
    selected: symbol,
    detailView: view === "detail",
    selectedPrediction: PERIOD_OPTIONS.includes(period) ? period : "week",
  };
}

function getInitialFilterQuery() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

function getInitialWatchlist() {
  try {
    const stored = localStorage.getItem(LS_WATCHLIST_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_WATCHLIST;
}

// Legacy ClassicApp component for backward compatibility
function ClassicApp() {
  const initialView = getInitialViewState();
  const [payload, setPayload] = useState(null);
  const [selected, setSelected] = useState(initialView.selected);
  const [detailView, setDetailView] = useState(initialView.detailView);
  const [selectedPrediction, setSelectedPrediction] = useState(initialView.selectedPrediction);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(getInitialFilterQuery);
  const [markerSettings, setMarkerSettings] = useState(getInitialMarkerSettings);
  const [watchlist, setWatchlist] = useState(getInitialWatchlist);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const effectiveSelectedPrediction = PERIOD_OPTIONS.includes(selectedPrediction)
    ? selectedPrediction
    : "week";

  async function loadData(currentWatchlist) {
    const symbols = (currentWatchlist || watchlist).join(",");
    try {
      setError("");
      const { data } = await axios.get(`${API_BASE_URL}/api/analyze`, {
        params: {
          markers: markerSettings.markers,
          perIndicator: markerSettings.perIndicator,
          symbols,
        },
      });
      setPayload(data);
      if (!data?.data?.some((item) => item.symbol === selected)) {
        setSelected(data?.data?.[0]?.symbol || "AAPL");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to fetch analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(watchlist);
    const timer = setInterval(() => loadData(watchlist), REFRESH_MS);
    return () => clearInterval(timer);
  }, [markerSettings.markers, markerSettings.perIndicator, watchlist.join(",")]);

  // Persist watchlist
  useEffect(() => {
    try {
      localStorage.setItem(LS_WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      // ignore
    }
  }, [watchlist.join(",")]);

  function handleAddSymbol() {
    const sym = addInput.trim().toUpperCase();
    if (!SYMBOL_REGEX.test(sym)) {
      setAddError("Invalid ticker format (e.g. AAPL, BRK-B)");
      return;
    }
    if (watchlist.includes(sym)) {
      setAddError(`${sym} is already in your watchlist`);
      return;
    }
    if (watchlist.length >= 20) {
      setAddError("Max 20 symbols allowed");
      return;
    }
    setAddError("");
    setAddInput("");
    setWatchlist((prev) => [...prev, sym]);
  }

  function handleRemoveSymbol(sym) {
    if (watchlist.length <= 1) return;
    setWatchlist((prev) => prev.filter((s) => s !== sym));
    if (selected === sym) setSelected(watchlist.find((s) => s !== sym) || "");
  }

  function handleResetWatchlist() {
    setWatchlist(DEFAULT_WATCHLIST);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("markers", String(markerSettings.markers));
    params.set("perIndicator", String(markerSettings.perIndicator));
    params.set("symbol", String(selected));
    params.set("period", String(effectiveSelectedPrediction));
    if (query.trim()) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    if (detailView) {
      params.set("view", "detail");
    } else {
      params.delete("view");
    }
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [markerSettings.markers, markerSettings.perIndicator, selected, effectiveSelectedPrediction, detailView, query]);

  const stocks = payload?.data || [];
  const filteredStocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let result = normalized
      ? stocks.filter(
          (item) =>
            item.symbol.toLowerCase().includes(normalized) ||
            item.companyName.toLowerCase().includes(normalized)
        )
      : [...stocks];

    switch (sortBy) {
      case "gainers":
        result.sort((a, b) => (b.dayChangePct ?? 0) - (a.dayChangePct ?? 0));
        break;
      case "losers":
        result.sort((a, b) => (a.dayChangePct ?? 0) - (b.dayChangePct ?? 0));
        break;
      case "az":
        result.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      case "za":
        result.sort((a, b) => b.symbol.localeCompare(a.symbol));
        break;
      case "bullish":
        result.sort((a, b) => {
          const da = a.technicalForecast?.predictions?.week?.direction;
          const db = b.technicalForecast?.predictions?.week?.direction;
          return (da === "up" ? -1 : 1) - (db === "up" ? -1 : 1);
        });
        break;
      case "bearish":
        result.sort((a, b) => {
          const da = a.technicalForecast?.predictions?.week?.direction;
          const db = b.technicalForecast?.predictions?.week?.direction;
          return (da === "down" ? -1 : 1) - (db === "down" ? -1 : 1);
        });
        break;
      default:
        break;
    }
    return result;
  }, [stocks, query, sortBy]);

  const selectedStock = useMemo(
    () => stocks.find((item) => item.symbol === selected) || stocks[0],
    [stocks, selected]
  );

  if (detailView && selectedStock) {
    return (
      <StockDetailView
        stock={selectedStock}
        onBack={() => setDetailView(false)}
        selectedPrediction={effectiveSelectedPrediction}
        onSelectedPredictionChange={setSelectedPrediction}
        markerSettings={markerSettings}
        onMarkerSettingsChange={setMarkerSettings}
      />
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>MarketPulse AI</h1>
          <p>Custom watchlist · live data · news · LLM sentiment · multi-timeframe prediction.</p>
        </div>
        <button onClick={() => loadData(watchlist)} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="watchlist-controls">
        <div className="watchlist-add-row">
          <input
            type="text"
            className="watchlist-input"
            placeholder="Add ticker (e.g. TSLA)"
            value={addInput}
            maxLength={8}
            onChange={(e) => { setAddInput(e.target.value.toUpperCase()); setAddError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
            aria-label="Add stock symbol"
          />
          <button className="watchlist-add-btn" onClick={handleAddSymbol}>+ Add</button>
          <button className="watchlist-reset-btn" onClick={handleResetWatchlist} title="Reset to default top-10">Reset</button>
        </div>
        {addError && <div className="watchlist-error">{addError}</div>}
        <div className="watchlist-chips">
          {watchlist.map((sym) => (
            <span key={sym} className="watchlist-chip">
              {sym}
              {watchlist.length > 1 && (
                <button className="chip-remove" onClick={() => handleRemoveSymbol(sym)} aria-label={`Remove ${sym}`}>✕</button>
              )}
            </span>
          ))}
        </div>
      </section>

      <section className="overview-controls">
        <input
          type="text"
          className="stock-filter"
          placeholder="Filter stocks by symbol or company..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter stocks"
        />
        <div className="sort-controls">
          <span className="sort-label">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`sort-btn ${sortBy === opt.value ? "active" : ""}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="cards">
        {filteredStocks.map((item) => {
          const weekDirection = item.technicalForecast?.predictions?.week?.direction;
          const trendImpact = trendImpactFromDirection(weekDirection);

          return (
          <button
            key={item.symbol}
            className={`card ${selected === item.symbol ? "active" : ""}`}
            onClick={() => {
              setSelected(item.symbol);
              setDetailView(true);
            }}
          >
            <div className="row">
              <h3>{item.symbol}</h3>
              <div className="badge-wrap">
                <span className={scoreBadge(trendImpact)}>{trendImpact}</span>
                <span className="badge-caption">(1W trend)</span>
              </div>
            </div>
            <p className="company">{item.companyName}</p>
            <p className="price">{formatCurrency(item.currentPrice)}</p>
            <p className={item.dayChangePct >= 0 ? "up" : "down"}>{formatPercent(item.dayChangePct)}</p>
            <p className="sub">1 Week: {formatCurrency(item.technicalForecast?.predictions?.week?.predictedPrice)}</p>
          </button>
        );})}
      </section>

      {filteredStocks.length === 0 ? <div className="error">No stocks match your filter.</div> : null}

      <footer>
        <small>
          Updated: {payload?.generatedAt ? new Date(payload.generatedAt).toLocaleString() : "-"} · Refreshes every 60 seconds.
        </small>
      </footer>
    </div>
  );
}

// Redirect already-authenticated users away from auth pages
function RedirectIfAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="app-page-loading">Loading…</div>;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

// Global header — shows Login/Sign Up when guest, user avatar + name when authenticated
function AppHeader() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const initials = user
    ? (user.firstName ? user.firstName[0] : user.email[0]).toUpperCase()
    : "";

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email || "";

  return (
    <header className="app-header">
      <div className="app-header-brand" onClick={() => navigate("/")}>
        📊 <span>MarketPulse AI</span>
      </div>
      <div className="app-header-actions">
        {!loading && (
          isAuthenticated ? (
            <>
              <button
                className="header-btn header-btn-outline"
                onClick={() => navigate("/portfolio")}
              >
                My Portfolio
              </button>
              <button
                className="header-btn header-btn-outline"
                onClick={() => navigate("/briefings")}
              >
                Briefings
              </button>
              <div className="user-avatar" title={displayName}>{initials}</div>
              <span className="user-display-name">{displayName}</span>
              <button
                className="header-btn header-btn-outline"
                onClick={() => { logout(); navigate("/"); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="header-btn header-btn-outline"
                onClick={() => navigate("/signin")}
              >
                Log In
              </button>
              <button
                className="header-btn header-btn-primary"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>
            </>
          )
        )}
      </div>
    </header>
  );
}

// Main App Router
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppHeader />
        <Routes>
          <Route path="/signup" element={<RedirectIfAuth><SignUpPage /></RedirectIfAuth>} />
          <Route path="/signin" element={<RedirectIfAuth><SignInPage /></RedirectIfAuth>} />
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:symbol" element={<StockDetailPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/briefings" element={<BriefingsPage />} />
          <Route path="/classic" element={<ClassicApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AskMarketPulse />
      </AuthProvider>
    </Router>
  );
}