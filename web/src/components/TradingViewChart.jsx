import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

// Technical indicator calculations
function calculateSMA(data, period) {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
    sma.push({ time: data[i].time, value: sum / period });
  }
  return sma;
}

function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  let prevEMA = data.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
    ema.push({ time: data[i].time, value: currentEMA });
    prevEMA = currentEMA;
  }
  return ema;
}

function calculateRSI(data, period = 14) {
  const rsi = [];
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 1);
    const rsiValue = 100 - (100 / (1 + rs));
    rsi.push({ time: data[i].time, value: rsiValue });
  }
  return rsi;
}

function calculateMACD(data) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = [];

  const startIndex = Math.max(0, ema26.length - ema12.length);
  for (let i = 0; i < ema12.length && i + startIndex < ema26.length; i++) {
    macdLine.push({
      time: ema12[i].time,
      value: ema12[i].value - ema26[i + startIndex].value,
    });
  }

  const macdData = macdLine.map((m, i) => ({ close: m.value, time: m.time }));
  const signal = calculateEMA(macdData, 9);
  const histogram = [];

  for (let i = 0; i < signal.length; i++) {
    const macdIndex = macdLine.findIndex(m => m.time === signal[i].time);
    if (macdIndex !== -1) {
      histogram.push({
        time: signal[i].time,
        value: macdLine[macdIndex].value - signal[i].value,
      });
    }
  }

  return { macd: macdLine, signal, histogram };
}

