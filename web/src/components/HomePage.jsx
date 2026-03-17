import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import CommoditiesSection from "./CommoditiesSection";
import axios from "axios";
import "../styles/dashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const REFRESH_MS = 60_000;
const DEFAULT_WATCHLIST = [];

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

export default function HomePage() {
  const { user, isAuthenticated, addToWatchlist, removeFromWatchlist } = useAuth();
  const navigate = useNavigate();
  const [watchlistPayload, setWatchlistPayload] = useState(null);
  const [error, setError] = useState("");
  const [markerSettings, setMarkerSettings] = useState({ markers: 10, perIndicator: 3 });
  const [watchlist, setWatchlist] = useState(user?.watchlist || DEFAULT_WATCHLIST);
  const [showWatchlistDetails, setShowWatchlistDetails] = useState(true);

  const watchlistData = useMemo(() => watchlistPayload?.data || [], [watchlistPayload]);

  useEffect(() => {
    if (Array.isArray(user?.watchlist) && user.watchlist.length > 0) {
      setWatchlist(user.watchlist);
    }
  }, [user?.watchlist]);

  // Auto-refresh watchlist data (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated || !watchlist.length) return;

    const symbols = watchlist.join(",");
    const loadData = async () => {
      try {
        setError("");
        const { data } = await axios.get(`${API_BASE_URL}/api/analyze`, {
          params: {
            markers: markerSettings.markers,
            perIndicator: markerSettings.perIndicator,
            symbols,
          },
        });
        setWatchlistPayload(data);
      } catch (err) {
        setError(err?.response?.data?.message || err.message);
      }
    };

    loadData();
    const timer = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [watchlist, markerSettings, isAuthenticated]);

  // Navigate to individual stock page (require sign-in)
  function handleSelectStock(symbol) {
    if (!isAuthenticated) {
      navigate("/signup");
      return;
    }
    navigate(`/stock/${symbol.toUpperCase()}`);
  }

  async function handleAddToWatchlist(symbol) {
    const result = await addToWatchlist(symbol);
    if (result.success) {
      const next = symbol.toUpperCase();
      setWatchlist((prev) => (prev.includes(next) ? prev : [...prev, next]));
    }
  }

  async function handleRemoveFromWatchlist(symbol) {
    const result = await removeFromWatchlist(symbol);
    if (result.success) {
      const next = symbol.toUpperCase();
      setWatchlist((prev) => prev.filter((s) => s !== next));
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-layout">
        {/* Main Content */}
        <main className="dashboard-main">
          {/* Search Bar */}
          <SearchBar onSelect={handleSelectStock} />

          {/* Commodities & ETFs Section */}
          <CommoditiesSection onSelectStock={handleSelectStock} />
        </main>

        {/* Sidebar - Personal Watchlist */}
        <aside className="dashboard-sidebar">
          {!isAuthenticated ? (
            <div className="sidebar-guest-cta">
              <div className="sidebar-guest-icon">📈</div>
              <h3>Your Watchlist</h3>
              <p>Sign in to track your favourite stocks and get personalised analysis.</p>
              <button className="sidebar-cta-btn" onClick={() => navigate("/signup")}>Get Started</button>
              <button className="sidebar-cta-btn sidebar-cta-secondary" onClick={() => navigate("/signin")}>Log In</button>
            </div>
          ) : (
            <>
              <div className="sidebar-header">
                <h3>📌 My Watchlist</h3>
                <button
                  className="sidebar-toggle"
                  onClick={() => setShowWatchlistDetails(!showWatchlistDetails)}
                >
                  {showWatchlistDetails ? "−" : "+"}
                </button>
              </div>

          {showWatchlistDetails && (
            <div className="watchlist-content">
              {watchlistData.length > 0 ? (
                <div className="watchlist-items">
                  {watchlistData.map((stock) => (
                    <div key={stock.symbol} className="watchlist-item">
                      <div className="watchlist-item-header">
                        <div className="watchlist-symbol">{stock.symbol}</div>
                        <button
                          className="watchlist-remove-btn"
                          onClick={() => handleRemoveFromWatchlist(stock.symbol)}
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="watchlist-name">{stock.companyName}</div>
                      <div className="watchlist-price">
                        {formatCurrency(stock.currentPrice)}
                      </div>
                      <div
                        className={`watchlist-change ${
                          (stock.changePercent ?? stock.dayChangePct ?? 0) >= 0 ? "positive" : "negative"
                        }`}
                      >
                        {formatPercent(stock.changePercent ?? stock.dayChangePct)}
                      </div>
                      <button
                        className="watchlist-view-btn"
                        onClick={() => handleSelectStock(stock.symbol)}
                      >
                        View Analysis
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="watchlist-empty">No stocks in watchlist</p>
              )}

              {/* Add to Watchlist Input */}
              <div className="watchlist-add">
                <input
                  type="text"
                  placeholder="Enter stock symbol..."
                  className="watchlist-input"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      const symbol = e.target.value.toUpperCase().trim();
                      if (symbol && !watchlist.includes(symbol)) {
                        handleAddToWatchlist(symbol);
                        e.target.value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
            </>
          )}
        </aside>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
