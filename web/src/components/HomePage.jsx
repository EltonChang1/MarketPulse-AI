import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  CreditCard,
  Landmark,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import CommoditiesSection from "./CommoditiesSection";
import { FinancialDashboard } from "./ui/financial-dashboard";
import { FinancialTable } from "./ui/financial-markets-table";
import axios from "axios";
import { getPortfolioForUser } from "../context/portfolioStore";
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
  const [portfolioHoldings, setPortfolioHoldings] = useState(() => getPortfolioForUser(user));

  const watchlistData = useMemo(() => watchlistPayload?.data || [], [watchlistPayload]);
  const recentActivity = useMemo(
    () =>
      watchlistData.slice(0, 4).map((stock) => ({
        icon: TrendingUp,
        title: `${stock.symbol} price update`,
        time: "Live",
        amount: Number(stock.dayChange || 0),
      })),
    [watchlistData]
  );

  const quickActions = useMemo(
    () => [
      {
        icon: ArrowLeftRight,
        title: "Watchlist",
        description: "Manage symbols",
        onClick: () => document.getElementById("watchlist")?.scrollIntoView({ behavior: "smooth" }),
      },
      { icon: Landmark, title: "Briefings", description: "Market summaries", onClick: () => navigate("/briefings") },
      { icon: TrendingUp, title: "Portfolio", description: "Track returns", onClick: () => navigate("/portfolio") },
      { icon: CreditCard, title: "Classic", description: "Legacy analytics", onClick: () => navigate("/classic") },
    ],
    [navigate]
  );

  const financialServices = useMemo(
    () => [
      { icon: ShieldCheck, title: "Risk alerts", description: "Signal confidence and trend risk", isPremium: true },
      { icon: Target, title: "Price targets", description: "Multi-timeframe prediction guidance", hasAction: true },
      { icon: Users, title: "Watchlist sync", description: "Personalized symbols across sessions" },
    ],
    []
  );

  const tableIndices = useMemo(
    () =>
      watchlistData.map((stock, idx) => {
        const closes = (stock.candlestickData || []).slice(-10).map((c) => Number(c.close || c.c || 0)).filter(Boolean);
        const fallbackBase = Number(stock.currentPrice || 100);
        const chartData =
          closes.length > 3
            ? closes
            : Array.from({ length: 10 }, (_, i) => fallbackBase + (i - 5) * 0.25 + (Math.random() - 0.5));
        return {
          id: String(idx + 1),
          name: `${stock.symbol} · ${stock.companyName || "Market Index"}`,
          country: "United States",
          countryCode: "US",
          ytdReturn: Number(stock.dayChangePct || 0),
          pltmEps: Number.isFinite(stock?.fundamentals?.peRatio) ? Number(stock.fundamentals.peRatio) : null,
          divYield: Number(stock?.fundamentals?.dividendYield || 0),
          marketCap: Number(stock.marketCap || 0) / 1e9,
          volume: Number(stock.volume || 0) / 1e6,
          chartData,
          price: Number(stock.currentPrice || 0),
          dailyChange: Number(stock.dayChange || 0),
          dailyChangePercent: Number(stock.dayChangePct || 0),
          symbol: stock.symbol,
        };
      }),
    [watchlistData]
  );

  useEffect(() => {
    if (Array.isArray(user?.watchlist) && user.watchlist.length > 0) {
      setWatchlist(user.watchlist);
    }
  }, [user?.watchlist]);

  useEffect(() => {
    setPortfolioHoldings(getPortfolioForUser(user));
  }, [user?.email]);

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
    const normalized = String(symbol || "").toUpperCase();
    navigate(`/stock/${encodeURIComponent(normalized)}`);
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
          <FinancialDashboard
            quickActions={quickActions}
            recentActivity={recentActivity}
            financialServices={financialServices}
          />

          {/* Search Bar */}
          <SearchBar onSelect={handleSelectStock} />

          {tableIndices.length > 0 ? (
            <FinancialTable
              title="Tracked markets"
              indices={tableIndices}
              onIndexSelect={(id) => {
                const match = tableIndices.find((row) => row.id === id);
                if (match?.symbol) handleSelectStock(match.symbol);
              }}
            />
          ) : null}

          {/* Commodities & ETFs Section */}
          <CommoditiesSection onSelectStock={handleSelectStock} />
        </main>

        {/* Sidebar - Personal Watchlist */}
        <aside className="dashboard-sidebar" id="watchlist">
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

              <div className="portfolio-mini-section">
                <div className="portfolio-mini-header">
                  <h4>💼 My Portfolio Stocks</h4>
                  <button className="portfolio-mini-manage" onClick={() => navigate("/portfolio")}>Manage</button>
                </div>
                {portfolioHoldings.length ? (
                  <div className="portfolio-mini-list">
                    {portfolioHoldings.map((holding) => (
                      <div key={holding.symbol} className="portfolio-mini-item">
                        <div>
                          <div className="portfolio-mini-symbol">{holding.symbol}</div>
                          <div className="portfolio-mini-qty">Qty: {Number(holding.quantity || 0).toFixed(4).replace(/\.0000$/, "")}</div>
                        </div>
                        <button className="portfolio-mini-view" onClick={() => handleSelectStock(holding.symbol)}>View</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="portfolio-mini-empty">No portfolio positions yet.</p>
                )}
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
