import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, LineSeries, createChart, createSeriesMarkers } from "lightweight-charts";
import { useTheme } from "@/context/ThemeContext";
import { tokenColor } from "@/lib/themeTokens";

export default function CandlestickChart({
  data,
  indicators,
  selectedPeriod,
  currentPrice,
  patternMatches = [],
  predictionBasis,
  visibleIndicators,
}) {
  const { theme } = useTheme();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [selectedRange, setSelectedRange] = useState("1Y");
  const [indicatorVisibility, setIndicatorVisibility] = useState(() => ({
    sma5: true,
    sma20: true,
    sma50: true,
    trendLine: true,
    supportLine: true,
    resistanceLine: true,
    predictionMarker: true,
    patternMarkers: false,
    ...(visibleIndicators || {}),
  }));

  useEffect(() => {
    if (!visibleIndicators) return;
    setIndicatorVisibility((current) => ({
      ...current,
      ...visibleIndicators,
    }));
  }, [visibleIndicators]);

  const normalizedData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
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
          date: point.date,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        })),
    [data]
  );

  const rangeToBars = {
    "1M": 22,
    "3M": 66,
    "6M": 132,
    "1Y": 252,
    ALL: Number.POSITIVE_INFINITY,
  };

  const visibleData = useMemo(() => {
    if (!normalizedData.length) return [];
    const bars = rangeToBars[selectedRange] ?? rangeToBars["1Y"];
    if (!Number.isFinite(bars)) return normalizedData;
    return normalizedData.slice(-bars);
  }, [normalizedData, selectedRange]);

  const visibleStartDate = visibleData[0]?.date;
  const trendDirection = selectedPeriod?.direction || "flat";
  const trendLabel = trendDirection === "up" ? "Bullish" : trendDirection === "down" ? "Bearish" : "Neutral";
  const trendPeriodLabel = selectedPeriod?.period || "Selected";
  const chartColors = useMemo(
    () => ({
      card: tokenColor("card"),
      foreground: tokenColor("foreground"),
      border: tokenColor("border"),
      muted: tokenColor("muted"),
      mutedForeground: tokenColor("muted-foreground"),
      primary: tokenColor("primary"),
      secondary: tokenColor("secondary"),
      positive: tokenColor("positive"),
      destructive: tokenColor("destructive"),
    }),
    [theme]
  );

  function addCandleSeries(chart, options) {
    if (typeof chart?.addSeries === "function") {
      return chart.addSeries(CandlestickSeries, options);
    }
    if (typeof chart?.addCandlestickSeries === "function") {
      return chart.addCandlestickSeries(options);
    }
    throw new Error("Candlestick series API unavailable");
  }

  function addLineSeries(chart, options) {
    if (typeof chart?.addSeries === "function") {
      return chart.addSeries(LineSeries, options);
    }
    if (typeof chart?.addLineSeries === "function") {
      return chart.addLineSeries(options);
    }
    throw new Error("Line series API unavailable");
  }

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    if (!visibleData || visibleData.length === 0) {
      // Show placeholder when no data
      chartContainerRef.current.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:500px;background:hsl(var(--muted));color:hsl(var(--muted-foreground));font-size:1rem;">No chart data available for this symbol</div>';
      return;
    }

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    
    // Clear placeholder
    chartContainerRef.current.innerHTML = '';

    let chart;
    let candlestickSeries;
    try {
      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
          background: { color: chartColors.card },
          textColor: chartColors.foreground,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: chartColors.muted },
          horzLines: { color: chartColors.muted },
        },
        crosshair: {
          mode: 1,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
        rightPriceScale: {
          borderColor: chartColors.border,
        },
        timeScale: {
          borderColor: chartColors.border,
          timeVisible: true,
        },
      });

      chartRef.current = chart;

      candlestickSeries = addCandleSeries(chart, {
        upColor: chartColors.primary,
        downColor: chartColors.mutedForeground,
        borderVisible: false,
        wickUpColor: chartColors.primary,
        wickDownColor: chartColors.mutedForeground,
      });
    } catch (error) {
      console.error("Failed to initialize candlestick chart:", error);
      chartContainerRef.current.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:500px;background:hsl(var(--muted));color:hsl(var(--destructive));font-size:0.95rem;">Unable to render chart for this symbol right now</div>';
      return;
    }

    const candleData = visibleData.map((point) => ({
      time: point.date,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));

    if (candleData.length === 0) {
      chart.remove();
      chartRef.current = null;
      return;
    }

    candlestickSeries.setData(candleData);

    // Add SMA lines based on selected indicators
    const sma5Series = indicatorVisibility.sma5
      ? addLineSeries(chart, {
          color: chartColors.primary,
          lineWidth: 2,
          title: "SMA 5",
        })
      : null;

    const sma20Series = indicatorVisibility.sma20
      ? addLineSeries(chart, {
          color: chartColors.foreground,
          lineWidth: 2,
          title: "SMA 20",
        })
      : null;

    const sma50Series = indicatorVisibility.sma50
      ? addLineSeries(chart, {
          color: chartColors.mutedForeground,
          lineWidth: 2,
          title: "SMA 50",
        })
      : null;

    // Obvious overlay lines across the full chart for trend/pattern guidance
    const trendLineSeries = indicatorVisibility.trendLine
      ? addLineSeries(chart, {
          color: chartColors.foreground,
          lineWidth: 3,
          lineStyle: 2,
          title: "Trend Line",
        })
      : null;

    const supportLineSeries = indicatorVisibility.supportLine
      ? addLineSeries(chart, {
          color: chartColors.positive,
          lineWidth: 2,
          lineStyle: 2,
          title: "Support",
        })
      : null;

    const resistanceLineSeries = indicatorVisibility.resistanceLine
      ? addLineSeries(chart, {
          color: chartColors.destructive,
          lineWidth: 2,
          lineStyle: 2,
          title: "Resistance",
        })
      : null;

    const fullDataLength = normalizedData.length;
    const visibleStartIndex = Math.max(0, fullDataLength - visibleData.length);

    const alignSmaToVisibleWindow = (smaValues = []) => {
      if (!Array.isArray(smaValues) || smaValues.length === 0) return [];
      const smaStart = Math.max(0, fullDataLength - smaValues.length);
      const aligned = [];
      for (let index = 0; index < smaValues.length; index += 1) {
        const fullIndex = smaStart + index;
        if (fullIndex < visibleStartIndex) continue;
        const point = normalizedData[fullIndex];
        const value = smaValues[index];
        if (!point?.date || typeof value !== "number") continue;
        aligned.push({ time: point.date, value });
      }
      return aligned;
    };

    if (sma5Series && indicators.sma5 && indicators.sma5.length > 0) {
      const sma5Data = alignSmaToVisibleWindow(indicators.sma5);
      sma5Series.setData(sma5Data);
    }

    if (sma20Series && indicators.sma20 && indicators.sma20.length > 0) {
      const sma20Data = alignSmaToVisibleWindow(indicators.sma20);
      sma20Series.setData(sma20Data);
    }

    if (sma50Series && indicators.sma50 && indicators.sma50.length > 0) {
      const sma50Data = alignSmaToVisibleWindow(indicators.sma50);
      sma50Series.setData(sma50Data);
    }

    if (trendLineSeries && indicators.trendLine?.length) {
      const filteredTrendLine = indicators.trendLine.filter((point) => !visibleStartDate || point.time >= visibleStartDate);
      trendLineSeries.setData(filteredTrendLine);
    }

    if (supportLineSeries && indicators.supportLine?.length) {
      const filteredSupportLine = indicators.supportLine.filter((point) => !visibleStartDate || point.time >= visibleStartDate);
      supportLineSeries.setData(filteredSupportLine);
    }

    if (resistanceLineSeries && indicators.resistanceLine?.length) {
      const filteredResistanceLine = indicators.resistanceLine.filter((point) => !visibleStartDate || point.time >= visibleStartDate);
      resistanceLineSeries.setData(filteredResistanceLine);
    }

    // Add prediction marker if available
    const markers = [];

    if (indicatorVisibility.predictionMarker && selectedPeriod) {
      const prediction = selectedPeriod.predictedPrice;
      const lastDate = visibleData[visibleData.length - 1]?.date;
      
      if (lastDate && prediction) {
        markers.push({
          time: lastDate,
          position: prediction > currentPrice ? "aboveBar" : "belowBar",
          color: prediction > currentPrice ? chartColors.positive : chartColors.destructive,
          shape: prediction > currentPrice ? "arrowUp" : "arrowDown",
          text: `${selectedPeriod.period}: ${prediction > currentPrice ? "Bullish" : "Bearish"} ($${prediction})`,
        });
      }
    }

    if (indicatorVisibility.patternMarkers && Array.isArray(patternMatches) && patternMatches.length) {
      const patternMarkers = patternMatches
        .filter((match) => !visibleStartDate || match.time >= visibleStartDate)
        .slice(0, 4)
        .map((match) => ({
        time: match.time,
        position: match.direction === "down" ? "aboveBar" : "belowBar",
        color: match.direction === "down" ? chartColors.destructive : chartColors.positive,
        shape: "circle",
        text: `${match.indicator}`,
      }));
      markers.push(...patternMarkers);
    }

    const toTimestamp = (time) => {
      if (typeof time === "number") return time;
      if (typeof time === "string") {
        const withUtcMidnight = Date.parse(`${time}T00:00:00Z`);
        if (!Number.isNaN(withUtcMidnight)) return withUtcMidnight;
        const parsed = Date.parse(time);
        if (!Number.isNaN(parsed)) return parsed;
      }
      return 0;
    };

    const orderedMarkers = markers
      .filter((marker) => marker?.time)
      .sort((left, right) => toTimestamp(left.time) - toTimestamp(right.time));

    const uniqueMarkers = [];
    const seenTimes = new Set();
    for (const marker of orderedMarkers) {
      const key = String(marker.time);
      if (seenTimes.has(key)) continue;
      seenTimes.add(key);
      uniqueMarkers.push(marker);
    }

    if (typeof candlestickSeries?.setMarkers === "function") {
      candlestickSeries.setMarkers(uniqueMarkers);
    } else if (candlestickSeries) {
      createSeriesMarkers(candlestickSeries, uniqueMarkers);
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [
    visibleData,
    normalizedData,
    indicators,
    selectedPeriod,
    currentPrice,
    patternMatches,
    indicatorVisibility,
    visibleStartDate,
    chartColors,
  ]);

  const toggleIndicator = (key) => {
    setIndicatorVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const rangeButtons = ["1M", "3M", "6M", "1Y", "ALL"];

  return (
    <div className="chart-wrapper">
      <div className="chart-toolbar">
        <div className="chart-range-controls">
          {rangeButtons.map((range) => (
            <button
              key={range}
              type="button"
              className={`chart-range-btn ${selectedRange === range ? "active" : ""}`}
              onClick={() => setSelectedRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
        <div className="chart-nav-hint">Scroll to zoom • Drag to pan</div>
      </div>

      <div className="indicator-toggle-grid">
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.sma5} onChange={() => toggleIndicator("sma5")} />SMA 5</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.sma20} onChange={() => toggleIndicator("sma20")} />SMA 20</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.sma50} onChange={() => toggleIndicator("sma50")} />SMA 50</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.trendLine} onChange={() => toggleIndicator("trendLine")} />Trend Line</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.supportLine} onChange={() => toggleIndicator("supportLine")} />Support</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.resistanceLine} onChange={() => toggleIndicator("resistanceLine")} />Resistance</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.predictionMarker} onChange={() => toggleIndicator("predictionMarker")} />Prediction Marker</label>
        <label className="indicator-toggle-item"><input type="checkbox" checked={indicatorVisibility.patternMarkers} onChange={() => toggleIndicator("patternMarkers")} />Pattern Markers</label>
      </div>

      <div className="prediction-basis">
        <strong>Prediction Indicators:</strong>{" "}
        {(predictionBasis?.indicatorsUsed || [
          "OBV",
          "A/D",
          "ADX",
          "Aroon",
          "MACD",
          "RSI",
          "Stochastic",
        ]).join(" • ")}
      </div>
      <div className={`chart-trend-label ${trendDirection}`}>
        Trend ({trendPeriodLabel}): {trendLabel}
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
}
