import { useEffect, useRef, useState } from "react";
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
} from "chart.js";
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from "chartjs-chart-financial";
import "chartjs-adapter-date-fns";

// Register Chart.js components
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
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
);

// Technical indicator calculations
function calculateSMA(data, period) {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.c, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  let prevEMA = data.slice(0, period).reduce((a, b) => a + b.c, 0) / period;
  ema.push(prevEMA);
  
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i].c - prevEMA) * multiplier + prevEMA;
    ema.push(currentEMA);
    prevEMA = currentEMA;
  }
  return ema;
}

function calculateRSI(data, period = 14) {
  const rsi = [];
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].c - data[i - 1].c;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    const change = data[i].c - data[i - 1].c;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 1);
    const rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);
  }
  return rsi;
}

function calculateMACD(data) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = [];

  const startIndex = ema26.length - ema12.length;
  for (let i = 0; i < ema12.length; i++) {
    if (i + startIndex < ema26.length) {
      macdLine.push(ema12[i] - ema26[i + startIndex]);
    }
  }

  const macdData = macdLine.map(m => ({ c: m }));
  const signal = calculateEMA(macdData, 9);
  const histogram = [];

  for (let i = 0; i < signal.length; i++) {
    histogram.push(macdLine[i] - signal[i]);
  }

  return { macd: macdLine, signal, histogram };
}

