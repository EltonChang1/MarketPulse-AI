import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from "chartjs-chart-financial";
import "chartjs-adapter-date-fns";

Chart.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
);

const INTERVALS = ["1", "5", "15", "60", "240", "D", "W", "M"];
const RANGES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"];
const CHART_TYPES = ["candles", "ohlc", "line", "area"];

function recommendedRangeForInterval(interval) {
  if (["1", "5", "15"].includes(interval)) return "1D";
  if (["60", "240"].includes(interval)) return "1M";
  if (interval === "W") return "5Y";
  if (interval === "M") return "ALL";
  return "1Y";
}

function symbolSeed(symbol = "AAPL") {
  return String(symbol)
    .toUpperCase()
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function mulberry32(seed) {
  let state = seed;
  return function rand() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function intervalMs(interval) {
  if (interval === "1") return 60 * 1000;
  if (interval === "5") return 5 * 60 * 1000;
  if (interval === "15") return 15 * 60 * 1000;
  if (interval === "60") return 60 * 60 * 1000;
  if (interval === "240") return 4 * 60 * 60 * 1000;
  if (interval === "W") return 7 * 24 * 60 * 60 * 1000;
  if (interval === "M") return 30 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function unitForInterval(interval) {
  if (["1", "5", "15"].includes(interval)) return "minute";
  if (["60", "240"].includes(interval)) return "hour";
  if (interval === "W") return "week";
  if (interval === "M") return "month";
  return "day";
}

function defaultPointCount(interval) {
  if (["1", "5"].includes(interval)) return 4000;
  if (["15", "60"].includes(interval)) return 3000;
  if (["240"].includes(interval)) return 2000;
  if (interval === "D") return 2200;
  if (interval === "W") return 800;
  if (interval === "M") return 400;
  return 1000;
}

function generateSeries(symbol, interval, count, forcedTimes) {
  const rand = mulberry32(symbolSeed(symbol));
  const step = intervalMs(interval);
  const now = Date.now();
  const times = forcedTimes || Array.from({ length: count }, (_, idx) => now - (count - 1 - idx) * step);

  let price = 60 + rand() * 260;
  const data = [];

  for (let i = 0; i < times.length; i++) {
    const volatility = Math.max(0.6, price * (0.004 + rand() * 0.018));
    const drift = (rand() - 0.495) * volatility;
    const open = price;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + rand() * volatility * 0.5;
    const low = Math.max(0.5, Math.min(open, close) - rand() * volatility * 0.5);
    const volume = Math.floor(500_000 + rand() * 7_500_000);

    data.push({
      x: times[i],
      o: Number(open.toFixed(2)),
      h: Number(high.toFixed(2)),
      l: Number(low.toFixed(2)),
      c: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return data;
}

function filterByRange(data, range) {
  if (!data.length || range === "ALL") return data;

  const lastTs = data[data.length - 1].x;
  const lastDate = new Date(lastTs);
  let threshold = 0;

  if (range === "1D") threshold = lastTs - 24 * 60 * 60 * 1000;
  else if (range === "5D") threshold = lastTs - 5 * 24 * 60 * 60 * 1000;
  else if (range === "1M") threshold = lastTs - 30 * 24 * 60 * 60 * 1000;
  else if (range === "3M") threshold = lastTs - 90 * 24 * 60 * 60 * 1000;
  else if (range === "6M") threshold = lastTs - 180 * 24 * 60 * 60 * 1000;
  else if (range === "1Y") threshold = lastTs - 365 * 24 * 60 * 60 * 1000;
  else if (range === "3Y") threshold = lastTs - 3 * 365 * 24 * 60 * 60 * 1000;
  else if (range === "5Y") threshold = lastTs - 5 * 365 * 24 * 60 * 60 * 1000;
  else if (range === "YTD") threshold = new Date(lastDate.getFullYear(), 0, 1).getTime();

  return data.filter((point) => point.x >= threshold);
}

function calcSMA(data, period) {
  if (data.length < period) return [];
  const out = [];
  for (let i = period - 1; i < data.length; i++) {
    const avg = data.slice(i - period + 1, i + 1).reduce((s, p) => s + p.c, 0) / period;
    out.push(avg);
  }
  return out;
}

function calcEMA(data, period) {
  if (data.length < period) return [];
  const mult = 2 / (period + 1);
  const out = [];
  let prev = data.slice(0, period).reduce((s, p) => s + p.c, 0) / period;
  out.push(prev);
  for (let i = period; i < data.length; i++) {
    prev = (data[i].c - prev) * mult + prev;
    out.push(prev);
  }
  return out;
}

function calcRSI(data, period = 14) {
  if (data.length <= period) return [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const delta = data[i].c - data[i - 1].c;
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const out = [];

  for (let i = period; i < data.length; i++) {
    const delta = data[i].c - data[i - 1].c;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 1);
    out.push(100 - 100 / (1 + rs));
  }

  return out;
}

function calcMACD(data) {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdOffset = 25;
  const macd = [];

  for (let rawIndex = macdOffset; rawIndex < data.length; rawIndex++) {
    const i12 = rawIndex - 11;
    const i26 = rawIndex - 25;
    if (i12 >= 0 && i12 < ema12.length && i26 >= 0 && i26 < ema26.length) {
      macd.push(ema12[i12] - ema26[i26]);
    }
  }

  const signal = calcEMA(macd.map((value) => ({ c: value })), 9);
  const signalOffset = macdOffset + 8;
  const histogram = [];

  for (let i = 0; i < signal.length; i++) {
    const macdIdx = i + 8;
    if (macdIdx < macd.length) histogram.push(macd[macdIdx] - signal[i]);
  }

  return { macd, signal, histogram, macdOffset, signalOffset };
}

function calcBollinger(data, period = 20, mult = 2) {
  const middle = calcSMA(data, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < middle.length; i++) {
    const slice = data.slice(i, i + period);
    const mean = middle[i];
    const variance = slice.reduce((sum, p) => sum + (p.c - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
  }

  return { middle, upper, lower };
}

function mapToSeries(values, data, offset) {
  return values
    .map((value, index) => {
      const point = data[index + offset];
      if (!point) return null;
      return { x: point.x, y: value };
    })
    .filter(Boolean);
}

function formatCompact(num) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return String(num);
}

export default function TradingViewChart({ symbol }) {
  const priceCanvasRef = useRef(null);
  const volumeCanvasRef = useRef(null);
  const indicatorCanvasRef = useRef(null);

  const priceChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const indicatorChartRef = useRef(null);

  const [interval, setInterval] = useState("D");
  const [range, setRange] = useState("1Y");
  const [chartType, setChartType] = useState("candles");
  const [compareInput, setCompareInput] = useState("");
  const [compareSymbol, setCompareSymbol] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const [indicators, setIndicators] = useState({
    volume: true,
    sma20: true,
    sma50: false,
    ema20: true,
    bb: false,
    rsi: true,
    macd: true,
    trendLine: false,
    horizontalLine: false,
    fibLevels: false,
  });

  const allData = useMemo(() => {
    const count = defaultPointCount(interval);
    return generateSeries(symbol || "AAPL", interval, count);
  }, [symbol, interval, refreshVersion]);

  const visibleData = useMemo(() => filterByRange(allData, range), [allData, range]);

  const compareData = useMemo(() => {
    if (!compareSymbol.trim()) return [];
    const seeded = generateSeries(compareSymbol.trim().toUpperCase(), interval, visibleData.length, visibleData.map((p) => p.x));
    return seeded;
  }, [compareSymbol, interval, visibleData]);

  const latest = visibleData[visibleData.length - 1];
  const first = visibleData[0];
  const delta = latest && first ? latest.c - first.c : 0;
  const deltaPct = latest && first && first.c ? (delta / first.c) * 100 : 0;

  useEffect(() => {
    const recommended = recommendedRangeForInterval(interval);
    setRange(recommended);
  }, [interval]);

  useEffect(() => {
    if (!priceCanvasRef.current || visibleData.length < 30) return;

    if (priceChartRef.current) priceChartRef.current.destroy();
    if (volumeChartRef.current) volumeChartRef.current.destroy();
    if (indicatorChartRef.current) indicatorChartRef.current.destroy();

    const priceDatasets = [];

    if (chartType === "candles") {
      priceDatasets.push({
        type: "candlestick",
        label: (symbol || "AAPL").toUpperCase(),
        data: visibleData,
        borderColor: { up: "#26a69a", down: "#ef5350", unchanged: "#999" },
        backgroundColor: { up: "#26a69a", down: "#ef5350", unchanged: "#999" },
      });
    } else if (chartType === "ohlc") {
      priceDatasets.push({
        type: "ohlc",
        label: (symbol || "AAPL").toUpperCase(),
        data: visibleData,
        borderColor: { up: "#26a69a", down: "#ef5350", unchanged: "#999" },
      });
    } else {
      priceDatasets.push({
        type: "line",
        label: (symbol || "AAPL").toUpperCase(),
        data: visibleData.map((p) => ({ x: p.x, y: p.c })),
        borderColor: "#2962FF",
        backgroundColor: chartType === "area" ? "rgba(41, 98, 255, 0.16)" : "transparent",
        borderWidth: 2,
        pointRadius: 0,
        fill: chartType === "area",
        tension: 0.15,
      });
    }

    if (compareData.length) {
      priceDatasets.push({
        type: "line",
        label: compareSymbol.toUpperCase(),
        data: compareData.map((p) => ({ x: p.x, y: p.c })),
        borderColor: "#f79009",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      });
    }

    if (indicators.sma20) {
      priceDatasets.push({
        type: "line",
        label: "SMA 20",
        data: mapToSeries(calcSMA(visibleData, 20), visibleData, 19),
        borderColor: "#7f56d9",
        backgroundColor: "transparent",
        borderWidth: 1.4,
        pointRadius: 0,
      });
    }

    if (indicators.sma50) {
      priceDatasets.push({
        type: "line",
        label: "SMA 50",
        data: mapToSeries(calcSMA(visibleData, 50), visibleData, 49),
        borderColor: "#12b76a",
        backgroundColor: "transparent",
        borderWidth: 1.4,
        pointRadius: 0,
      });
    }

    if (indicators.ema20) {
      priceDatasets.push({
        type: "line",
        label: "EMA 20",
        data: mapToSeries(calcEMA(visibleData, 20), visibleData, 19),
        borderColor: "#e31b54",
        backgroundColor: "transparent",
        borderWidth: 1.2,
        pointRadius: 0,
        borderDash: [5, 3],
      });
    }

    if (indicators.bb) {
      const bb = calcBollinger(visibleData, 20, 2);
      priceDatasets.push(
        {
          type: "line",
          label: "BB Upper",
          data: mapToSeries(bb.upper, visibleData, 19),
          borderColor: "#6941c6",
          borderDash: [2, 2],
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
        },
        {
          type: "line",
          label: "BB Mid",
          data: mapToSeries(bb.middle, visibleData, 19),
          borderColor: "#6941c6",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
        },
        {
          type: "line",
          label: "BB Lower",
          data: mapToSeries(bb.lower, visibleData, 19),
          borderColor: "#6941c6",
          borderDash: [2, 2],
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
        }
      );
    }

    if (indicators.trendLine && visibleData.length > 3) {
      priceDatasets.push({
        type: "line",
        label: "Trend",
        data: [
          { x: visibleData[0].x, y: visibleData[0].c },
          { x: visibleData[visibleData.length - 1].x, y: visibleData[visibleData.length - 1].c },
        ],
        borderColor: "#344054",
        borderDash: [6, 4],
        borderWidth: 1.2,
        pointRadius: 0,
      });
    }

    if (indicators.horizontalLine && latest) {
      priceDatasets.push({
        type: "line",
        label: "Price Line",
        data: visibleData.map((p) => ({ x: p.x, y: latest.c })),
        borderColor: "#f04438",
        borderDash: [4, 4],
        borderWidth: 1,
        pointRadius: 0,
      });
    }

    if (indicators.fibLevels && visibleData.length > 10) {
      const high = Math.max(...visibleData.map((p) => p.h));
      const low = Math.min(...visibleData.map((p) => p.l));
      const diff = high - low;
      const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
      levels.forEach((lv) => {
        const value = high - diff * lv;
        priceDatasets.push({
          type: "line",
          label: `Fib ${lv}`,
          data: visibleData.map((p) => ({ x: p.x, y: value })),
          borderColor: "rgba(16,24,40,0.35)",
          borderDash: [3, 3],
          borderWidth: 0.8,
          pointRadius: 0,
        });
      });
    }

    priceChartRef.current = new Chart(priceCanvasRef.current, {
      type: "line",
      data: { datasets: priceDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            type: "time",
            time: { unit: unitForInterval(interval) },
            grid: { color: "#f2f4f7" },
          },
          y: {
            position: "right",
            grid: { color: "#f2f4f7" },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { boxWidth: 12, usePointStyle: true, pointStyle: "line", font: { size: 11 } },
          },
        },
      },
    });

    if (indicators.volume && volumeCanvasRef.current) {
      volumeChartRef.current = new Chart(volumeCanvasRef.current, {
        type: "bar",
        data: {
          datasets: [
            {
              label: "Volume",
              data: visibleData.map((p) => ({ x: p.x, y: p.volume })),
              backgroundColor: visibleData.map((p) => (p.c >= p.o ? "#12b76a99" : "#f0443899")),
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { type: "time", display: false, time: { unit: unitForInterval(interval) }, grid: { color: "#f2f4f7" } },
            y: { position: "right", grid: { color: "#f2f4f7" } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }

    const hasLowerPane = indicators.rsi || indicators.macd;
    if (hasLowerPane && indicatorCanvasRef.current) {
      const lowerDatasets = [];

      if (indicators.rsi) {
        const rsi = calcRSI(visibleData, 14);
        lowerDatasets.push(
          {
            type: "line",
            label: "RSI",
            data: mapToSeries(rsi, visibleData, 14),
            borderColor: "#2962FF",
            borderWidth: 1.4,
            pointRadius: 0,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "RSI 70",
            data: visibleData.slice(14).map((p) => ({ x: p.x, y: 70 })),
            borderColor: "rgba(240,68,56,0.4)",
            borderDash: [4, 3],
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "RSI 30",
            data: visibleData.slice(14).map((p) => ({ x: p.x, y: 30 })),
            borderColor: "rgba(18,183,106,0.4)",
            borderDash: [4, 3],
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: "y",
          }
        );
      }

      if (indicators.macd) {
        const macd = calcMACD(visibleData);
        const yAxisID = indicators.rsi ? "y1" : "y";
        lowerDatasets.push(
          {
            type: "line",
            label: "MACD",
            data: mapToSeries(macd.macd, visibleData, macd.macdOffset),
            borderColor: "#7f56d9",
            borderWidth: 1.2,
            pointRadius: 0,
            yAxisID,
          },
          {
            type: "line",
            label: "Signal",
            data: mapToSeries(macd.signal, visibleData, macd.signalOffset),
            borderColor: "#f79009",
            borderWidth: 1,
            pointRadius: 0,
            yAxisID,
          },
          {
            type: "bar",
            label: "Histogram",
            data: mapToSeries(macd.histogram, visibleData, macd.signalOffset),
            backgroundColor: macd.histogram.map((v) => (v >= 0 ? "#12b76a" : "#f04438")),
            borderWidth: 0,
            yAxisID,
          }
        );
      }

      const scales = {
        x: { type: "time", display: false, time: { unit: unitForInterval(interval) }, grid: { color: "#f2f4f7" } },
        y: {
          position: "right",
          display: indicators.rsi,
          min: indicators.rsi ? 0 : undefined,
          max: indicators.rsi ? 100 : undefined,
          grid: { color: "#f2f4f7" },
        },
      };

      if (indicators.rsi && indicators.macd) {
        scales.y1 = {
          position: "left",
          grid: { drawOnChartArea: false },
        };
      }

      indicatorChartRef.current = new Chart(indicatorCanvasRef.current, {
        type: "line",
        data: { datasets: lowerDatasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: { boxWidth: 12, usePointStyle: true, pointStyle: "line", font: { size: 11 } },
            },
          },
        },
      });
    }

    return () => {
      if (priceChartRef.current) priceChartRef.current.destroy();
      if (volumeChartRef.current) volumeChartRef.current.destroy();
      if (indicatorChartRef.current) indicatorChartRef.current.destroy();
    };
  }, [symbol, visibleData, interval, indicators, chartType, compareData, compareSymbol]);

  const toggleIndicator = (key) => setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="tradingview-wrapper tv-mimic-wrapper">
      <div className="tradingview-header tv-mimic-header">
        <div className="tv-top-row">
          <div className="tv-symbol-block">
            <h4>{(symbol || "AAPL").toUpperCase()}</h4>
            <p>
              ${latest?.c?.toFixed(2) || "-"} 
              <span className={delta >= 0 ? "up" : "down"}>{` ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${deltaPct.toFixed(2)}%)`}</span>
            </p>
          </div>
          <div className="tv-stat-grid">
            <span>H: ${latest?.h?.toFixed(2) || "-"}</span>
            <span>L: ${latest?.l?.toFixed(2) || "-"}</span>
            <span>O: ${latest?.o?.toFixed(2) || "-"}</span>
            <span>Vol: {latest ? formatCompact(latest.volume) : "-"}</span>
          </div>
        </div>

        <div className="chart-controls tv-control-grid">
          <div className="control-group">
            <label>Interval</label>
            <div className="button-group">
              {INTERVALS.map((item) => (
                <button key={item} className={interval === item ? "active" : ""} onClick={() => setInterval(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Range</label>
            <div className="button-group">
              {RANGES.map((item) => (
                <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Chart Type</label>
            <div className="button-group">
              {CHART_TYPES.map((item) => (
                <button key={item} className={chartType === item ? "active" : ""} onClick={() => setChartType(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Compare</label>
            <div className="tv-compare-row">
              <input
                className="tv-compare-input"
                placeholder="Add symbol e.g. NVDA"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const cleaned = compareInput.trim().toUpperCase();
                    if (cleaned) setCompareSymbol(cleaned);
                  }
                }}
              />
              <button
                onClick={() => {
                  const cleaned = compareInput.trim().toUpperCase();
                  if (cleaned) setCompareSymbol(cleaned);
                }}
              >
                Add
              </button>
              <button onClick={() => { setCompareSymbol(""); setCompareInput(""); }}>Clear</button>
              <button onClick={() => setRefreshVersion((v) => v + 1)}>Reset</button>
            </div>
          </div>

          <div className="control-group">
            <label>Indicators & Tools</label>
            <div className="checkbox-group tv-checkbox-grid">
              {[
                ["volume", "Volume"],
                ["sma20", "SMA 20"],
                ["sma50", "SMA 50"],
                ["ema20", "EMA 20"],
                ["bb", "Bollinger"],
                ["rsi", "RSI"],
                ["macd", "MACD"],
                ["trendLine", "Trend"],
                ["horizontalLine", "H-Line"],
                ["fibLevels", "Fib"],
              ].map(([key, label]) => (
                <label key={key}>
                  <input type="checkbox" checked={indicators[key]} onChange={() => toggleIndicator(key)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tradingview-widget-shell">
        <div className="chart-container">
          <canvas ref={priceCanvasRef} />
        </div>

        {indicators.volume && (
          <div className="volume-container">
            <canvas ref={volumeCanvasRef} />
          </div>
        )}

        {(indicators.rsi || indicators.macd) && (
          <div className="indicator-container">
            <canvas ref={indicatorCanvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
