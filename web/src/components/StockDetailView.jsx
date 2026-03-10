import AdvancedChart from "./AdvancedChart";

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

export default function StockDetailView({
  stock,
  onBack,
  selectedPrediction,
  onSelectedPredictionChange,
}) {
  if (!stock) return null;

  const predictions = stock.technicalForecast?.predictions || {};
  const indicators = stock.technicalForecast?.indicators || {};
  const patternMatches = stock.technicalForecast?.patternMatches || [];
  const analysis = stock.comprehensiveAnalysis || {};

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

  return (
    <div className="detail-view">
      <div className="detail-header">
        <button onClick={onBack} className="back-button">
          ← Back to Overview
        </button>
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
        <h3>Advanced Technical Chart</h3>
        <AdvancedChart
          data={stock.candlestickData || []}
          indicators={stock.technicalForecast?.indicatorSeries || {}}
          selectedPeriod={currentPrediction}
          currentPrice={stock.currentPrice}
          patternMatches={patternMatches}
        />
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
