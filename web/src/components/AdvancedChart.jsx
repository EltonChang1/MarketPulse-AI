import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

export default function AdvancedChart({
  data,
  indicators,
  selectedPeriod,
  currentPrice,
  patternMatches = [],
}) {
  const mainChartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  
  const mainChartInstance = useRef(null);
  const rsiChartInstance = useRef(null);
  const macdChartInstance = useRef(null);
  const volumeChartInstance = useRef(null);

  // Indicator visibility toggles - all ON by default
  const [visibleIndicators, setVisibleIndicators] = useState({
    // Main chart overlays
    sma5: true,
    sma20: true,
    sma50: true,
    sma200: true,
    ema12: true,
    ema26: true,
    bollingerBands: true,
    
    // Separate panes
    rsi: true,
    macd: true,
    volume: true,
    stochastic: true,
    
    // Additional indicators
    trendLine: true,
    supportResistance: true,
    patternMarkers: true,
  });

  const toggleIndicator = (indicator) => {
    setVisibleIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  useEffect(() => {
    if (!mainChartRef.current || !data || data.length === 0) return;

    // Clear existing charts
    if (mainChartInstance.current) {
      mainChartInstance.current.remove();
      mainChartInstance.current = null;
    }
    if (rsiChartInstance.current) {
      rsiChartInstance.current.remove();
      rsiChartInstance.current = null;
    }
    if (macdChartInstance.current) {
      macdChartInstance.current.remove();
      macdChartInstance.current = null;
    }
    if (volumeChartInstance.current) {
      volumeChartInstance.current.remove();
      volumeChartInstance.current = null;
    }

    const chartOptions = {
      width: mainChartRef.current.clientWidth,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#d1d4dc",
      },
      timeScale: {
        borderColor: "#d1d4dc",
        timeVisible: true,
      },
    };

    // ============ MAIN PRICE CHART ============
    const mainChart = createChart(mainChartRef.current, {
      ...chartOptions,
      height: 400,
    });
    mainChartInstance.current = mainChart;

    // Candlestick series
    const candlestickSeries = mainChart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    const candleData = data
      .filter(
        (point) =>
          point &&
          point.date &&
          typeof point.open === "number" &&
          typeof point.high === "number" &&
          typeof point.low === "number" &&
          typeof point.close === "number"
      )
      .map((point) => ({
        time: point.date,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }));

    if (candleData.length === 0) return;
    candlestickSeries.setData(candleData);

    // Helper to align indicator data with candlestick dates
    const alignIndicatorData = (indicatorValues, startOffset = 0) => {
      if (!indicatorValues || indicatorValues.length === 0) return [];
      const offset = Math.max(0, data.length - indicatorValues.length - startOffset);
      return indicatorValues
        .map((value, index) => {
          const point = data[offset + index];
          return point?.date && typeof value === "number"
            ? { time: point.date, value: Number(value.toFixed(2)) }
            : null;
        })
        .filter(Boolean);
    };

    // Moving Averages
    if (visibleIndicators.sma5 && indicators.sma5) {
      const sma5Series = mainChart.addLineSeries({
        color: "#2196F3",
        lineWidth: 1,
        title: "SMA 5",
      });
      sma5Series.setData(alignIndicatorData(indicators.sma5));
    }

    if (visibleIndicators.sma20 && indicators.sma20) {
      const sma20Series = mainChart.addLineSeries({
        color: "#FF9800",
        lineWidth: 2,
        title: "SMA 20",
      });
      sma20Series.setData(alignIndicatorData(indicators.sma20));
    }

    if (visibleIndicators.sma50 && indicators.sma50) {
      const sma50Series = mainChart.addLineSeries({
        color: "#4CAF50",
        lineWidth: 2,
        title: "SMA 50",
      });
      sma50Series.setData(alignIndicatorData(indicators.sma50));
    }

    if (visibleIndicators.sma200 && indicators.sma200) {
      const sma200Series = mainChart.addLineSeries({
        color: "#9C27B0",
        lineWidth: 3,
        title: "SMA 200",
      });
      sma200Series.setData(alignIndicatorData(indicators.sma200));
    }

    if (visibleIndicators.ema12 && indicators.ema12) {
      const ema12Series = mainChart.addLineSeries({
        color: "#00BCD4",
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: "EMA 12",
      });
      ema12Series.setData(alignIndicatorData(indicators.ema12));
    }

    if (visibleIndicators.ema26 && indicators.ema26) {
      const ema26Series = mainChart.addLineSeries({
        color: "#E91E63",
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: "EMA 26",
      });
      ema26Series.setData(alignIndicatorData(indicators.ema26));
    }

    // Bollinger Bands
    if (visibleIndicators.bollingerBands && indicators.bollingerBands) {
      const bb = indicators.bollingerBands;
      const bbUpper = mainChart.addLineSeries({
        color: "#9E9E9E",
        lineWidth: 1,
        lineStyle: 1,
        title: "BB Upper",
      });
      const bbMiddle = mainChart.addLineSeries({
        color: "#9E9E9E",
        lineWidth: 1,
        lineStyle: 2,
        title: "BB Middle",
      });
      const bbLower = mainChart.addLineSeries({
        color: "#9E9E9E",
        lineWidth: 1,
        lineStyle: 1,
        title: "BB Lower",
      });
      
      const bbData = bb.map((band, index) => {
        const offset = Math.max(0, data.length - bb.length);
        const point = data[offset + index];
        return point?.date
          ? {
              upper: { time: point.date, value: Number(band.upper?.toFixed(2) || 0) },
              middle: { time: point.date, value: Number(band.middle?.toFixed(2) || 0) },
              lower: { time: point.date, value: Number(band.lower?.toFixed(2) || 0) },
            }
          : null;
      }).filter(Boolean);

      if (bbData.length > 0) {
        bbUpper.setData(bbData.map(d => d.upper));
        bbMiddle.setData(bbData.map(d => d.middle));
        bbLower.setData(bbData.map(d => d.lower));
      }
    }

    // Trend/Support/Resistance Lines
    if (visibleIndicators.trendLine && indicators.trendLine) {
      const trendSeries = mainChart.addLineSeries({
        color: "#7C4DFF",
        lineWidth: 2,
        lineStyle: 2,
        title: "Trend",
      });
      trendSeries.setData(indicators.trendLine);
    }

    if (visibleIndicators.supportResistance) {
      if (indicators.supportLine) {
        const supportSeries = mainChart.addLineSeries({
          color: "#4CAF50",
          lineWidth: 2,
          lineStyle: 2,
          title: "Support",
        });
        supportSeries.setData(indicators.supportLine);
      }
      if (indicators.resistanceLine) {
        const resistanceSeries = mainChart.addLineSeries({
          color: "#F44336",
          lineWidth: 2,
          lineStyle: 2,
          title: "Resistance",
        });
        resistanceSeries.setData(indicators.resistanceLine);
      }
    }

    // Pattern markers
    if (visibleIndicators.patternMarkers && Array.isArray(patternMatches) && patternMatches.length > 0) {
      const markers = patternMatches.slice(0, 15).map((match) => ({
        time: match.time,
        position: match.direction === "down" ? "aboveBar" : "belowBar",
        color: match.direction === "down" ? "#F44336" : "#4CAF50",
        shape: "circle",
        text: `${match.indicator}: ${match.label}`,
      }));
      candlestickSeries.setMarkers(markers);
    }

    mainChart.timeScale().fitContent();

    // ============ RSI CHART ============
    if (visibleIndicators.rsi && rsiChartRef.current && indicators.rsi14) {
      const rsiChart = createChart(rsiChartRef.current, {
        ...chartOptions,
        height: 120,
      });
      rsiChartInstance.current = rsiChart;

      const rsiSeries = rsiChart.addLineSeries({
        color: "#9C27B0",
        lineWidth: 2,
        title: "RSI",
      });

      const rsiData = alignIndicatorData(indicators.rsi14);
      rsiSeries.setData(rsiData);

      // RSI reference lines (30, 50, 70)
      const rsiData30 = data.map(p => ({ time: p.date, value: 30 }));
      const rsiData70 = data.map(p => ({ time: p.date, value: 70 }));
      
      const rsi30Line = rsiChart.addLineSeries({
        color: "#4CAF50",
        lineWidth: 1,
        lineStyle: 2,
      });
      rsi30Line.setData(rsiData30);
      
      const rsi70Line = rsiChart.addLineSeries({
        color: "#F44336",
        lineWidth: 1,
        lineStyle: 2,
      });
      rsi70Line.setData(rsiData70);

      rsiChart.timeScale().fitContent();
    }

    // ============ MACD CHART ============
    if (visibleIndicators.macd && macdChartRef.current && indicators.macd) {
      const macdChart = createChart(macdChartRef.current, {
        ...chartOptions,
        height: 140,
      });
      macdChartInstance.current = macdChart;

      const macdValues = indicators.macd;
      const offset = Math.max(0, data.length - macdValues.length);

      const macdLineData = macdValues
        .map((m, index) => {
          const point = data[offset + index];
          return point?.date && typeof m.MACD === "number"
            ? { time: point.date, value: Number(m.MACD.toFixed(4)) }
            : null;
        })
        .filter(Boolean);

      const signalLineData = macdValues
        .map((m, index) => {
          const point = data[offset + index];
          return point?.date && typeof m.signal === "number"
            ? { time: point.date, value: Number(m.signal.toFixed(4)) }
            : null;
        })
        .filter(Boolean);

      const histogramData = macdValues
        .map((m, index) => {
          const point = data[offset + index];
          const histValue = (m.MACD ?? 0) - (m.signal ?? 0);
          return point?.date
            ? {
                time: point.date,
                value: Number(histValue.toFixed(4)),
                color: histValue >= 0 ? "#26a69a" : "#ef5350",
              }
            : null;
        })
        .filter(Boolean);

      const macdLine = macdChart.addLineSeries({
        color: "#2196F3",
        lineWidth: 2,
        title: "MACD",
      });
      macdLine.setData(macdLineData);

      const signalLine = macdChart.addLineSeries({
        color: "#FF9800",
        lineWidth: 2,
        title: "Signal",
      });
      signalLine.setData(signalLineData);

      const histogram = macdChart.addHistogramSeries({
        color: "#26a69a",
        title: "Histogram",
      });
      histogram.setData(histogramData);

      macdChart.timeScale().fitContent();
    }

    // ============ VOLUME CHART ============
    if (visibleIndicators.volume && volumeChartRef.current && indicators.volumes) {
      const volumeChart = createChart(volumeChartRef.current, {
        ...chartOptions,
        height: 100,
      });
      volumeChartInstance.current = volumeChart;

      const volumeData = data
        .map((point, index) => {
          const volume = indicators.volumes[index];
          if (!point?.date || typeof volume !== "number") return null;
          
          // Color based on price direction
          const color = index > 0 && point.close >= data[index - 1].close
            ? "#26a69a88"
            : "#ef535088";
          
          return {
            time: point.date,
            value: volume,
            color: color,
          };
        })
        .filter(Boolean);

      const volumeSeries = volumeChart.addHistogramSeries({
        color: "#26a69a88",
        title: "Volume",
      });
      volumeSeries.setData(volumeData);

      volumeChart.timeScale().fitContent();
    }

    // Synchronize time scales
    const charts = [
      mainChartInstance.current,
      rsiChartInstance.current,
      macdChartInstance.current,
      volumeChartInstance.current,
    ].filter(Boolean);

    charts.forEach(chart => {
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        charts.forEach(c => {
          if (c !== chart) {
            c.timeScale().setVisibleRange(timeRange);
          }
        });
      });
    });

    // Handle resize
    const handleResize = () => {
      const width = mainChartRef.current?.clientWidth || 800;
      charts.forEach(chart => {
        chart.applyOptions({ width });
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      charts.forEach(chart => chart.remove());
    };
  }, [data, indicators, selectedPeriod, currentPrice, patternMatches, visibleIndicators]);

  return (
    <div className="advanced-chart-wrapper">
      {/* Indicator Toggle Panel */}
      <div className="indicator-controls">
        <div className="control-section">
          <h4>Overlays</h4>
          <div className="toggle-grid">
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.sma5}
                onChange={() => toggleIndicator('sma5')}
              />
              <span style={{ color: '#2196F3' }}>● </span>SMA 5
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.sma20}
                onChange={() => toggleIndicator('sma20')}
              />
              <span style={{ color: '#FF9800' }}>● </span>SMA 20
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.sma50}
                onChange={() => toggleIndicator('sma50')}
              />
              <span style={{ color: '#4CAF50' }}>● </span>SMA 50
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.sma200}
                onChange={() => toggleIndicator('sma200')}
              />
              <span style={{ color: '#9C27B0' }}>● </span>SMA 200
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.ema12}
                onChange={() => toggleIndicator('ema12')}
              />
              <span style={{ color: '#00BCD4' }}>- </span>EMA 12
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.ema26}
                onChange={() => toggleIndicator('ema26')}
              />
              <span style={{ color: '#E91E63' }}>- </span>EMA 26
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.bollingerBands}
                onChange={() => toggleIndicator('bollingerBands')}
              />
              <span style={{ color: '#9E9E9E' }}>● </span>Bollinger Bands
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.trendLine}
                onChange={() => toggleIndicator('trendLine')}
              />
              <span style={{ color: '#7C4DFF' }}>- </span>Trend Line
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.supportResistance}
                onChange={() => toggleIndicator('supportResistance')}
              />
              Support/Resistance
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.patternMarkers}
                onChange={() => toggleIndicator('patternMarkers')}
              />
              Pattern Markers
            </label>
          </div>
        </div>

        <div className="control-section">
          <h4>Oscillators</h4>
          <div className="toggle-grid">
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.rsi}
                onChange={() => toggleIndicator('rsi')}
              />
              <span style={{ color: '#9C27B0' }}>● </span>RSI
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.macd}
                onChange={() => toggleIndicator('macd')}
              />
              <span style={{ color: '#2196F3' }}>● </span>MACD
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleIndicators.volume}
                onChange={() => toggleIndicator('volume')}
              />
              Volume
            </label>
          </div>
        </div>
      </div>

      {/* Main Price Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Price Chart</h3>
          {selectedPeriod && (
            <div className={`trend-badge ${selectedPeriod.direction}`}>
              {selectedPeriod.period}: {selectedPeriod.direction === 'up' ? '▲' : selectedPeriod.direction === 'down' ? '▼' : '●'} {selectedPeriod.direction}
            </div>
          )}
        </div>
        <div ref={mainChartRef} />
      </div>

      {/* RSI Chart */}
      {visibleIndicators.rsi && (
        <div className="chart-container oscillator-chart">
          <div className="chart-header">
            <h3>RSI (14)</h3>
          </div>
          <div ref={rsiChartRef} />
        </div>
      )}

      {/* MACD Chart */}
      {visibleIndicators.macd && (
        <div className="chart-container oscillator-chart">
          <div className="chart-header">
            <h3>MACD (12, 26, 9)</h3>
          </div>
          <div ref={macdChartRef} />
        </div>
      )}

      {/* Volume Chart */}
      {visibleIndicators.volume && (
        <div className="chart-container oscillator-chart">
          <div className="chart-header">
            <h3>Volume</h3>
          </div>
          <div ref={volumeChartRef} />
        </div>
      )}
    </div>
  );
}