function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const bands = { upper: [], middle: [], lower: [] };

  for (let i = 0; i < sma.length; i++) {
    const dataSlice = data.slice(i, i + period);
    const mean = sma[i].value;
    const variance = dataSlice.reduce((sum, d) => sum + Math.pow(d.close - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    bands.middle.push(sma[i]);
    bands.upper.push({ time: sma[i].time, value: mean + stdDev * std });
    bands.lower.push({ time: sma[i].time, value: mean - stdDev * std });
  }

  return bands;
}

// Generate mock historical data
function generateMockData(symbol, interval, count) {
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  let intervalSeconds = 86400; // 1 day default
  
  if (interval === '1') intervalSeconds = 60;
  else if (interval === '5') intervalSeconds = 300;
  else if (interval === '15') intervalSeconds = 900;
  else if (interval === '60') intervalSeconds = 3600;
  else if (interval === '240') intervalSeconds = 14400;
  else if (interval === 'D') intervalSeconds = 86400;
  else if (interval === 'W') intervalSeconds = 604800;

  let basePrice = 150 + Math.random() * 50;
  
  for (let i = count - 1; i >= 0; i--) {
    const time = now - (i * intervalSeconds);
    const volatility = basePrice * 0.02;
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({
      time: time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    basePrice = close;
  }

  return data;
}

export default function TradingViewChart({ symbol }) {
  const chartContainerRef = useRef(null);
  const volumeContainerRef = useRef(null);
  const indicatorContainerRef = useRef(null);
  const chartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const indicatorChartRef = useRef(null);

  const [interval, setInterval] = useState('D');
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: true,
    bb: false,
    rsi: true,
    macd: true,
  });
  const [drawingMode, setDrawingMode] = useState(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing charts
    if (chartRef.current) chartRef.current.remove();
    if (volumeChartRef.current) volumeChartRef.current.remove();
    if (indicatorChartRef.current) indicatorChartRef.current.remove();

    // Generate data
    const dataCount = interval === '1' ? 200 : interval === '5' ? 300 : 500;
    const data = generateMockData(symbol, interval, dataCount);

    // Create main price chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#d1d4dc' },
      timeScale: {
        borderColor: '#d1d4dc',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candlestickSeries.setData(data);

    // Add indicators
    if (indicators.sma) {
      const sma20 = calculateSMA(data, 20);
      const sma50 = calculateSMA(data, 50);
      const sma20Series = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: 'SMA 20',
      });
      const sma50Series = chart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 2,
        title: 'SMA 50',
      });
      sma20Series.setData(sma20);
      sma50Series.setData(sma50);
    }

    if (indicators.ema) {
      const ema12 = calculateEMA(data, 12);
      const ema26 = calculateEMA(data, 26);
      const ema12Series = chart.addLineSeries({
        color: '#7B1FA2',
        lineWidth: 1,
        title: 'EMA 12',
      });
      const ema26Series = chart.addLineSeries({
        color: '#E91E63',
        lineWidth: 1,
        title: 'EMA 26',
      });
      ema12Series.setData(ema12);
      ema26Series.setData(ema26);
    }

    if (indicators.bb) {
      const bb = calculateBollingerBands(data);
      const upperSeries = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Upper',
      });
      const middleSeries = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        title: 'BB Middle',
      });
      const lowerSeries = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Lower',
      });
      upperSeries.setData(bb.upper);
      middleSeries.setData(bb.middle);
      lowerSeries.setData(bb.lower);
    }

    // Create volume chart
    if (volumeContainerRef.current) {
      const volumeChart = createChart(volumeContainerRef.current, {
        width: volumeContainerRef.current.clientWidth,
        height: 120,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        rightPriceScale: { borderColor: '#d1d4dc' },
        timeScale: {
          borderColor: '#d1d4dc',
          visible: false,
        },
      });
      volumeChartRef.current = volumeChart;

      const volumeSeries = volumeChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
      });
      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#26a69a80' : '#ef535080',
      }));
      volumeSeries.setData(volumeData);

      // Sync time scales
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        volumeChart.timeScale().setVisibleRange(timeRange);
      });
    }

    // Create indicator chart (RSI/MACD)
    if (indicatorContainerRef.current && (indicators.rsi || indicators.macd)) {
      const indicatorChart = createChart(indicatorContainerRef.current, {
        width: indicatorContainerRef.current.clientWidth,
        height: 150,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        rightPriceScale: { borderColor: '#d1d4dc' },
        timeScale: {
          borderColor: '#d1d4dc',
          visible: false,
        },
      });
      indicatorChartRef.current = indicatorChart;

      if (indicators.rsi) {
        const rsi = calculateRSI(data);
        const rsiSeries = indicatorChart.addLineSeries({
          color: '#2962FF',
          lineWidth: 2,
          title: 'RSI',
        });
        rsiSeries.setData(rsi);

        // Add RSI reference lines
        const rsiUpper = indicatorChart.addLineSeries({
          color: '#ff000040',
          lineWidth: 1,
          lineStyle: 2,
        });
        const rsiLower = indicatorChart.addLineSeries({
          color: '#00ff0040',
          lineWidth: 1,
          lineStyle: 2,
        });
        rsiUpper.setData(rsi.map(r => ({ time: r.time, value: 70 })));
        rsiLower.setData(rsi.map(r => ({ time: r.time, value: 30 })));
      }

      if (indicators.macd) {
        const macd = calculateMACD(data);
        const macdSeries = indicatorChart.addLineSeries({
          color: '#2962FF',
          lineWidth: 2,
          title: 'MACD',
        });
        const signalSeries = indicatorChart.addLineSeries({
          color: '#FF6D00',
          lineWidth: 1,
          title: 'Signal',
        });
        const histogramSeries = indicatorChart.addHistogramSeries({
          color: '#26a69a',
        });

        macdSeries.setData(macd.macd);
        signalSeries.setData(macd.signal);
        histogramSeries.setData(macd.histogram.map(h => ({
          ...h,
          color: h.value >= 0 ? '#26a69a' : '#ef5350',
        })));
      }

      // Sync time scales
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        indicatorChart.timeScale().setVisibleRange(timeRange);
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
      if (volumeContainerRef.current && volumeChartRef.current) {
        volumeChartRef.current.applyOptions({ 
          width: volumeContainerRef.current.clientWidth 
        });
      }
      if (indicatorContainerRef.current && indicatorChartRef.current) {
        indicatorChartRef.current.applyOptions({ 
          width: indicatorContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) chartRef.current.remove();
      if (volumeChartRef.current) volumeChartRef.current.remove();
      if (indicatorChartRef.current) indicatorChartRef.current.remove();
    };
  }, [symbol, interval, indicators]);

  const timeframes = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: '1D', value: 'D' },
    { label: '1W', value: 'W' },
  ];

  const drawingTools = [
    { label: 'Trend Line', value: 'trend' },
    { label: 'Horizontal Line', value: 'horizontal' },
    { label: 'Rectangle', value: 'rectangle' },
    { label: 'Fibonacci', value: 'fibonacci' },
  ];

  return (
    <div className="tradingview-wrapper">
      <div className="tradingview-header">
        <div className="chart-controls">
          <div className="control-group">
            <label>Timeframe:</label>
            <div className="button-group">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  className={interval === tf.value ? 'active' : ''}
                  onClick={() => setInterval(tf.value)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Indicators:</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={indicators.sma}
                  onChange={(e) => setIndicators({ ...indicators, sma: e.target.checked })}
                />
                <span>SMA</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.ema}
                  onChange={(e) => setIndicators({ ...indicators, ema: e.target.checked })}
                />
                <span>EMA</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.bb}
                  onChange={(e) => setIndicators({ ...indicators, bb: e.target.checked })}
                />
                <span>Bollinger Bands</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.rsi}
                  onChange={(e) => setIndicators({ ...indicators, rsi: e.target.checked })}
                />
                <span>RSI</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.macd}
                  onChange={(e) => setIndicators({ ...indicators, macd: e.target.checked })}
                />
                <span>MACD</span>
              </label>
            </div>
          </div>

          <div className="control-group">
            <label>Drawing Tools:</label>
            <div className="button-group">
              {drawingTools.map(tool => (
                <button
                  key={tool.value}
                  className={drawingMode === tool.value ? 'active' : ''}
                  onClick={() => setDrawingMode(drawingMode === tool.value ? null : tool.value)}
                  title={tool.label}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tradingview-widget-shell">
        <div ref={chartContainerRef} className="chart-container" />
        <div ref={volumeContainerRef} className="volume-container" />
        {(indicators.rsi || indicators.macd) && (
          <div ref={indicatorContainerRef} className="indicator-container" />
        )}
      </div>

      <div className="chart-footer">
        <p className="chart-legend">
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#26a69a' }}></span>
            Bullish
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ef5350' }}></span>
            Bearish
          </span>
          {indicators.sma && (
            <>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#2962FF' }}></span>
                SMA 20
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#FF6D00' }}></span>
                SMA 50
              </span>
            </>
          )}
          {indicators.ema && (
            <>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#7B1FA2' }}></span>
                EMA 12
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#E91E63' }}></span>
                EMA 26
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
