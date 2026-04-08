import { useEffect, useRef, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { useTheme } from "@/context/ThemeContext";
import { tokenColor, tokenColorAlpha } from "@/lib/themeTokens";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SignalCharts({ stock }) {
  const { theme } = useTheme();
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

  const palette = {
    primary: tokenColor("primary"),
    foreground: tokenColor("foreground"),
    mutedForeground: tokenColor("muted-foreground"),
    positive: tokenColor("positive"),
    destructive: tokenColor("destructive"),
    foregroundSoft: tokenColorAlpha("foreground", 0.08, "rgba(17,24,39,0.08)"),
    foregroundLineSoft: tokenColorAlpha("foreground", 0.3, "rgba(17,24,39,0.3)"),
    primaryForeground: tokenColor("primary-foreground", "rgb(250 250 250)"),
  };

  const signalColors = {
    RSI: palette.primary,
    MACD: palette.foreground,
    Stochastic: palette.mutedForeground,
    ADX: palette.foregroundLineSoft,
    OBV: palette.foreground,
  };

  const toggleSignal = (signal) => {
    setActiveSignals((prev) => ({ ...prev, [signal]: !prev[signal] }));
  };

  useEffect(() => {
    if (!history.length || !indicatorSeries) return;
    const labels = history.slice(-100).map((h) => h.date);

    if (activeSignals.RSI && chartRefs.current.RSI) {
      const rsiData = indicatorSeries.rsi14?.slice(-100) || [];
      if (rsiData.length > 0) {
        renderChart("RSI", labels, rsiData, palette.primary, [
          { value: 70, label: "Overbought", color: palette.destructive },
          { value: 30, label: "Oversold", color: palette.positive },
        ]);
      }
    }

    if (activeSignals.MACD && chartRefs.current.MACD) {
      const macdLine = indicatorSeries.macd?.slice(-100) || [];
      const signalLine = indicatorSeries.macdSignal?.slice(-100) || [];
      if (macdLine.length > 0 || signalLine.length > 0) {
        renderChartMulti(
          "MACD",
          labels,
          [
            { label: "MACD", data: macdLine, color: palette.primary },
            { label: "Signal", data: signalLine, color: palette.mutedForeground },
          ],
          [{ value: 0, label: "Zero", color: palette.foregroundLineSoft }]
        );
      }
    }

    if (activeSignals.Stochastic && chartRefs.current.Stochastic) {
      const kLine = indicatorSeries.stochK?.slice(-100) || [];
      const dLine = indicatorSeries.stochD?.slice(-100) || [];
      if (kLine.length > 0 || dLine.length > 0) {
        renderChartMulti(
          "Stochastic",
          labels,
          [
            { label: "%K", data: kLine, color: palette.foreground },
            { label: "%D", data: dLine, color: palette.foregroundLineSoft },
          ],
          [
            { value: 80, label: "Overbought", color: palette.destructive },
            { value: 20, label: "Oversold", color: palette.positive },
          ]
        );
      }
    }

    if (activeSignals.ADX && chartRefs.current.ADX) {
      const adxData = indicatorSeries.adx?.slice(-100) || [];
      if (adxData.length > 0) {
        renderChart("ADX", labels, adxData, palette.foreground, [
          { value: 25, label: "Strong Trend", color: palette.primary },
        ]);
      }
    }

    if (activeSignals.OBV && chartRefs.current.OBV) {
      const obvData = indicatorSeries.obv?.slice(-100) || [];
      if (obvData.length > 0) {
        renderChart("OBV", labels, obvData, palette.mutedForeground, []);
      }
    }

    return () => {
      Object.values(chartInstances.current).forEach((chart) => chart && chart.destroy());
      chartInstances.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSignals, indicatorSeries, history, theme]);

  function renderChart(signal, labels, data, color, refLines = []) {
    const canvasRef = chartRefs.current[signal];
    if (!canvasRef || !data.length) return;
    if (chartInstances.current[signal]) chartInstances.current[signal].destroy();

    const ctx = canvasRef.getContext("2d");
    const datasets = [
      {
        label: signal,
        data,
        borderColor: color,
        backgroundColor: palette.foregroundSoft,
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
    if (chartInstances.current[signal]) chartInstances.current[signal].destroy();

    const ctx = canvasRef.getContext("2d");
    const datasets = [
      ...lineData.map((line) => ({
        label: line.label,
        data: line.data,
        borderColor: line.color,
        backgroundColor: palette.foregroundSoft,
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
              borderColor: signalColors[signal],
              color: activeSignals[signal] ? palette.primaryForeground : signalColors[signal],
              backgroundColor: activeSignals[signal] ? signalColors[signal] : "transparent",
            }}
          >
            {signal}
          </button>
        ))}
      </div>

      <div className="signal-charts-grid">
        {activeSignals.RSI && <div className="signal-chart-wrap"><canvas ref={(ref) => (chartRefs.current.RSI = ref)} /></div>}
        {activeSignals.MACD && <div className="signal-chart-wrap"><canvas ref={(ref) => (chartRefs.current.MACD = ref)} /></div>}
        {activeSignals.Stochastic && <div className="signal-chart-wrap"><canvas ref={(ref) => (chartRefs.current.Stochastic = ref)} /></div>}
        {activeSignals.ADX && <div className="signal-chart-wrap"><canvas ref={(ref) => (chartRefs.current.ADX = ref)} /></div>}
        {activeSignals.OBV && <div className="signal-chart-wrap"><canvas ref={(ref) => (chartRefs.current.OBV = ref)} /></div>}
      </div>
    </div>
  );
}
