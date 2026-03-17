import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const FALLBACK_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "JPM", "BRK-B"];

const EMPTY_LIST = [];

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

function formatVolume(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function toCardItem(stock = {}) {
  const candles = Array.isArray(stock.candlestickData)
    ? stock.candlestickData.slice(-24).map((point) => ({
        time: point?.date || point?.time,
        open: point?.open,
        high: point?.high,
        low: point?.low,
        close: point?.close,
      }))
    : [];

  return {
    symbol: stock.symbol,
    displaySymbol: (stock.symbol || "").replace(/^\^/, ""),
    name: stock.companyName || stock.symbol,
    type: "Stock",
    currentPrice: stock.currentPrice,
    changePercent: stock.dayChangePct,
    candles,
    volume: stock.technicalForecast?.reversalMetrics?.currentVolume,
  };
}

function buildFallbackMovers(items = []) {
  const byChangeDesc = [...items].sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  const byChangeAsc = [...items].sort((a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity));
  const byVolumeDesc = [...items].sort((a, b) => (b.volume ?? -Infinity) - (a.volume ?? -Infinity));

  return {
    mostActive: byVolumeDesc.slice(0, 5),
    gainers: byChangeDesc.slice(0, 5),
    losers: byChangeAsc.slice(0, 5),
    ipoThisMonth: EMPTY_LIST,
  };
}

function MarketCard({ item, onSelectStock }) {
  return (
    <div
      key={item.symbol}
      className="market-card market-card-lg"
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
      {typeof item.volume === "number" ? <div className="market-volume">Vol: {formatVolume(item.volume)}</div> : null}
      <button className="market-card-btn">View Analysis →</button>
    </div>
  );
}

function MoversList({ title, items, onSelectStock }) {
  return (
    <div className="movers-list-card">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <div className="movers-empty">No data available</div>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={`${title}-${item.symbol}`} onClick={() => onSelectStock(item.symbol)}>
              <span className="movers-symbol">{item.displaySymbol || item.symbol.replace(/^\^/, "")}</span>
              <span className="movers-price">{formatCurrency(item.currentPrice)}</span>
              <span className={`movers-change ${(item.changePercent ?? 0) >= 0 ? "positive" : "negative"}`}>
                {formatPercent(item.changePercent)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CommoditiesSection({ onSelectStock }) {
  const [commodities, setCommodities] = useState(EMPTY_LIST);
  const [marketIndicators, setMarketIndicators] = useState(EMPTY_LIST);
  const [topVolumeStocks, setTopVolumeStocks] = useState(EMPTY_LIST);
  const [movers, setMovers] = useState({
    mostActive: EMPTY_LIST,
    gainers: EMPTY_LIST,
    losers: EMPTY_LIST,
    ipoThisMonth: EMPTY_LIST,
  });
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("overview");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/commodities-etfs`);
        const nextCommodities = data.commodities || [];
        const nextIndicators = data.indicators || data.etfs || [];
        const nextTopVolume = data.topVolumeStocks || [];
        const nextMovers = data.movers || {};

        setCommodities(nextCommodities);
        setMarketIndicators(nextIndicators);
        setTopVolumeStocks(nextTopVolume);
        setMovers({
          mostActive: nextMovers.mostActive || EMPTY_LIST,
          gainers: nextMovers.gainers || EMPTY_LIST,
          losers: nextMovers.losers || EMPTY_LIST,
          ipoThisMonth: nextMovers.ipoThisMonth || EMPTY_LIST,
        });
        setDataSource("overview");
      } catch (error) {
        console.error("Failed to fetch commodities/ETFs:", error);
        try {
          const symbols = FALLBACK_SYMBOLS.join(",");
          const { data: fallbackData } = await axios.get(`${API_BASE_URL}/api/analyze`, {
            params: { symbols, markers: 10, perIndicator: 3 },
          });

          const fallbackItems = (fallbackData?.data || []).map(toCardItem);
          setCommodities(EMPTY_LIST);
          setMarketIndicators(fallbackItems.slice(0, 5));
          setTopVolumeStocks(fallbackItems.slice(5));
          setMovers(buildFallbackMovers(fallbackItems));
          setDataSource("stocks-fallback");
        } catch (fallbackError) {
          console.error("Fallback market data failed:", fallbackError);
          setCommodities(EMPTY_LIST);
          setMarketIndicators(EMPTY_LIST);
          setTopVolumeStocks(EMPTY_LIST);
          setMovers({
            mostActive: EMPTY_LIST,
            gainers: EMPTY_LIST,
            losers: EMPTY_LIST,
            ipoThisMonth: EMPTY_LIST,
          });
          setDataSource("empty");
        }
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
        {dataSource === "stocks-fallback" ? (
          <p className="market-overview-note">Live commodities feed is unavailable right now. Showing live stock market fallback data.</p>
        ) : null}
      </div>

      {/* Market Indicators */}
      <div className="commodities-subsection">
        <h3>📊 Market Indicators</h3>
        <div className="market-grid">
          {marketIndicators.map((item) => <MarketCard key={item.symbol} item={item} onSelectStock={onSelectStock} />)}
        </div>
      </div>

      {/* Commodities */}
      <div className="commodities-subsection">
        <h3>💰 Commodities</h3>
        <div className="market-grid">
          {commodities.map((item) => <MarketCard key={item.symbol} item={item} onSelectStock={onSelectStock} />)}
        </div>
      </div>

      {/* Top volume stocks */}
      <div className="commodities-subsection">
        <h3>🏆 Top 5 Individual Stocks by Volume</h3>
        <div className="market-grid">
          {topVolumeStocks.map((item) => <MarketCard key={item.symbol} item={item} onSelectStock={onSelectStock} />)}
        </div>
      </div>

      {/* Movers lists */}
      <div className="commodities-subsection">
        <h3>🔥 Market Movers</h3>
        <div className="movers-grid">
          <MoversList title="Most Active" items={movers.mostActive || EMPTY_LIST} onSelectStock={onSelectStock} />
          <MoversList title="Most Gainers" items={movers.gainers || EMPTY_LIST} onSelectStock={onSelectStock} />
          <MoversList title="Most Losers" items={movers.losers || EMPTY_LIST} onSelectStock={onSelectStock} />
          <MoversList title="Biggest IPO This Month" items={movers.ipoThisMonth || EMPTY_LIST} onSelectStock={onSelectStock} />
        </div>
      </div>
    </div>
  );
}
