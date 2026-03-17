import { useState } from "react";
import TradingViewChart from "./TradingViewChart";
import SignalCharts from "./SignalCharts";
import PatternOverlay from "./PatternOverlay";
import { useAuth } from "../context/AuthContext";

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

function bbPositionLabel(v) {
  if (v <= 0.15) return { label: "Near Lower Band ↑ Potential Bounce", color: "#16a34a" };
  if (v <= 0.35) return { label: "Lower Half — Mild Bullish Bias", color: "#65a30d" };
  if (v <= 0.65) return { label: "Mid Channel — Neutral", color: "#d97706" };
  if (v <= 0.85) return { label: "Upper Half — Mild Bearish Bias", color: "#ea580c" };
  return { label: "Near Upper Band ↓ Potential Reversal", color: "#dc2626" };
}

function rsiZoneInfo(rsi) {
  if (rsi < 30) return { label: `Oversold (${rsi.toFixed(1)}) — Watch for bullish reversal`, color: "#16a34a", bg: "#f0fdf4" };
  if (rsi < 45) return { label: `Bearish zone (${rsi.toFixed(1)})`, color: "#d97706", bg: "#fffbeb" };
  if (rsi < 55) return { label: `Neutral (${rsi.toFixed(1)})`, color: "#6b7280", bg: "#f9fafb" };
  if (rsi < 70) return { label: `Bullish zone (${rsi.toFixed(1)})`, color: "#2563eb", bg: "#eff6ff" };
  return { label: `Overbought (${rsi.toFixed(1)}) — Watch for bearish reversal`, color: "#dc2626", bg: "#fef2f2" };
}

function volumeLabel(ratio) {
  if (ratio >= 3) return { label: `${ratio}× avg — Extreme spike! Strong signal`, color: "#7c3aed" };
  if (ratio >= 2) return { label: `${ratio}× avg — Big spike`, color: "#dc2626" };
  if (ratio >= 1.5) return { label: `${ratio}× avg — Notable volume`, color: "#ea580c" };
  if (ratio >= 0.8) return { label: `${ratio}× avg — Normal`, color: "#16a34a" };
  return { label: `${ratio}× avg — Low volume (weak signal)`, color: "#9ca3af" };
}

