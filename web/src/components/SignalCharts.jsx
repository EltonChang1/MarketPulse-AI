import { useEffect, useRef, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SIGNAL_COLORS = {
  RSI: "#f59e0b",
  MACD: "#3b82f6",
  Stochastic: "#8b5cf6",
  ADX: "#06b6d4",
  OBV: "#10b981",
};

export default function SignalCharts({ stock }) {
  const [activeSignals, setActiveSignals] = useState({
    RSI: true,
    MACD: false,
    Stochastic: false,
    ADX: false,
    OBV: false,
  });
  
  const chartRefs = useRef({});
  const chartInstances = useRef({});
  
  const indicatorSeries = stock?.technicalForecast?.indicatorSeries || {};
  const history = stock?.candlestickData || [];

  const toggleSignal = (signal) => {
    setActiveSignals((prev) => ({ ...prev, [signal]: !prev[signal] }));
  };

  useEffect(() => {
    if (!history.length || !indicatorSeries) return;

    const labels = history.slice(-100).map((h) => h.date);

    // RSI Chart
    if (activeSignals.RSI && chartRefs.current.RSI) {
      const rsiData = indicatorSeries.rsi14?.slice(-100) || [];
      if (rsiData.length > 0) {
        renderChart("RSI", labels, rsiData, "#f59e0b", [
          { value: 70, label: "Overbought", color: "#dc2626" },
          { value: 30, label: "Oversold", color: "#16a34a" },
        ]);
      }
    }

    // MACD Chart
    if (activeSignals.MACD && chartRefs.current.MACD) {
      const macdLine = indicatorSeries.macd?.slice(-100) || [];
      const signalLine = indicatorSeries.macdSignal?.slice(-100) || [];
      if (macdLine.length > 0 || signalLine.length > 0) {
        renderChartMulti("MACD", labels, [
          { label: "MACD", data: macdLine, color: "#3b82f6" },
          { label: "Signal", data: signalLine, color: "#ef4444" },
        ], [{ value: 0, label: "Zero", color: "#6b7280" }]);
      }
    }

    // Stochastic Chart
    if (activeSignals.Stochastic && chartRefs.current.Stochastic) {
      const kLine = indicatorSeries.stochK?.slice(-100) || [];
      const dLine = indicatorSeries.stochD?.slice(-100) || [];
      if (kLine.length > 0 || dLine.length > 0) {
        renderChartMulti("Stochastic", labels, [
          { label: "%K", data: kLine, color: "#8b5cf6" },
          { label: "%D", data: dLine, color: "#06b6d4" },
        ], [
          { value: 80, label: "Overbought", color: "#dc2626" },
          { value: 20, label: "Oversold", color: "#16a34a" },
        ]);
      }
    }

    // ADX Chart
    if (activeSignals.ADX && chartRefs.current.ADX) {
      const adxData = indicatorSeries.adx?.slice(-100) || [];
      if (adxData.length > 0) {
        renderChart("ADX", labels, adxData, "#06b6d4", [
          { value: 25, label: "Strong Trend", color: "#2563eb" },
        ]);
      }
    }

    // OBV Chart
    if (activeSignals.OBV && chartRefs.current.OBV) {
      const obvData = indicatorSeries.obv?.slice(-100) || [];
      if (obvData.length > 0) {
        renderChart("OBV", labels, obvData, "#10b981", []);
      }
    }

    return () => {
      Object.values(chartInstances.current).forEach((chart) => {
        if (chart) chart.destroy();
      });
      chartInstances.current = {};
    };
  }, [activeSignals, indicatorSeries, history]);

  function renderChart(signal, labels, data, color, refLines = []) {
    const canvasRef = chartRefs.current[signal];
    if (!canvasRef || !data.length) return;

    if (chartInstances.current[signal]) {
      chartInstances.current[signal].destroy();
    }

    const ctx = canvasRef.getContext("2d");
    const datasets = [
      {
        label: signal,
        data,
        borderColor: color,
        backgroundColor: `${color}15`,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      ...refLines.map((line) => ({
        label: line.label,
        data: Array(data.length).fill(line.value),
        borderColor: line.color,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
      })),
    ];

    chartInstances.current[signal] = new ChartJS(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top", labels: { font: { size: 10 } } },
          title: { display: false },
        },
        scales: {
          y: { ticks: { font: { size: 9 } } },
          x: { ticks: { font: { size: 9 } } },
        },
      },
    });
  }

  function renderChartMulti(signal, labels, lineData, refLines = []) {
    const canvasRef = chartRefs.current[signal];
    if (!canvasRef || !lineData.length) return;

    if (chartInstances.current[signal]) {
      chartInstances.current[signal].destroy();
    }

    const ctx = canvasRef.getContext("2d");
    const datasets = [
      ...lineData.map((line) => ({
        label: line.label,
        data: line.data,
        borderColor: line.color,
        backgroundColor: `${line.color}15`,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      })),
      ...refLines.map((line) => ({
        label: line.label,
        data: Array(lineData[0]?.data?.length || 0).fill(line.value),
        borderColor: line.color,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
      })),
    ];

    chartInstances.current[signal] = new ChartJS(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top", labels: { font: { size: 10 } } },
          title: { display: false },
        },
        scales: {
          y: { ticks: { font: { size: 9 } } },
          x: { ticks: { font: { size: 9 } } },
        },
      },
    });
  }

  return (
    <div className="signal-charts-section">
      <h3>📊 Technical Signal Charts</h3>
      
      <div className="signal-toggles">
        {Object.keys(activeSignals).map((signal) => (
          <button
            key={signal}
            className={`signal-toggle ${activeSignals[signal] ? "active" : ""}`}
            onClick={() => toggleSignal(signal)}
            style={{
              borderColor: SIGNAL_COLORS[signal],
              color: activeSignals[signal] ? "#fff" : SIGNAL_COLORS[signal],
              backgroundColor: activeSignals[signal] ? SIGNAL_COLORS[signal] : "transparent",
            }}
          >
            {signal}
          </button>
        ))}
      </div>

      <div className="signal-charts-grid">
        {activeSignals.RSI && (
          <div className="signal-chart-wrap">
            <canvas ref={(ref) => (chartRefs.current.RSI = ref)} />
          </div>
        )}
        {activeSignals.MACD && (
          <div className="signal-chart-wrap">
            <canvas ref={(ref) => (chartRefs.current.MACD = ref)} />
          </div>
        )}
        {activeSignals.Stochastic && (
          <div className="signal-chart-wrap">
            <canvas ref={(ref) => (chartRefs.current.Stochastic = ref)} />
          </div>
        )}
        {activeSignals.ADX && (
          <div className="signal-chart-wrap">
            <canvas ref={(ref) => (chartRefs.current.ADX = ref)} />
          </div>
        )}
        {activeSignals.OBV && (
          <div className="signal-chart-wrap">
            <canvas ref={(ref) => (chartRefs.current.OBV = ref)} />
          </div>
        )}
      </div>
    </div>
  );
}
