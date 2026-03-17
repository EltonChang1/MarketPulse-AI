import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const FALLBACK_COMMODITIES = [
  { symbol: "USO", displaySymbol: "USO", name: "Crude Oil", type: "Commodity", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "GLD", displaySymbol: "GLD", name: "Gold", type: "Commodity", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "SLV", displaySymbol: "SLV", name: "Silver", type: "Commodity", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "UUP", displaySymbol: "UUP", name: "US Dollar Index", type: "Currency", currentPrice: NaN, changePercent: NaN, candles: [] },
];

const FALLBACK_INDICATORS = [
  { symbol: "^GSPC", displaySymbol: "GSPC", name: "S&P 500", type: "Index", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "^DJI", displaySymbol: "DJI", name: "Dow Jones", type: "Index", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "^IXIC", displaySymbol: "IXIC", name: "NASDAQ Composite", type: "Index", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "^RUT", displaySymbol: "RUT", name: "Russell 2000", type: "Index", currentPrice: NaN, changePercent: NaN, candles: [] },
  { symbol: "^VIX", displaySymbol: "VIX", name: "CBOE Volatility Index", type: "Index", currentPrice: NaN, changePercent: NaN, candles: [] },
];

function MiniCandles({ candles = [] }) {
  const valid = candles.filter(
    (candle) =>
      typeof candle?.open === "number" &&
      typeof candle?.high === "number" &&
      typeof candle?.low === "number" &&
      typeof candle?.close === "number"
  );

  if (!valid.length) {
    return <div className="market-mini-candles-empty">No candle data</div>;
  }

  const width = 180;
  const height = 64;
  const padX = 8;
  const padY = 6;
  const lows = valid.map((c) => c.low);
  const highs = valid.map((c) => c.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = Math.max(max - min, 0.000001);
  const step = (width - padX * 2) / valid.length;
  const bodyWidth = Math.max(2, step * 0.55);

  const y = (price) => padY + ((max - price) / range) * (height - padY * 2);

  return (
    <svg className="market-mini-candles" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {valid.map((candle, idx) => {
        const xCenter = padX + idx * step + step / 2;
        const openY = y(candle.open);
        const closeY = y(candle.close);
        const highY = y(candle.high);
        const lowY = y(candle.low);
        const top = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        const up = candle.close >= candle.open;
        const color = up ? "#16a34a" : "#dc2626";

        return (
          <g key={`${candle.time || idx}-${idx}`}>
            <line x1={xCenter} y1={highY} x2={xCenter} y2={lowY} stroke={color} strokeWidth="1" />
            <rect
              x={xCenter - bodyWidth / 2}
              y={top}
              width={bodyWidth}
              height={bodyHeight}
              fill={color}
              rx="0.8"
            />
          </g>
        );
      })}
    </svg>
  );
}

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

export default function CommoditiesSection({ onSelectStock }) {
  const [commodities, setCommodities] = useState([]);
  const [marketIndicators, setMarketIndicators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/commodities-etfs`);
        const nextCommodities = data.commodities || [];
        const nextIndicators = data.indicators || data.etfs || [];

        setCommodities(nextCommodities.length ? nextCommodities : FALLBACK_COMMODITIES);
        setMarketIndicators(nextIndicators.length ? nextIndicators : FALLBACK_INDICATORS);
      } catch (error) {
        console.error("Failed to fetch commodities/ETFs:", error);
        setCommodities(FALLBACK_COMMODITIES);
        setMarketIndicators(FALLBACK_INDICATORS);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="commodities-section">
        <div className="section-loading">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="commodities-section">
      <div className="commodities-header">
        <h2>📈 Market Overview</h2>
        <p>Track essential commodities and market indices</p>
      </div>

      {/* Market Indicators */}
      <div className="commodities-subsection">
        <h3>📊 Market Indicators</h3>
        <div className="market-grid">
          {marketIndicators.map((item) => (
            <div
              key={item.symbol}
              className="market-card"
              onClick={() => onSelectStock(item.symbol)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectStock(item.symbol);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="market-card-header">
                <div className="market-symbol">{item.displaySymbol || item.symbol.replace(/^\^/, "")}</div>
                <span className="market-type">{item.type}</span>
              </div>
              <div className="market-name">{item.name}</div>
              <MiniCandles candles={item.candles} />
              <div className="market-price-row">
                <span className="market-price">{formatCurrency(item.currentPrice)}</span>
                <span className={`market-change ${(item.changePercent ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {formatPercent(item.changePercent)}
                </span>
              </div>
              <button className="market-card-btn">View Analysis →</button>
            </div>
          ))}
        </div>
      </div>

      {/* Commodities */}
      <div className="commodities-subsection">
        <h3>💰 Commodities & Indices</h3>
        <div className="market-grid">
          {commodities.map((item) => (
            <div
              key={item.symbol}
              className="market-card"
              onClick={() => onSelectStock(item.symbol)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectStock(item.symbol);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="market-card-header">
                <div className="market-symbol">{item.displaySymbol || item.symbol.replace(/^\^/, "")}</div>
                <span className="market-type">{item.type}</span>
              </div>
              <div className="market-name">{item.name}</div>
              <MiniCandles candles={item.candles} />
              <div className="market-price-row">
                <span className="market-price">{formatCurrency(item.currentPrice)}</span>
                <span className={`market-change ${(item.changePercent ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {formatPercent(item.changePercent)}
                </span>
              </div>
              <button className="market-card-btn">View Analysis →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