export default function StockDetailView({
  stock,
  onBack,
  selectedPrediction,
  onSelectedPredictionChange,
}) {
  const { isAuthenticated, addToWatchlist } = useAuth();
  const [showBasis, setShowBasis] = useState(false);
  const [showSignals, setShowSignals] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState("");
  const [addingWatchlist, setAddingWatchlist] = useState(false);

  if (!stock) return null;

  const predictions = stock.technicalForecast?.predictions || {};
  const indicators = stock.technicalForecast?.indicators || {};
  const patternMatches = stock.technicalForecast?.patternMatches || [];
  const analysis = stock.comprehensiveAnalysis || {};
  const rm = stock.technicalForecast?.reversalMetrics || {};
  const pb = stock.technicalForecast?.predictionBasis || {};

  const predictionButtons = [
    { key: "week", label: "1 Week", data: predictions.week },
    { key: "month", label: "1 Month", data: predictions.month },
    { key: "quarter", label: "3 Months", data: predictions.quarter },
    { key: "halfYear", label: "6 Months", data: predictions.halfYear },
    { key: "year", label: "1 Year", data: predictions.year },
  ];

  const fallbackPrediction =
    predictions.week ||
    predictions.month ||
    predictions.quarter ||
    predictions.halfYear ||
    predictions.year ||
    null;

  const currentPrediction = predictions[selectedPrediction] || fallbackPrediction;

  async function handleAddToMyWatchlist() {
    if (!isAuthenticated) {
      setWatchlistStatus("Sign in to save this symbol to your profile watchlist.");
      return;
    }

    setAddingWatchlist(true);
    setWatchlistStatus("");
    const result = await addToWatchlist(stock.symbol);
    if (result?.success) {
      setWatchlistStatus(`${stock.symbol} added to your watchlist.`);
    } else {
      setWatchlistStatus(result?.error || "Unable to add symbol to watchlist.");
    }
    setAddingWatchlist(false);
  }

  return (
    <div className="detail-view">
      <div className="detail-header">
        {onBack ? (
          <button onClick={onBack} className="back-button">
            ← Back to Overview
          </button>
        ) : null}
        <div>
          <h1>
            {stock.companyName} ({stock.symbol})
          </h1>
          <p className="current-price">
            {formatCurrency(stock.currentPrice)}
            <span className={stock.dayChangePct >= 0 ? "up" : "down"}>
              {" "}
              {formatPercent(stock.dayChangePct)} today
            </span>
          </p>
          <div className="detail-header-actions">
            <button
              className="watchlist-quick-add-btn"
              onClick={handleAddToMyWatchlist}
              disabled={addingWatchlist}
            >
              {addingWatchlist ? "Adding..." : "+ Add to My Watchlist"}
            </button>
            {watchlistStatus ? <span className="watchlist-quick-status">{watchlistStatus}</span> : null}
          </div>
        </div>
      </div>

      <div className="prediction-selector">
        <h3>Select Prediction Period:</h3>
        <div className="prediction-buttons">
          {predictionButtons.map((btn) => (
            <button
              key={btn.key}
              className={`prediction-btn ${selectedPrediction === btn.key ? "active" : ""}`}
              onClick={() => onSelectedPredictionChange?.(btn.key)}
            >
              <div className="btn-label">{btn.label}</div>
              {btn.data && (
                <>
                  <div className="btn-price">{formatCurrency(btn.data.predictedPrice)}</div>
                  <div className={`btn-change ${btn.data.direction}`}>
                    {formatPercent(btn.data.expectedMovePct)}
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {currentPrediction && (
        <div className="prediction-summary">
          <h3>{currentPrediction.period} Forecast</h3>
          <div className="forecast-grid">
            <div className="forecast-item">
              <span className="label">Predicted Price</span>
              <span className="value large">{formatCurrency(currentPrediction.predictedPrice)}</span>
            </div>
            <div className="forecast-item">
              <span className="label">Expected Move</span>
              <span className={`value large ${currentPrediction.direction}`}>
                {formatPercent(currentPrediction.expectedMovePct)}
              </span>
            </div>
            <div className="forecast-item">
              <span className="label">Direction</span>
              <span className={`value ${currentPrediction.direction}`}>
                {currentPrediction.direction === "up"
                  ? "↑ Bullish"
                  : currentPrediction.direction === "down"
                    ? "↓ Bearish"
                    : "→ Neutral"}
              </span>
            </div>
            <div className="forecast-item">
              <span className="label">Confidence</span>
              <span className="value">{Math.round(currentPrediction.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="chart-section">
        <TradingViewChart symbol={stock.symbol} />
        
        <div className="chart-controls-row">
          <button 
            className={`chart-control-btn ${showSignals ? "active" : ""}`}
            onClick={() => setShowSignals(!showSignals)}
          >
            {showSignals ? "▼" : "►"} Signal Charts
          </button>
          <button 
            className={`chart-control-btn ${showPatterns ? "active" : ""}`}
            onClick={() => setShowPatterns(!showPatterns)}
          >
            {showPatterns ? "▼" : "►"} Pattern Matches
          </button>
        </div>

        {showSignals && <SignalCharts stock={stock} />}
        {showPatterns && <PatternOverlay stock={stock} visible={true} />}
      </div>

      {/* ── Reversal Intelligence ── */}
      <div className="reversal-section">
        <h3>🔄 Reversal Intelligence</h3>
        <p className="reversal-subtitle">Key signals for identifying trend tops, bottoms, and reversals</p>

        <div className="reversal-grid">

          {/* BB Channel Position */}
          {rm.bbPosition !== undefined && (() => {
            const bb = bbPositionLabel(rm.bbPosition);
            const pct = Math.round(rm.bbPosition * 100);
            return (
              <div className="rev-card">
                <div className="rev-card-title">📊 Channel Position (Bollinger Bands)</div>
                <div className="rev-gauge-wrap">
                  <div className="rev-gauge">
                    <div className="rev-gauge-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: bb.color }} />
                    <div className="rev-gauge-marker" style={{ left: `${Math.min(100, Math.max(0, pct))}%` }} />
                  </div>
                  <div className="rev-gauge-labels"><span>Lower Band</span><span>Upper Band</span></div>
                </div>
                <div className="rev-signal" style={{ color: bb.color }}>{bb.label}</div>
                <div className="rev-detail">Position: {pct}% up the channel (0=lower band, 100=upper band)</div>
              </div>
            );
          })()}

          {/* RSI Zone */}
          {indicators.rsi14 !== undefined && (() => {
            const rsi = rsiZoneInfo(indicators.rsi14);
            const pct = Math.min(100, Math.max(0, indicators.rsi14));
            return (
              <div className="rev-card" style={{ background: rsi.bg }}>
                <div className="rev-card-title">📈 RSI (14) Zone</div>
                <div className="rev-gauge-wrap">
                  <div className="rev-gauge rsi-gauge">
                    <div className="rev-gauge-zone zone-oversold" />
                    <div className="rev-gauge-zone zone-neutral" />
                    <div className="rev-gauge-zone zone-overbought" />
                    <div className="rev-gauge-marker" style={{ left: `${pct}%` }} />
                  </div>
                  <div className="rev-gauge-labels" style={{ fontSize: "10px" }}>
                    <span>0</span><span>30</span><span>50</span><span>70</span><span>100</span>
                  </div>
                </div>
                <div className="rev-signal" style={{ color: rsi.color }}>{rsi.label}</div>
                <div className="rev-detail">Below 30 → potential upswing · Above 70 → potential downturn</div>
              </div>
            );
          })()}

          {/* Volume Spike */}
          {rm.volumeRatio !== undefined && (() => {
            const vol = volumeLabel(rm.volumeRatio);
            return (
              <div className="rev-card">
                <div className="rev-card-title">📦 Volume vs 20-Day Average</div>
                <div className="rev-big-number" style={{ color: vol.color }}>{rm.volumeRatio}×</div>
                <div className="rev-signal" style={{ color: vol.color }}>{vol.label}</div>
                <div className="rev-detail">
                  Today: {(rm.currentVolume || 0).toLocaleString()} · 20-day avg: {(rm.avgVolume20 || 0).toLocaleString()}
                </div>
                <div className="rev-detail">High volume + RSI extreme = stronger reversal signal</div>
              </div>
            );
          })()}

          {/* Daily Range (ATR) */}
          {rm.dailyRange && (
            <div className="rev-card">
              <div className="rev-card-title">📏 Typical Daily Range (ATR)</div>
              <div className="rev-range-row">
                <div className="rev-range-item">
                  <span className="rev-range-label">Weekly avg</span>
                  <span className="rev-range-val">{formatCurrency(rm.dailyRange.weeklyAvgAtr)}</span>
                  <span className="rev-range-pct">({rm.dailyRange.weeklyPct}% of price)</span>
                </div>
                <div className="rev-range-item">
                  <span className="rev-range-label">Monthly avg</span>
                  <span className="rev-range-val">{formatCurrency(rm.dailyRange.monthlyAvgAtr)}</span>
                  <span className="rev-range-pct">({rm.dailyRange.monthlyPct}% of price)</span>
                </div>
              </div>
              <div className="rev-detail">Expected move before reversal based on recent volatility</div>
            </div>
          )}

          {/* Fibonacci Levels */}
          {rm.fibonacci && (() => {
            const price = stock.currentPrice;
            const fib = rm.fibonacci;
            const levels = [
              { key: "high", label: "100% (High)", val: fib.high },
              { key: "level786", label: "78.6%", val: fib.level786 },
              { key: "level618", label: "61.8% (Golden)", val: fib.level618 },
              { key: "level500", label: "50%", val: fib.level500 },
              { key: "level382", label: "38.2%", val: fib.level382 },
              { key: "level236", label: "23.6%", val: fib.level236 },
              { key: "low", label: "0% (Low)", val: fib.low },
            ];
            const nearest = levels.reduce((best, l) =>
              Math.abs(l.val - price) < Math.abs(best.val - price) ? l : best
            );
            return (
              <div className="rev-card fib-card">
                <div className="rev-card-title">🌀 Fibonacci Retracement (60-day)</div>
                <div className="fib-levels">
                  {levels.map((l) => (
                    <div
                      key={l.key}
                      className={`fib-row ${l.key === nearest.key ? "fib-nearest" : ""}`}
                    >
                      <span className="fib-label">{l.label}</span>
                      <span className="fib-price">{formatCurrency(l.val)}</span>
                      {l.key === nearest.key && <span className="fib-tag">◄ current</span>}
                    </div>
                  ))}
                </div>
                <div className="rev-detail">Price is nearest to the {nearest.label} level</div>
              </div>
            );
          })()}

          {/* Channel Touch Count */}
          {rm.channelTouches && (
            <div className="rev-card">
              <div className="rev-card-title">🏓 Channel Touch Count (last 60 bars)</div>
              <div className="touch-count-row">
                <div className="touch-item upper">
                  <span className="touch-num">{rm.channelTouches.upper}</span>
                  <span className="touch-name">Upper Band Touches</span>
                  {rm.channelTouches.upper >= 4 && (
                    <span className="touch-warn">⚠ May be due for downward reversal</span>
                  )}
                </div>
                <div className="touch-item lower">
                  <span className="touch-num">{rm.channelTouches.lower}</span>
                  <span className="touch-name">Lower Band Touches</span>
                  {rm.channelTouches.lower >= 4 && (
                    <span className="touch-warn">⚠ May be due for upward reversal</span>
                  )}
                </div>
              </div>
              <div className="rev-detail">Multiple touches without breakout strengthens band as support/resistance</div>
            </div>
          )}

          {/* RSI + Stoch Divergence */}
          {rm.divergence && (
            <div className={`rev-card ${rm.divergence.hasRsiStochDivergence ? "divergence-alert" : ""}`}>
              <div className="rev-card-title">⚡ RSI vs Stochastic Divergence</div>
              {rm.divergence.hasRsiStochDivergence ? (
                <>
                  <div className="rev-signal" style={{ color: "#7c3aed" }}>
                    DIVERGENCE DETECTED — Possible trend reversal ahead
                  </div>
                  <div className="rev-detail">
                    RSI trend: <strong>{rm.divergence.rsiDirection}</strong> ({rm.divergence.rsiCurrent}) ·
                    Stoch %K trend: <strong>{rm.divergence.stochDirection}</strong> ({rm.divergence.stochKCurrent})
                  </div>
                  <div className="rev-detail">When RSI and Stochastic disagree, it often precedes a reversal</div>
                </>
              ) : (
                <>
                  <div className="rev-signal" style={{ color: "#16a34a" }}>
                    Aligned — RSI & Stochastic agree on direction
                  </div>
                  <div className="rev-detail">
                    RSI: {rm.divergence.rsiCurrent} ({rm.divergence.rsiDirection}) ·
                    Stoch %K: {rm.divergence.stochKCurrent} ({rm.divergence.stochDirection})
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Prediction Basis ── */}
      <div className="prediction-basis-section">
        <button className="basis-toggle" onClick={() => setShowBasis((v) => !v)}>
          {showBasis ? "▼" : "►"} How is this prediction calculated?
        </button>
        {showBasis && (
          <div className="basis-content">
            <p className="basis-summary">{pb.summary || "Multi-factor technical model."}</p>
            <div className="basis-weights">
              {Object.entries(pb.weights || {}).map(([signal, weight]) => (
                <div key={signal} className="basis-row">
                  <span className="basis-signal">{signal}</span>
                  <div className="basis-bar-wrap">
                    <div className="basis-bar" style={{ width: weight }} />
                  </div>
                  <span className="basis-weight">{weight}</span>
                </div>
              ))}
            </div>
            {pb.amplifiers && pb.amplifiers.length > 0 && (
              <div className="basis-amplifiers">
                <strong>Amplifiers:</strong>
                <ul>{pb.amplifiers.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>

      {patternMatches.length > 0 && (
        <div className="prediction-summary">
          <h3>Pattern Matches Used in Prediction</h3>
          <div className="news-list">
            {patternMatches.map((match, idx) => (
              <div key={`${match.indicator}-${idx}`} className="news-item">
                <strong>{match.indicator}: </strong>
                {match.label}
                <span className="news-date">{match.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="indicators-section">
        <h3>Technical Indicators</h3>
        <div className="indicators-grid">
          <div className="indicator-card">
            <h4>Moving Averages</h4>
            <ul>
              <li>SMA 5: {formatCurrency(indicators.sma5)}</li>
              <li>SMA 20: {formatCurrency(indicators.sma20)}</li>
              <li>SMA 50: {formatCurrency(indicators.sma50)}</li>
              <li>SMA 200: {formatCurrency(indicators.sma200)}</li>
            </ul>
          </div>
          <div className="indicator-card">
            <h4>Momentum</h4>
            <ul>
              <li>RSI (14): {indicators.rsi14?.toFixed(2) || "-"}</li>
              <li>MACD: {indicators.macd?.toFixed(4) || "-"}</li>
              <li>MACD Signal: {indicators.macdSignal?.toFixed(4) || "-"}</li>
              <li>MACD Histogram: {indicators.macdHistogram?.toFixed(4) || "-"}</li>
              <li>Stochastic %K: {indicators.stochK?.toFixed(2) || "-"}</li>
              <li>Stochastic %D: {indicators.stochD?.toFixed(2) || "-"}</li>
            </ul>
          </div>
          <div className="indicator-card">
            <h4>Bollinger Bands</h4>
            <ul>
              <li>Upper: {formatCurrency(indicators.bbUpper)}</li>
              <li>Middle: {formatCurrency(indicators.bbMiddle)}</li>
              <li>Lower: {formatCurrency(indicators.bbLower)}</li>
            </ul>
          </div>
          <div className="indicator-card">
            <h4>Trend + Volume Tools</h4>
            <ul>
              <li>ADX: {indicators.adx?.toFixed(2) || "-"}</li>
              <li>DI+: {indicators.plusDI?.toFixed(2) || "-"}</li>
              <li>DI-: {indicators.minusDI?.toFixed(2) || "-"}</li>
              <li>Aroon Up: {indicators.aroonUp?.toFixed(2) || "-"}</li>
              <li>Aroon Down: {indicators.aroonDown?.toFixed(2) || "-"}</li>
              <li>OBV: {typeof indicators.obv === "number" ? indicators.obv.toLocaleString() : "-"}</li>
              <li>A/D Line: {typeof indicators.adl === "number" ? indicators.adl.toLocaleString() : "-"}</li>
              <li>ATR: {indicators.atr?.toFixed(2) || "-"}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="analysis-section">
        <h3>Comprehensive Analysis</h3>
        <div className="analysis-grid">
          <div className="analysis-card">
            <h4>📊 Financial Summary</h4>
            <p>{analysis.financialSummary || "Analysis not available."}</p>
          </div>
          <div className="analysis-card">
            <h4>📰 News Analysis</h4>
            <p>{analysis.newsSummary || "No recent news analysis available."}</p>
            <div className="sentiment-badge">
              Sentiment: <span className={`badge ${stock.sentiment?.impact}`}>{stock.sentiment?.impact || "neutral"}</span>
              ({Math.round((stock.sentiment?.confidence || 0) * 100)}% confidence)
            </div>
          </div>
        </div>

        <div className="analysis-grid">
          <div className="analysis-card risks">
            <h4>⚠️ Risk Factors</h4>
            <ul>
              {(analysis.riskFactors || []).map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </div>
          <div className="analysis-card opportunities">
            <h4>✨ Opportunities</h4>
            <ul>
              {(analysis.opportunities || []).map((opp, idx) => (
                <li key={idx}>{opp}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="news-section">
        <h3>Latest News</h3>
        <div className="news-list">
          {(stock.news || []).map((item, idx) => (
            <div key={`${item.link}-${idx}`} className="news-item">
              <a href={item.link} target="_blank" rel="noreferrer">
                {item.title}
              </a>
              <span className="news-date">{item.pubDate ? new Date(item.pubDate).toLocaleString() : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
