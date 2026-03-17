import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import CommoditiesSection from "./CommoditiesSection";
import StockDetailView from "./StockDetailView";
import axios from "axios";
import "../styles/dashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const REFRESH_MS = 60_000;
const DEFAULT_COMMODITY_WATCHLIST = ["USO", "GLD", "SLV"];

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
  const { user, addToWatchlist, removeFromWatchlist } = useAuth();
  const [selectedStock, setSelectedStock] = useState(null);
  const [watchlistPayload, setWatchlistPayload] = useState(null);
  const [selectedStockPayload, setSelectedStockPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markerSettings, setMarkerSettings] = useState({ markers: 10, perIndicator: 3 });
  const [watchlist, setWatchlist] = useState(user?.watchlist || DEFAULT_COMMODITY_WATCHLIST);
  const [showWatchlistDetails, setShowWatchlistDetails] = useState(true);

  const watchlistData = useMemo(() => watchlistPayload?.data || [], [watchlistPayload]);

  useEffect(() => {
    if (Array.isArray(user?.watchlist) && user.watchlist.length > 0) {
      setWatchlist(user.watchlist);
    }
  }, [user?.watchlist]);

  // Auto-refresh watchlist data
  useEffect(() => {
    if (!watchlist.length) return;

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
  }, [watchlist, markerSettings]);

  // Handle stock selection from search or commodities
  async function handleSelectStock(symbol) {
    try {
      setLoading(true);
      setError("");
      const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${symbol}`, {
        params: markerSettings,
      });
      setSelectedStock(symbol);
      setSelectedStockPayload(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📊 MarketPulse AI Dashboard</h1>
          {user && <p className="user-greeting">Welcome back, {user.firstName || user.email}!</p>}
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Main Content */}
        <main className="dashboard-main">
          {/* Search Bar */}
          <SearchBar onSelect={handleSelectStock} />

          {/* Detail View (if stock selected) */}
          {selectedStock && selectedStockPayload && (
            <div className="selected-stock-section">
              <button
                className="close-detail-btn"
                onClick={() => {
                  setSelectedStock(null);
                  setSelectedStockPayload(null);
                }}
              >
                ← Back to Overview
              </button>
              <StockDetailView stock={selectedStockPayload} />
            </div>
          )}

          {/* Commodities & ETFs Section (if no stock selected) */}
          {!selectedStock && <CommoditiesSection onSelectStock={handleSelectStock} />}
        </main>

        {/* Sidebar - Personal Watchlist */}
        <aside className="dashboard-sidebar">
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
        </aside>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
