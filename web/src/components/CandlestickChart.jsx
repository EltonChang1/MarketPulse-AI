import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function CandlestickChart({
  data,
  indicators,
  selectedPeriod,
  currentPrice,
  patternMatches = [],
  predictionBasis,
  visibleIndicators,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const indicatorVisibility = {
    sma5: true,
    sma20: true,
    sma50: true,
    trendLine: true,
    supportLine: true,
    resistanceLine: true,
    predictionMarker: true,
    patternMarkers: true,
    ...(visibleIndicators || {}),
  };
  const trendDirection = selectedPeriod?.direction || "flat";
  const trendLabel = trendDirection === "up" ? "Bullish" : trendDirection === "down" ? "Bearish" : "Neutral";
  const trendPeriodLabel = selectedPeriod?.period || "Selected";

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
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
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Prepare candlestick data
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

    if (candleData.length === 0) {
      chart.remove();
      chartRef.current = null;
      return;
    }

    candlestickSeries.setData(candleData);

    // Add SMA lines based on selected indicators
    const sma5Series = indicatorVisibility.sma5
      ? chart.addLineSeries({
          color: "#2962FF",
          lineWidth: 2,
          title: "SMA 5",
        })
      : null;

    const sma20Series = indicatorVisibility.sma20
      ? chart.addLineSeries({
          color: "#FF6D00",
          lineWidth: 2,
          title: "SMA 20",
        })
      : null;

    const sma50Series = indicatorVisibility.sma50
      ? chart.addLineSeries({
          color: "#00897B",
          lineWidth: 2,
          title: "SMA 50",
        })
      : null;

    // Obvious overlay lines across the full chart for trend/pattern guidance
    const trendLineSeries = indicatorVisibility.trendLine
      ? chart.addLineSeries({
          color: "#7a5af8",
          lineWidth: 3,
          lineStyle: 2,
          title: "Trend Line",
        })
      : null;

    const supportLineSeries = indicatorVisibility.supportLine
      ? chart.addLineSeries({
          color: "#12b76a",
          lineWidth: 2,
          lineStyle: 2,
          title: "Support",
        })
      : null;

    const resistanceLineSeries = indicatorVisibility.resistanceLine
      ? chart.addLineSeries({
          color: "#f04438",
          lineWidth: 2,
          lineStyle: 2,
          title: "Resistance",
        })
      : null;

    // Calculate padding to align with candlestick data
    const sma5Start = Math.max(0, data.length - (indicators.sma5?.length || 0));
    const sma20Start = Math.max(0, data.length - (indicators.sma20?.length || 0));
    const sma50Start = Math.max(0, data.length - (indicators.sma50?.length || 0));

    if (sma5Series && indicators.sma5 && indicators.sma5.length > 0) {
      const sma5Data = indicators.sma5
        .map((value, index) => {
          const point = data[sma5Start + index];
          return point?.date ? { time: point.date, value } : null;
        })
        .filter(Boolean);
      sma5Series.setData(sma5Data);
    }

    if (sma20Series && indicators.sma20 && indicators.sma20.length > 0) {
      const sma20Data = indicators.sma20
        .map((value, index) => {
          const point = data[sma20Start + index];
          return point?.date ? { time: point.date, value } : null;
        })
        .filter(Boolean);
      sma20Series.setData(sma20Data);
    }

    if (sma50Series && indicators.sma50 && indicators.sma50.length > 0) {
      const sma50Data = indicators.sma50
        .map((value, index) => {
          const point = data[sma50Start + index];
          return point?.date ? { time: point.date, value } : null;
        })
        .filter(Boolean);
      sma50Series.setData(sma50Data);
    }

    if (trendLineSeries && indicators.trendLine?.length) {
      trendLineSeries.setData(indicators.trendLine);
    }

    if (supportLineSeries && indicators.supportLine?.length) {
      supportLineSeries.setData(indicators.supportLine);
    }

    if (resistanceLineSeries && indicators.resistanceLine?.length) {
      resistanceLineSeries.setData(indicators.resistanceLine);
    }

    // Add prediction marker if available
    const markers = [];

    if (indicatorVisibility.predictionMarker && selectedPeriod) {
      const prediction = selectedPeriod.predictedPrice;
      const lastDate = data[data.length - 1]?.date;
      
      if (lastDate && prediction) {
        markers.push({
          time: lastDate,
          position: prediction > currentPrice ? "aboveBar" : "belowBar",
          color: prediction > currentPrice ? "#26a69a" : "#ef5350",
          shape: prediction > currentPrice ? "arrowUp" : "arrowDown",
          text: `${selectedPeriod.period}: ${prediction > currentPrice ? "Bullish" : "Bearish"} ($${prediction})`,
        });
      }
    }

    if (indicatorVisibility.patternMarkers && Array.isArray(patternMatches) && patternMatches.length) {
      const patternMarkers = patternMatches.slice(0, 10).map((match) => ({
        time: match.time,
        position: match.direction === "down" ? "aboveBar" : "belowBar",
        color: match.direction === "down" ? "#f04438" : "#12b76a",
        shape: "circle",
        text: `${match.indicator}: ${match.label}`,
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

    candlestickSeries.setMarkers(uniqueMarkers);

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
  }, [data, indicators, selectedPeriod, currentPrice, patternMatches, visibleIndicators]);

  return (
    <div className="chart-wrapper">
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