function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const bands = { upper: [], middle: [], lower: [] };

  for (let i = 0; i < sma.length; i++) {
    const dataSlice = data.slice(i, i + period);
    const mean = sma[i];
    const variance = dataSlice.reduce((sum, d) => sum + Math.pow(d.c - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    bands.middle.push(mean);
    bands.upper.push(mean + stdDev * std);
    bands.lower.push(mean - stdDev * std);
  }

  return bands;
}

// Generate mock historical data
function generateMockData(symbol, interval, count) {
  const data = [];
  const now = Date.now();
  let intervalMs = 86400000; // 1 day default
  
  if (interval === '1') intervalMs = 60000;
  else if (interval === '5') intervalMs = 300000;
  else if (interval === '15') intervalMs = 900000;
  else if (interval === '60') intervalMs = 3600000;
  else if (interval === '240') intervalMs = 14400000;
  else if (interval === 'D') intervalMs = 86400000;
  else if (interval === 'W') intervalMs = 604800000;

  let basePrice = 150 + Math.random() * 50;
  
  for (let i = count - 1; i >= 0; i--) {
    const time = now - (i * intervalMs);
    const volatility = basePrice * 0.02;
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({
      x: time,
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      volume,
    });

    basePrice = close;
  }

  return data;
}


export default function TradingViewChart({ symbol }) {
  const mainChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const indicatorChartRef = useRef(null);
  const mainChartInstance = useRef(null);
  const volumeChartInstance = useRef(null);
  const indicatorChartInstance = useRef(null);

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
    if (!mainChartRef.current) return;

    // Generate data
    const dataCount = interval === '1' ? 200 : interval === '5' ? 300 : 500;
    const rawData = generateMockData(symbol, interval, dataCount);

    // Destroy existing charts
    if (mainChartInstance.current) {
      mainChartInstance.current.destroy();
      mainChartInstance.current = null;
    }
    if (volumeChartInstance.current) {
      volumeChartInstance.current.destroy();
      volumeChartInstance.current = null;
    }
    if (indicatorChartInstance.current) {
      indicatorChartInstance.current.destroy();
      indicatorChartInstance.current = null;
    }

    // Prepare datasets for main chart
    const datasets = [{
      label: symbol,
      data: rawData,
      type: 'candlestick',
      borderColor: {
        up: '#26a69a',
        down: '#ef5350',
        unchanged: '#999',
      },
      backgroundColor: {
        up: '#26a69a',
        down: '#ef5350',
        unchanged: '#999',
      },
    }];

    // Add SMA indicators
    if (indicators.sma) {
      const sma20 = calculateSMA(rawData, 20);
      const sma50 = calculateSMA(rawData, 50);
      
      datasets.push({
        label: 'SMA 20',
        data: sma20.map((val, idx) => ({ x: rawData[idx + 19].x, y: val })),
        type: 'line',
        borderColor: '#2962FF',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      });
      
      datasets.push({
        label: 'SMA 50',
        data: sma50.map((val, idx) => ({ x: rawData[idx + 49].x, y: val })),
        type: 'line',
        borderColor: '#FF6D00',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      });
    }

    // Add EMA indicators
    if (indicators.ema) {
      const ema12 = calculateEMA(rawData, 12);
      const ema26 = calculateEMA(rawData, 26);
      
      datasets.push({
        label: 'EMA 12',
        data: ema12.map((val, idx) => ({ x: rawData[idx + 12].x, y: val })),
        type: 'line',
        borderColor: '#7B1FA2',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [5, 5],
        tension: 0.1,
      });
      
      datasets.push({
        label: 'EMA 26',
        data: ema26.map((val, idx) => ({ x: rawData[idx + 26].x, y: val })),
        type: 'line',
        borderColor: '#E91E63',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [5, 5],
        tension: 0.1,
      });
    }

    // Add Bollinger Bands
    if (indicators.bb) {
      const bb = calculateBollingerBands(rawData, 20);
      
      datasets.push({
        label: 'BB Upper',
        data: bb.upper.map((val, idx) => ({ x: rawData[idx + 19].x, y: val })),
        type: 'line',
        borderColor: '#9C27B0',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [2, 2],
        tension: 0.1,
      });
      
      datasets.push({
        label: 'BB Middle',
        data: bb.middle.map((val, idx) => ({ x: rawData[idx + 19].x, y: val })),
        type: 'line',
        borderColor: '#9C27B0',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      });
      
      datasets.push({
        label: 'BB Lower',
        data: bb.lower.map((val, idx) => ({ x: rawData[idx + 19].x, y: val })),
        type: 'line',
        borderColor: '#9C27B0',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [2, 2],
        tension: 0.1,
      });
    }

    // Create main price chart
    mainChartInstance.current = new Chart(mainChartRef.current, {
      type: 'candlestick',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: interval === '1' || interval === '5' ? 'minute' : interval === '15' || interval === '60' ? 'hour' : 'day',
            },
            grid: { color: '#f0f0f0' },
          },
          y: {
            position: 'right',
            grid: { color: '#f0f0f0' },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { boxWidth: 15, padding: 10, font: { size: 11 } },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
      },
    });

    // Create volume chart
    if (volumeChartRef.current) {
      const volumeData = rawData.map(d => ({
        x: d.x,
        y: d.volume,
      }));

      const volumeColors = rawData.map(d => d.c >= d.o ? '#26a69a80' : '#ef535080');

      volumeChartInstance.current = new Chart(volumeChartRef.current, {
        type: 'bar',
        data: {
          datasets: [{
            label: 'Volume',
            data: volumeData,
            backgroundColor: volumeColors,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: interval === '1' || interval === '5' ? 'minute' : interval === '15' || interval === '60' ? 'hour' : 'day',
              },
              grid: { color: '#f0f0f0' },
              display: false,
            },
            y: {
              position: 'right',
              grid: { color: '#f0f0f0' },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
        },
      });
    }

    // Create indicator chart (RSI/MACD)
    if (indicatorChartRef.current && (indicators.rsi || indicators.macd)) {
      const indicatorDatasets = [];

      if (indicators.rsi) {
        const rsi = calculateRSI(rawData);
        
        indicatorDatasets.push({
          label: 'RSI',
          data: rsi.map((val, idx) => ({ x: rawData[idx + 14].x, y: val })),
          type: 'line',
          borderColor: '#2962FF',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y',
          tension: 0.1,
        });

        // RSI reference lines
        indicatorDatasets.push({
          label: 'Overbought',
          data: rawData.slice(14).map(d => ({ x: d.x, y: 70 })),
          type: 'line',
          borderColor: '#ff000040',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y',
        });

        indicatorDatasets.push({
          label: 'Oversold',
          data: rawData.slice(14).map(d => ({ x: d.x, y: 30 })),
          type: 'line',
          borderColor: '#00ff0040',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y',
        });
      }

      if (indicators.macd) {
        const macd = calculateMACD(rawData);
        const macdOffset = rawData.length - macd.macd.length;
        
        indicatorDatasets.push({
          label: 'MACD',
          data: macd.macd.map((val, idx) => ({ x: rawData[idx + macdOffset].x, y: val })),
          type: 'line',
          borderColor: '#2962FF',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: indicators.rsi ? 'y1' : 'y',
          tension: 0.1,
        });

        const signalOffset = rawData.length - macd.signal.length;
        indicatorDatasets.push({
          label: 'Signal',
          data: macd.signal.map((val, idx) => ({ x: rawData[idx + signalOffset].x, y: val })),
          type: 'line',
          borderColor: '#FF6D00',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: indicators.rsi ? 'y1' : 'y',
          tension: 0.1,
        });

        const histColors = macd.histogram.map(h => h >= 0 ? '#26a69a' : '#ef5350');
        indicatorDatasets.push({
          label: 'Histogram',
          data: macd.histogram.map((val, idx) => ({ x: rawData[idx + signalOffset].x, y: val })),
          type: 'bar',
          backgroundColor: histColors,
          borderWidth: 0,
          yAxisID: indicators.rsi ? 'y1' : 'y',
        });
      }

      const scales = {
        x: {
          type: 'time',
          time: {
            unit: interval === '1' || interval === '5' ? 'minute' : interval === '15' || interval === '60' ? 'hour' : 'day',
          },
          grid: { color: '#f0f0f0' },
          display: false,
        },
        y: {
          position: 'right',
          grid: { color: '#f0f0f0' },
          display: indicators.rsi,
        },
      };

      if (indicators.rsi && indicators.macd) {
        scales.y1 = {
          position: 'left',
          grid: { display: false },
        };
      }

      indicatorChartInstance.current = new Chart(indicatorChartRef.current, {
        type: 'line',
        data: { datasets: indicatorDatasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { boxWidth: 15, padding: 10, font: { size: 11 } },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
        },
      });
    }

    return () => {
      if (mainChartInstance.current) mainChartInstance.current.destroy();
      if (volumeChartInstance.current) volumeChartInstance.current.destroy();
      if (indicatorChartInstance.current) indicatorChartInstance.current.destroy();
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

  const toggleIndicator = (key) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
                  onChange={() => toggleIndicator('sma')}
                />
                <span>SMA</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.ema}
                  onChange={() => toggleIndicator('ema')}
                />
                <span>EMA</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.bb}
                  onChange={() => toggleIndicator('bb')}
                />
                <span>Bollinger Bands</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.rsi}
                  onChange={() => toggleIndicator('rsi')}
                />
                <span>RSI</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={indicators.macd}
                  onChange={() => toggleIndicator('macd')}
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
        <div className="chart-container">
          <canvas ref={mainChartRef}></canvas>
        </div>
        <div className="volume-container">
          <canvas ref={volumeChartRef}></canvas>
        </div>
        {(indicators.rsi || indicators.macd) && (
          <div className="indicator-container">
            <canvas ref={indicatorChartRef}></canvas>
          </div>
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
