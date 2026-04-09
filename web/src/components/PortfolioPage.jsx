import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { tokenColor } from "@/lib/themeTokens";
import {
  derivePortfolioHoldings,
  getPortfolioModelForUser,
  savePortfolioModelForUser,
  sortPortfolioTransactions,
} from "../context/portfolioStore";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import "../styles/dashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/** Allocation donut — saturated, distinct hues (OK on dark or light card backgrounds). */
const ALLOCATION_PALETTE = [
  "#38bdf8",
  "#fbbf24",
  "#a78bfa",
  "#4ade80",
  "#fb7185",
  "#2dd4bf",
  "#f97316",
  "#e879f9",
  "#22c55e",
  "#60a5fa",
];

/** Comparison chart — portfolio vs indexes; each series has a unique hue. */
const PORTFOLIO_LINE_COLOR = "#22d3ee";

const INDEX_BENCHMARK_DEFS = [
  { symbol: "^DJI", label: "DJIA", color: "#f59e0b" },
  { symbol: "^IXIC", label: "NASDAQ", color: "#a855f7" },
  { symbol: "^GSPC", label: "S&P 500", color: "#22c55e" },
  { symbol: "^RUT", label: "Russell 2000", color: "#fb7185" },
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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSymbol(raw) {
  return String(raw || "").trim().toUpperCase();
}

function dateToTs(date) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildConicGradient(segments, emptyColor) {
  if (!segments.length) return `conic-gradient(${emptyColor} 0deg, ${emptyColor} 360deg)`;

  let running = 0;
  const parts = segments.map((segment) => {
    const start = running;
    const end = running + segment.percentage * 3.6;
    running = end;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

function computeTimeAccuratePortfolioSeries(baseDates, transactions, pricesBySymbol) {
  if (!baseDates.length) return { valueSeries: [], returnSeries: [] };

  const txByDate = transactions.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  const latestPriceBySymbol = {};
  const qtyBySymbol = {};
  let netContributions = 0;

  const valueSeries = [];
  const returnSeries = [];

  for (const date of baseDates) {
    const dayTransactions = txByDate[date] || [];

    dayTransactions.forEach((tx) => {
      const currentQty = qtyBySymbol[tx.symbol] || 0;
      if (tx.side === "buy") {
        qtyBySymbol[tx.symbol] = currentQty + tx.quantity;
        netContributions += tx.quantity * tx.price;
      } else {
        qtyBySymbol[tx.symbol] = Math.max(0, currentQty - tx.quantity);
        netContributions -= tx.quantity * tx.price;
      }
    });

    Object.entries(pricesBySymbol).forEach(([symbol, points]) => {
      const exact = points.byDate.get(date);
      if (typeof exact === "number") {
        latestPriceBySymbol[symbol] = exact;
      }
    });

    let portfolioValue = 0;
    Object.keys(qtyBySymbol).forEach((symbol) => {
      const qty = qtyBySymbol[symbol] || 0;
      const px = latestPriceBySymbol[symbol];
      if (qty > 0 && typeof px === "number") {
        portfolioValue += qty * px;
      }
    });

    if (portfolioValue <= 0 && netContributions <= 0) continue;

    valueSeries.push({
      date,
      value: portfolioValue,
      contributions: netContributions,
    });

    const denominator = Math.max(Math.abs(netContributions), 1);
    returnSeries.push({
      date,
      value: ((portfolioValue - netContributions) / denominator) * 100,
    });
  }

  return { valueSeries, returnSeries };
}

function computeBenchmarkSeries(baseDates, points, startDate) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const filteredDates = baseDates.filter((date) => !startDate || date >= startDate);
  if (!filteredDates.length) return [];

  const byDate = new Map(points.map((point) => [point.date, point.close]));
  let latestKnown = null;
  let baseline = null;
  const result = [];

  filteredDates.forEach((date) => {
    const exact = byDate.get(date);
    if (typeof exact === "number") {
      latestKnown = exact;
    }

    if (typeof latestKnown !== "number") return;
    if (baseline === null) baseline = latestKnown;

    result.push({
      date,
      value: ((latestKnown - baseline) / baseline) * 100,
    });
  });

  return result;
}

function ComparisonChart({ portfolioSeries, benchmarkSeries, chartColors }) {
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

  const min = Math.min(-10, Math.floor(Math.min(...allPoints) - 5));
  const max = Math.max(10, Math.ceil(Math.max(...allPoints) + 5));
  const range = Math.max(1, max - min);
  const xCount = Math.max(1, portfolioSeries.length - 1);

  const x = (index) => pad.left + (index / xCount) * (width - pad.left - pad.right);
  const y = (value) => pad.top + ((max - value) / range) * (height - pad.top - pad.bottom);

  const pathFromSeries = (series) =>
    series
      .map((point, idx) => `${idx === 0 ? "M" : "L"}${x(idx)},${y(point.value)}`)
      .join(" ");

  const firstDate = portfolioSeries[0]?.date;
  const lastDate = portfolioSeries[portfolioSeries.length - 1]?.date;

  return (
    <div className="portfolio-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="portfolio-line-chart" role="img" aria-label="Portfolio return compared to indexes">
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const value = max - step * range;
          const yPos = y(value);
          return (
            <g key={step}>
              <line x1={pad.left} y1={yPos} x2={width - pad.right} y2={yPos} stroke={chartColors.grid} strokeWidth="1" />
              <text x={6} y={yPos + 4} className="portfolio-axis-label">{value.toFixed(0)}%</text>
            </g>
          );
        })}

        <line
          x1={pad.left}
          y1={y(0)}
          x2={width - pad.right}
          y2={y(0)}
          stroke={chartColors.zeroLine}
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />

        <path
          d={pathFromSeries(portfolioSeries)}
          fill="none"
          stroke={chartColors.portfolio}
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {benchmarkSeries.map((item) => (
          <path
            key={item.symbol}
            d={pathFromSeries(item.series)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.98"
          />
        ))}

        <text x={pad.left} y={height - 10} className="portfolio-axis-label">{firstDate || "-"}</text>
        <text x={width - 90} y={height - 10} className="portfolio-axis-label">{lastDate || "-"}</text>
      </svg>

      <div className="portfolio-line-legend">
        <span><i style={{ background: chartColors.portfolio }} /> Portfolio</span>
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
  const { theme } = useTheme();
  const chartColors = useMemo(() => {
    const isDark = theme === "dark";
    return {
      portfolio: PORTFOLIO_LINE_COLOR,
      grid: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(15, 23, 42, 0.12)",
      zeroLine: isDark ? "rgba(255, 255, 255, 0.42)" : "rgba(15, 23, 42, 0.35)",
      conicEmpty: isDark ? "rgba(255, 255, 255, 0.08)" : tokenColor("border"),
    };
  }, [theme]);

  const [transactions, setTransactions] = useState(() => getPortfolioModelForUser(user).transactions || []);
  const [symbolInput, setSymbolInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [dateInput, setDateInput] = useState(todayString());
  const [sideInput, setSideInput] = useState("buy");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [marketSnapshots, setMarketSnapshots] = useState({});
  const [comparisonSeries, setComparisonSeries] = useState({ portfolio: [], benchmarks: [] });

  useEffect(() => {
    setTransactions(getPortfolioModelForUser(user).transactions || []);
  }, [user?.email]);

  useEffect(() => {
    savePortfolioModelForUser(user, {
      transactions,
      updatedAt: new Date().toISOString(),
    });
  }, [transactions, user]);

  const holdings = useMemo(() => derivePortfolioHoldings(transactions), [transactions]);

  useEffect(() => {
    async function loadPortfolioData() {
      if (!transactions.length) {
        setMarketSnapshots({});
        setComparisonSeries({ portfolio: [], benchmarks: [] });
        return;
      }

      setLoading(true);
      setError("");
      try {
        const symbols = [...new Set(transactions.map((tx) => tx.symbol))];

        const detailEntries = await Promise.all(
          symbols.map(async (symbol) => {
            const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(symbol)}`, {
              params: { markers: 10, perIndicator: 3 },
            });
            return [symbol, data];
          })
        );

        const detailMap = Object.fromEntries(detailEntries);
        setMarketSnapshots(detailMap);

        const benchmarkResponses = await Promise.all(
          INDEX_BENCHMARK_DEFS.map(async (benchmark) => {
            const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(benchmark.symbol)}`, {
              params: { markers: 10, perIndicator: 3 },
            });
            return {
              ...benchmark,
              candlestickData: (data.candlestickData || []).slice(-520).map((point) => ({
                date: point.date,
                close: point.close,
              })),
            };
          })
        );

        const priceSeriesBySymbol = Object.fromEntries(
          symbols.map((symbol) => {
            const points = (detailMap[symbol]?.candlestickData || []).slice(-520).map((point) => ({
              date: point.date,
              close: point.close,
            }));
            return [
              symbol,
              {
                points,
                byDate: new Map(points.map((point) => [point.date, point.close])),
              },
            ];
          })
        );

        const allDates = new Set();
        symbols.forEach((symbol) => {
          (priceSeriesBySymbol[symbol]?.points || []).forEach((point) => {
            if (point.date) allDates.add(point.date);
          });
        });

        transactions.forEach((tx) => {
          if (tx.date) allDates.add(tx.date);
        });

        const baseDates = [...allDates].sort((left, right) => dateToTs(left) - dateToTs(right));
        const { returnSeries } = computeTimeAccuratePortfolioSeries(baseDates, sortPortfolioTransactions(transactions), priceSeriesBySymbol);

        const startDate = returnSeries[0]?.date;
        const benchmarkSeries = benchmarkResponses.map((benchmark) => ({
          symbol: benchmark.symbol,
          label: benchmark.label,
          color: benchmark.color,
          series: computeBenchmarkSeries(baseDates, benchmark.candlestickData, startDate),
        }));

        setComparisonSeries({
          portfolio: returnSeries,
          benchmarks: benchmarkSeries,
        });
      } catch (loadError) {
        setError(loadError?.response?.data?.message || loadError.message || "Unable to load portfolio data");
      } finally {
        setLoading(false);
      }
    }

    loadPortfolioData();
  }, [transactions]);

  const holdingRows = useMemo(() => {
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
    const cost = holdingRows.reduce((acc, row) => acc + (row.costBasis || 0), 0);
    const value = holdingRows.reduce((acc, row) => acc + (row.marketValue || 0), 0);
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
    return { cost, value, gain, gainPct };
  }, [holdingRows]);

  const pieSegments = useMemo(() => {
    if (totals.value <= 0) return [];

    return holdingRows
      .filter((row) => typeof row.marketValue === "number" && row.marketValue > 0)
      .map((row, idx) => ({
        symbol: row.symbol,
        value: row.marketValue,
        percentage: (row.marketValue / totals.value) * 100,
        color: ALLOCATION_PALETTE[idx % ALLOCATION_PALETTE.length],
      }));
  }, [holdingRows, totals.value]);

  function clearInputs() {
    setSymbolInput("");
    setQuantityInput("");
    setPriceInput("");
    setDateInput(todayString());
    setSideInput("buy");
  }

  async function handleAddTransaction(event) {
    event.preventDefault();
    setError("");

    const symbol = normalizeSymbol(symbolInput);
    const quantity = Number(quantityInput);
    const manualPrice = Number(priceInput);
    const date = dateInput || todayString();

    if (!symbol) {
      setError("Enter a stock symbol.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Enter a valid quantity greater than 0.");
      return;
    }

    const currentHolding = holdings.find((row) => row.symbol === symbol);
    if (sideInput === "sell" && (!currentHolding || currentHolding.quantity < quantity)) {
      setError(`Cannot sell ${quantity} shares of ${symbol}. You currently hold ${currentHolding?.quantity || 0}.`);
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(symbol)}`, {
        params: { markers: 10, perIndicator: 3 },
      });

      const fallbackPrice = typeof data?.currentPrice === "number" ? data.currentPrice : 0;
      const tradePrice = Number.isFinite(manualPrice) && manualPrice > 0 ? manualPrice : fallbackPrice;

      if (!tradePrice || tradePrice <= 0) {
        setError(`Unable to determine trade price for ${symbol}. Enter a price manually.`);
        return;
      }

      const tx = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        side: sideInput,
        symbol,
        quantity,
        price: tradePrice,
        date,
        createdAt: new Date().toISOString(),
      };

      setTransactions((prev) => sortPortfolioTransactions([...prev, tx]));
      clearInputs();
    } catch (addError) {
      setError(addError?.response?.data?.message || addError.message || `Unable to add transaction for ${symbol}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteTransaction(id) {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  const chartBackground = buildConicGradient(pieSegments, chartColors.conicEmpty);

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>My Portfolio</h1>
          <p>Track holdings, allocation, transactions, and performance against major market indexes.</p>
        </div>
        <Button variant="outline" className="portfolio-back-btn" onClick={() => navigate("/")}>← Back to Dashboard</Button>
      </div>

      <section className="portfolio-grid-top">
        <Card className="portfolio-card">
          <CardContent className="p-5">
          <h3>Add Transaction</h3>
          <form className="portfolio-form" onSubmit={handleAddTransaction}>
            <label>
              Side
              <select value={sideInput} onChange={(event) => setSideInput(event.target.value)}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>
            <label>
              Symbol
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
              Trade Price (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
                placeholder="Auto-uses live price"
              />
            </label>
            <label>
              Trade Date
              <input
                type="date"
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
              />
            </label>
            <Button type="submit" className="portfolio-add-btn" disabled={loading}>{loading ? "Saving..." : "Add Transaction"}</Button>
          </form>
          {error ? <div className="portfolio-error">⚠️ {error}</div> : null}
          </CardContent>
        </Card>

        <Card className="portfolio-card">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>
      </section>

      <section className="portfolio-grid-middle">
        <Card className="portfolio-card">
          <CardContent className="p-5">
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
            <div className="portfolio-empty">Add transactions to view allocation chart.</div>
          )}
          </CardContent>
        </Card>

        <Card className="portfolio-card">
          <CardContent className="p-5">
          <h3>Portfolio vs Market Indexes</h3>
          <ComparisonChart
            portfolioSeries={comparisonSeries.portfolio}
            benchmarkSeries={comparisonSeries.benchmarks}
            chartColors={chartColors}
          />
          </CardContent>
        </Card>
      </section>

      <Card className="portfolio-card">
        <CardContent className="p-5">
        <h3>Holdings</h3>
        {holdingRows.length ? (
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
                </tr>
              </thead>
              <tbody>
                {holdingRows.map((row) => (
                  <tr key={row.symbol}>
                    <td>{row.symbol}</td>
                    <td>{row.quantity.toFixed(4).replace(/\.0000$/, "")}</td>
                    <td>{formatCurrency(row.buyPrice)}</td>
                    <td>{formatCurrency(row.currentPrice)}</td>
                    <td>{formatCurrency(row.marketValue)}</td>
                    <td className={row.gain >= 0 ? "positive" : "negative"}>{formatCurrency(row.gain)}</td>
                    <td className={row.gainPct >= 0 ? "positive" : "negative"}>{formatPercent(row.gainPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portfolio-empty">No active holdings yet.</div>
        )}
        </CardContent>
      </Card>

      <Card className="portfolio-card">
        <CardContent className="p-5">
        <h3>Transaction History</h3>
        {transactions.length ? (
          <div className="portfolio-table-wrap">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Side</th>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortPortfolioTransactions(transactions)
                  .slice()
                  .reverse()
                  .map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.date)}</td>
                      <td>
                        <Badge className={`portfolio-side-pill ${tx.side === "buy" ? "buy" : "sell"}`} variant="outline">
                          {tx.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{tx.symbol}</td>
                      <td>{tx.quantity.toFixed(4).replace(/\.0000$/, "")}</td>
                      <td>{formatCurrency(tx.price)}</td>
                      <td>{formatCurrency(tx.quantity * tx.price)}</td>
                      <td>
                        <Button variant="ghost" size="sm" className="portfolio-row-remove" onClick={() => handleDeleteTransaction(tx.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portfolio-empty">No transactions yet. Add your first buy above.</div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
