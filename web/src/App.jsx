import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const REFRESH_MS = 60_000;

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

export default function App() {
  const [payload, setPayload] = useState(null);
  const [selected, setSelected] = useState("AAPL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      const { data } = await axios.get("/api/analyze");
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
  }, []);

  const stocks = payload?.data || [];
  const selectedStock = useMemo(
    () => stocks.find((item) => item.symbol === selected) || stocks[0],
    [stocks, selected]
  );

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>MarketPulse AI</h1>
          <p>Top-5 US market cap stocks: live data + news + LLM sentiment + 1-week prediction.</p>
        </div>
        <button onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="cards">
        {stocks.map((item) => (
          <button
            key={item.symbol}
            className={`card ${selected === item.symbol ? "active" : ""}`}
            onClick={() => setSelected(item.symbol)}
          >
            <div className="row">
              <h3>{item.symbol}</h3>
              <span className={scoreBadge(item.sentiment?.impact)}>{item.sentiment?.impact || "neutral"}</span>
            </div>
            <p className="company">{item.companyName}</p>
            <p className="price">{formatCurrency(item.currentPrice)}</p>
            <p className={item.dayChangePct >= 0 ? "up" : "down"}>{formatPercent(item.dayChangePct)}</p>
            <p className="sub">Market cap: {marketCapLabel(item.marketCap)}</p>
          </button>
        ))}
      </section>

      {selectedStock ? (
        <section className="detail">
          <h2>
            {selectedStock.companyName} ({selectedStock.symbol})
          </h2>
          <div className="grid">
            <div className="panel">
              <h4>Prediction (1 Week)</h4>
              <p className="value">{formatCurrency(selectedStock.technicalForecast?.predictedPriceInWeek)}</p>
              <p className={selectedStock.technicalForecast?.expectedMovePct >= 0 ? "up" : "down"}>
                {formatPercent(selectedStock.technicalForecast?.expectedMovePct)} expected move
              </p>
              <p>Direction: {selectedStock.technicalForecast?.direction}</p>
            </div>

            <div className="panel">
              <h4>News Impact</h4>
              <p className={scoreBadge(selectedStock.sentiment?.impact)}>{selectedStock.sentiment?.impact}</p>
              <p>Confidence: {Math.round((selectedStock.sentiment?.confidence || 0) * 100)}%</p>
              <p>{selectedStock.sentiment?.summary}</p>
            </div>

            <div className="panel">
              <h4>Technical Indicators</h4>
              <ul>
                <li>SMA 5: {selectedStock.technicalForecast?.indicators?.sma5}</li>
                <li>SMA 20: {selectedStock.technicalForecast?.indicators?.sma20}</li>
                <li>RSI 14: {selectedStock.technicalForecast?.indicators?.rsi14}</li>
                <li>MACD: {selectedStock.technicalForecast?.indicators?.macd}</li>
                <li>MACD Signal: {selectedStock.technicalForecast?.indicators?.macdSignal}</li>
                <li>30d Trend: {formatPercent(selectedStock.technicalForecast?.indicators?.trendPct30d)}</li>
              </ul>
            </div>
          </div>

          <div className="panel news">
            <h4>Latest News</h4>
            <ul>
              {(selectedStock.news || []).map((item, idx) => (
                <li key={`${item.link}-${idx}`}>
                  <a href={item.link} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                  <span>{item.pubDate ? new Date(item.pubDate).toLocaleString() : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <footer>
        <small>
          Updated: {payload?.generatedAt ? new Date(payload.generatedAt).toLocaleString() : "-"} · Refreshes every 60 seconds.
        </small>
      </footer>
    </div>
  );
}
