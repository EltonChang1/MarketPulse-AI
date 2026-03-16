import { useState } from "react";

export default function PatternOverlay({ stock, visible }) {
  const patternMatches = stock?.technicalForecast?.patternMatches || [];
  const history = stock?.candlestickData || [];

  if (!visible || !patternMatches.length) {
    return null;
  }

  // Group patterns by direction
  const bullish = patternMatches.filter((p) => p.direction === "up");
  const bearish = patternMatches.filter((p) => p.direction === "down");
  const neutral = patternMatches.filter((p) => p.direction === "flat");

  return (
    <div className="pattern-overlay-panel">
      <div className="pattern-header">
        <h4>🎯 Pattern Matches & Signals</h4>
        <p className="pattern-subtitle">Click a pattern to view details</p>
      </div>

      {bullish.length > 0 && (
        <div className="pattern-group bullish-group">
          <h5 className="pattern-group-title">📈 Bullish Signals ({bullish.length})</h5>
          <div className="pattern-list">
            {bullish.map((p, idx) => (
              <div key={`bullish-${idx}`} className="pattern-item bullish">
                <span className="pattern-date">{p.time}</span>
                <span className="pattern-label">{p.label}</span>
                <span className="pattern-detail">{p.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bearish.length > 0 && (
        <div className="pattern-group bearish-group">
          <h5 className="pattern-group-title">📉 Bearish Signals ({bearish.length})</h5>
          <div className="pattern-list">
            {bearish.map((p, idx) => (
              <div key={`bearish-${idx}`} className="pattern-item bearish">
                <span className="pattern-date">{p.time}</span>
                <span className="pattern-label">{p.label}</span>
                <span className="pattern-detail">{p.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {neutral.length > 0 && (
        <div className="pattern-group neutral-group">
          <h5 className="pattern-group-title">➡️ Neutral Signals ({neutral.length})</h5>
          <div className="pattern-list">
            {neutral.map((p, idx) => (
              <div key={`neutral-${idx}`} className="pattern-item neutral">
                <span className="pattern-date">{p.time}</span>
                <span className="pattern-label">{p.label}</span>
                <span className="pattern-detail">{p.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
