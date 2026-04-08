import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import CommoditiesSection from "./CommoditiesSection";
import { FinancialTable } from "./ui/financial-markets-table";
import { SidebarRow } from "./ui/sidebar-row";
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
      const next = String(symbol || "").replace(/^\^/, "").toUpperCase();
      setWatchlist((prev) => (prev.includes(next) ? prev : [...prev, next]));
    }
    return result;
  }

  /** Used from market cards: guests go to sign-in; signed-in users persist via API. */
  async function handleAddMarketCardToWatchlist(symbol) {
    const sym = String(symbol || "").replace(/^\^/, "").toUpperCase();
    if (!sym) return { success: false, error: "Invalid symbol" };
    if (!isAuthenticated) {
      navigate("/signin");
      return { success: false, error: "Sign in required" };
    }
    if (watchlist.some((s) => String(s || "").replace(/^\^/, "").toUpperCase() === sym)) return { success: true };
    if (watchlist.length >= 20) {
      setError("Max 20 symbols in watchlist");
      return { success: false, error: "Watchlist full" };
    }
    const result = await handleAddToWatchlist(sym);
    if (!result.success && result.error) setError(result.error);
    return result;
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
          <SearchBar onSelect={handleSelectStock} />

          {tableIndices.length > 0 ? (
            <FinancialTable
              title="Watchlist screener"
              indices={tableIndices}
              onIndexSelect={(id) => {
                const match = tableIndices.find((row) => row.id === id);
                if (match?.symbol) handleSelectStock(match.symbol);
              }}
            />
          ) : null}

          {/* Commodities & ETFs Section */}
          <CommoditiesSection
            onSelectStock={handleSelectStock}
            watchlistSymbols={watchlist}
            isAuthenticated={isAuthenticated}
            onAddToWatchlist={handleAddMarketCardToWatchlist}
          />
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
                    <SidebarRow
                      key={stock.symbol}
                      primaryText={stock.symbol}
                      secondaryText={stock.companyName}
                      rightPrimaryText={formatCurrency(stock.currentPrice)}
                      rightSecondaryText={formatPercent(stock.changePercent ?? stock.dayChangePct)}
                      rightSecondaryClassName={
                        (stock.changePercent ?? stock.dayChangePct ?? 0) >= 0 ? "positive" : "negative"
                      }
                      onRowClick={() => handleSelectStock(stock.symbol)}
                      rowTitle={`Open ${stock.symbol} analysis`}
                      actionLabel="✕"
                      actionTitle="Remove from watchlist"
                      actionAriaLabel={`Remove ${stock.symbol} from watchlist`}
                      onActionClick={() => handleRemoveFromWatchlist(stock.symbol)}
                      actionVariant="danger"
                    />
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
                      <SidebarRow
                        key={holding.symbol}
                        primaryText={holding.symbol}
                        secondaryText={`Qty: ${Number(holding.quantity || 0).toFixed(4).replace(/\.0000$/, "")}`}
                        rightPrimaryText="View"
                        onRowClick={() => handleSelectStock(holding.symbol)}
                        rowTitle={`Open ${holding.symbol} analysis`}
                        actionLabel="→"
                        actionTitle="Manage portfolio"
                        actionAriaLabel="Open portfolio manager"
                        onActionClick={() => navigate("/portfolio")}
                        actionVariant="neutral"
                      />
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
