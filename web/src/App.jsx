import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import StockDetailView from "./components/StockDetailView";

const REFRESH_MS = 60_000;
const MARKER_OPTIONS = [8, 10, 12, 15, 20];
const PER_INDICATOR_OPTIONS = [2, 3, 4, 5];
const PERIOD_OPTIONS = ["week", "month", "quarter", "halfYear", "year"];

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

export default function App() {
  const initialView = getInitialViewState();
  const [payload, setPayload] = useState(null);
  const [selected, setSelected] = useState(initialView.selected);
  const [detailView, setDetailView] = useState(initialView.detailView);
  const [selectedPrediction, setSelectedPrediction] = useState(initialView.selectedPrediction);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(getInitialFilterQuery);
  const [markerSettings, setMarkerSettings] = useState(getInitialMarkerSettings);
  const effectiveSelectedPrediction = PERIOD_OPTIONS.includes(selectedPrediction)
    ? selectedPrediction
    : "week";

  async function loadData() {
    try {
      setError("");
      const { data } = await axios.get("/api/analyze", {
        params: {
          markers: markerSettings.markers,
          perIndicator: markerSettings.perIndicator,
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
    loadData();
    const timer = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [markerSettings.markers, markerSettings.perIndicator]);

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
    if (!normalized) return stocks;
    return stocks.filter(
      (item) =>
        item.symbol.toLowerCase().includes(normalized) ||
        item.companyName.toLowerCase().includes(normalized)
    );
  }, [stocks, query]);

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
          <p>Top-10 US market cap stocks: live data + news + LLM sentiment + multi-timeframe prediction.</p>
        </div>
        <button onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="overview-controls">
        <input
          type="text"
          className="stock-filter"
          placeholder="Filter stocks by symbol or company..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter stocks"
        />
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
