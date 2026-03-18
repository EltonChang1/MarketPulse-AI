import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPortfolioForUser, savePortfolioForUser } from "../context/portfolioStore";
import "../styles/dashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const INDEX_BENCHMARKS = [
  { symbol: "^DJI", label: "DJIA", color: "#6f9735" },
  { symbol: "^IXIC", label: "NASDAQ", color: "#9b3b73" },
  { symbol: "^GSPC", label: "S&P 500", color: "#374151" },
  { symbol: "^RUT", label: "Russell 2000", color: "#cc6b00" },
];

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

function normalizeSymbol(raw) {
  return String(raw || "").trim().toUpperCase();
}

function buildConicGradient(segments) {
  if (!segments.length) return "conic-gradient(#e5e7eb 0deg, #e5e7eb 360deg)";

  let running = 0;
  const parts = segments.map((segment) => {
    const start = running;
    const end = running + segment.percentage * 3.6;
    running = end;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

function dateToTs(date) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function computeSeriesFromPrices(baseDates, pricesBySymbol, holdings) {
  const weightedPrices = holdings.map((holding) => {
    const points = pricesBySymbol[holding.symbol] || [];
    const byDate = new Map(points.map((point) => [point.date, point.close]));

    return {
      holding,
      byDate,
      latestKnown: null,
    };
  });

  const series = [];
  let baseline = null;

  for (const date of baseDates) {
    let totalValue = 0;

    weightedPrices.forEach((item) => {
      const exact = item.byDate.get(date);
      if (typeof exact === "number") {
        item.latestKnown = exact;
      }
      if (typeof item.latestKnown === "number") {
        totalValue += item.latestKnown * item.holding.quantity;
      }
    });

    if (totalValue <= 0) continue;
    if (baseline === null) baseline = totalValue;

    series.push({
      date,
      value: ((totalValue - baseline) / baseline) * 100,
    });
  }

  return series;
}

function computeBenchmarkSeries(baseDates, points) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const byDate = new Map(points.map((point) => [point.date, point.close]));
  let latestKnown = null;
  let baseline = null;
  const result = [];

  for (const date of baseDates) {
    const exact = byDate.get(date);
    if (typeof exact === "number") {
      latestKnown = exact;
    }

    if (typeof latestKnown !== "number") continue;
    if (baseline === null) baseline = latestKnown;

    result.push({
      date,
      value: ((latestKnown - baseline) / baseline) * 100,
    });
  }

  return result;
}

function ComparisonChart({ portfolioSeries, benchmarkSeries }) {
  const width = 920;
  const height = 300;
  const pad = { top: 16, right: 14, bottom: 34, left: 40 };

  const allPoints = [
    ...portfolioSeries.map((point) => point.value),
    ...benchmarkSeries.flatMap((item) => item.series.map((point) => point.value)),
  ];

  if (!allPoints.length) {
    return <div className="portfolio-empty">Not enough historical data to render comparison.</div>;
  }

  const min = Math.min(-5, Math.floor(Math.min(...allPoints) - 5));
  const max = Math.max(5, Math.ceil(Math.max(...allPoints) + 5));
  const range = Math.max(1, max - min);
  const xCount = Math.max(1, portfolioSeries.length - 1);

  const x = (index) => pad.left + (index / xCount) * (width - pad.left - pad.right);
  const y = (value) => pad.top + ((max - value) / range) * (height - pad.top - pad.bottom);

  const pathFromSeries = (series) =>
    series
      .map((point, idx) => `${idx === 0 ? "M" : "L"}${x(idx)},${y(point.value)}`)
      .join(" ");

  const lastDate = portfolioSeries[portfolioSeries.length - 1]?.date;
  const firstDate = portfolioSeries[0]?.date;

  return (
    <div className="portfolio-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="portfolio-line-chart" role="img" aria-label="Portfolio vs index comparison chart">
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const value = max - step * range;
          const yPos = y(value);
          return (
            <g key={step}>
              <line x1={pad.left} y1={yPos} x2={width - pad.right} y2={yPos} stroke="#e5e7eb" strokeWidth="1" />
              <text x={6} y={yPos + 4} className="portfolio-axis-label">{value.toFixed(0)}%</text>
            </g>
          );
        })}

        <line x1={pad.left} y1={y(0)} x2={width - pad.right} y2={y(0)} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.2" />

        <path d={pathFromSeries(portfolioSeries)} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
        {benchmarkSeries.map((item) => (
          <path key={item.symbol} d={pathFromSeries(item.series)} fill="none" stroke={item.color} strokeWidth="2" opacity="0.9" />
        ))}

        <text x={pad.left} y={height - 10} className="portfolio-axis-label">{firstDate || "-"}</text>
        <text x={width - 90} y={height - 10} className="portfolio-axis-label">{lastDate || "-"}</text>
      </svg>

      <div className="portfolio-line-legend">
        <span><i style={{ background: "#0ea5e9" }} /> Portfolio</span>
        {benchmarkSeries.map((item) => (
          <span key={item.symbol}><i style={{ background: item.color }} /> {item.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [holdings, setHoldings] = useState(() => getPortfolioForUser(user));
  const [symbolInput, setSymbolInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [purchaseInput, setPurchaseInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [marketSnapshots, setMarketSnapshots] = useState({});
  const [comparisonSeries, setComparisonSeries] = useState({ portfolio: [], benchmarks: [] });

  useEffect(() => {
    setHoldings(getPortfolioForUser(user));
  }, [user?.email]);

  useEffect(() => {
    savePortfolioForUser(user, holdings);
  }, [holdings, user]);

  useEffect(() => {
    async function loadPortfolioData() {
      if (!holdings.length) {
        setMarketSnapshots({});
        setComparisonSeries({ portfolio: [], benchmarks: [] });
        return;
      }

      setLoading(true);
      try {
        const symbols = [...new Set(holdings.map((holding) => holding.symbol))];
        const details = await Promise.all(
          symbols.map(async (symbol) => {
            const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(symbol)}`, {
              params: { markers: 10, perIndicator: 3 },
            });
            return [symbol, data];
          })
        );

        const detailMap = Object.fromEntries(details);
        setMarketSnapshots(detailMap);

        const benchmarkResponses = await Promise.all(
          INDEX_BENCHMARKS.map(async (benchmark) => {
            const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(benchmark.symbol)}`, {
              params: { markers: 10, perIndicator: 3 },
            });
            return {
              ...benchmark,
              candlestickData: (data.candlestickData || []).slice(-252).map((point) => ({
                date: point.date,
                close: point.close,
              })),
            };
          })
        );

        const allDates = new Set();
        symbols.forEach((symbol) => {
          const points = detailMap[symbol]?.candlestickData || [];
          points.slice(-252).forEach((point) => {
            if (point.date) allDates.add(point.date);
          });
        });

        const baseDates = [...allDates].sort((left, right) => dateToTs(left) - dateToTs(right));
        const pricesBySymbol = Object.fromEntries(
          symbols.map((symbol) => [
            symbol,
            (detailMap[symbol]?.candlestickData || []).slice(-252).map((point) => ({
              date: point.date,
              close: point.close,
            })),
          ])
        );

        const portfolioSeries = computeSeriesFromPrices(baseDates, pricesBySymbol, holdings);
        const benchmarkSeries = benchmarkResponses.map((benchmark) => ({
          symbol: benchmark.symbol,
          label: benchmark.label,
          color: benchmark.color,
          series: computeBenchmarkSeries(baseDates, benchmark.candlestickData),
        }));

        setComparisonSeries({
          portfolio: portfolioSeries,
          benchmarks: benchmarkSeries,
        });
      } catch (loadError) {
        setError(loadError?.response?.data?.message || loadError.message || "Unable to load portfolio data");
      } finally {
        setLoading(false);
      }
    }

    loadPortfolioData();
  }, [holdings]);

  const rows = useMemo(() => {
    return holdings.map((holding) => {
      const market = marketSnapshots[holding.symbol] || {};
      const currentPrice = market.currentPrice;
      const marketValue = typeof currentPrice === "number" ? currentPrice * holding.quantity : null;
      const costBasis = holding.quantity * holding.buyPrice;
      const gain = marketValue !== null ? marketValue - costBasis : null;
      const gainPct = gain !== null && costBasis > 0 ? (gain / costBasis) * 100 : null;

      return {
        ...holding,
        currentPrice,
        marketValue,
        costBasis,
        gain,
        gainPct,
      };
    });
  }, [holdings, marketSnapshots]);

  const totals = useMemo(() => {
    const cost = rows.reduce((acc, row) => acc + (row.costBasis || 0), 0);
    const value = rows.reduce((acc, row) => acc + (row.marketValue || 0), 0);
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
    return { cost, value, gain, gainPct };
  }, [rows]);

  const pieSegments = useMemo(() => {
    if (totals.value <= 0) return [];

    const palette = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626", "#475569", "#ca8a04"];
    return rows
      .filter((row) => typeof row.marketValue === "number" && row.marketValue > 0)
      .map((row, idx) => ({
        symbol: row.symbol,
        value: row.marketValue,
        percentage: (row.marketValue / totals.value) * 100,
        color: palette[idx % palette.length],
      }));
  }, [rows, totals.value]);

  function clearInputs() {
    setSymbolInput("");
    setQuantityInput("");
    setPurchaseInput("");
  }

  async function handleAddHolding(event) {
    event.preventDefault();
    setError("");

    const symbol = normalizeSymbol(symbolInput);
    const quantity = Number(quantityInput);
    const manualBuyPrice = Number(purchaseInput);

    if (!symbol) {
      setError("Enter a stock symbol.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Enter a valid quantity greater than 0.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(symbol)}`, {
        params: { markers: 10, perIndicator: 3 },
      });

      const fallbackPrice = typeof data?.currentPrice === "number" ? data.currentPrice : 0;
      const buyPrice = Number.isFinite(manualBuyPrice) && manualBuyPrice > 0 ? manualBuyPrice : fallbackPrice;

      if (!buyPrice || buyPrice <= 0) {
        setError(`Unable to determine buy price for ${symbol}. Enter buy price manually.`);
        return;
      }

      setHoldings((prev) => {
        const existing = prev.find((item) => item.symbol === symbol);
        if (!existing) {
          return [
            ...prev,
            {
              symbol,
              quantity,
              buyPrice,
              createdAt: new Date().toISOString(),
            },
          ];
        }

        const combinedQty = existing.quantity + quantity;
        const weightedBuyPrice = (existing.quantity * existing.buyPrice + quantity * buyPrice) / combinedQty;

        return prev.map((item) =>
          item.symbol === symbol
            ? {
                ...item,
                quantity: combinedQty,
                buyPrice: weightedBuyPrice,
                createdAt: item.createdAt || new Date().toISOString(),
              }
            : item
        );
      });

      clearInputs();
    } catch (addError) {
      setError(addError?.response?.data?.message || addError.message || `Unable to add ${symbol}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteHolding(symbol) {
    setHoldings((prev) => prev.filter((item) => item.symbol !== symbol));
  }

  const chartBackground = buildConicGradient(pieSegments);

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>My Portfolio</h1>
          <p>Track holdings, allocation, and performance against major market indexes.</p>
        </div>
        <button className="portfolio-back-btn" onClick={() => navigate("/")}>← Back to Dashboard</button>
      </div>

      <section className="portfolio-grid-top">
        <div className="portfolio-card">
          <h3>Add Position</h3>
          <form className="portfolio-form" onSubmit={handleAddHolding}>
            <label>
              Stock Symbol
              <input
                type="text"
                value={symbolInput}
                onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                placeholder="AAPL"
                maxLength={10}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0"
                step="0.0001"
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
                placeholder="10"
              />
            </label>
            <label>
              Buy Price (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchaseInput}
                onChange={(event) => setPurchaseInput(event.target.value)}
                placeholder="Auto-uses live price"
              />
            </label>
            <button type="submit" className="portfolio-add-btn" disabled={loading}>{loading ? "Adding..." : "Add to Portfolio"}</button>
          </form>
          {error ? <div className="portfolio-error">⚠️ {error}</div> : null}
        </div>

        <div className="portfolio-card">
          <h3>Portfolio Performance</h3>
          <div className="portfolio-stats-grid">
            <div>
              <span>Total Cost Basis</span>
              <strong>{formatCurrency(totals.cost)}</strong>
            </div>
            <div>
              <span>Current Value</span>
              <strong>{formatCurrency(totals.value)}</strong>
            </div>
            <div>
              <span>Total Gain / Loss</span>
              <strong className={totals.gain >= 0 ? "positive" : "negative"}>{formatCurrency(totals.gain)}</strong>
            </div>
            <div>
              <span>Total Return</span>
              <strong className={totals.gainPct >= 0 ? "positive" : "negative"}>{formatPercent(totals.gainPct)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="portfolio-grid-middle">
        <div className="portfolio-card">
          <h3>Allocation</h3>
          {pieSegments.length ? (
            <>
              <div className="portfolio-donut" style={{ background: chartBackground }}>
                <div className="portfolio-donut-center">
                  <strong>{formatCurrency(totals.value)}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="portfolio-legend">
                {pieSegments.map((segment) => (
                  <div key={segment.symbol} className="portfolio-legend-row">
                    <i style={{ background: segment.color }} />
                    <span>{segment.symbol}</span>
                    <span>{segment.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="portfolio-empty">Add holdings to view allocation chart.</div>
          )}
        </div>

        <div className="portfolio-card">
          <h3>Portfolio vs Market Indexes</h3>
          <ComparisonChart
            portfolioSeries={comparisonSeries.portfolio}
            benchmarkSeries={comparisonSeries.benchmarks}
          />
        </div>
      </section>

      <section className="portfolio-card">
        <h3>Holdings</h3>
        {rows.length ? (
          <div className="portfolio-table-wrap">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Buy</th>
                  <th>Current</th>
                  <th>Market Value</th>
                  <th>Gain/Loss</th>
                  <th>Return</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.symbol}>
                    <td>{row.symbol}</td>
                    <td>{row.quantity.toFixed(4).replace(/\.0000$/, "")}</td>
                    <td>{formatCurrency(row.buyPrice)}</td>
                    <td>{formatCurrency(row.currentPrice)}</td>
                    <td>{formatCurrency(row.marketValue)}</td>
                    <td className={row.gain >= 0 ? "positive" : "negative"}>{formatCurrency(row.gain)}</td>
                    <td className={row.gainPct >= 0 ? "positive" : "negative"}>{formatPercent(row.gainPct)}</td>
                    <td>
                      <button className="portfolio-row-remove" onClick={() => handleDeleteHolding(row.symbol)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portfolio-empty">No holdings yet. Add your first stock above.</div>
        )}
      </section>
    </div>
  );
}
