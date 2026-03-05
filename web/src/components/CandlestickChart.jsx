import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function CandlestickChart({ data, indicators, selectedPeriod, currentPrice }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
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
    const candleData = data.map((point) => ({
      time: point.date,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));

    candlestickSeries.setData(candleData);

    // Add SMA lines based on selected indicators
    const sma5Series = chart.addLineSeries({
      color: "#2962FF",
      lineWidth: 2,
      title: "SMA 5",
    });

    const sma20Series = chart.addLineSeries({
      color: "#FF6D00",
      lineWidth: 2,
      title: "SMA 20",
    });

    const sma50Series = chart.addLineSeries({
      color: "#00897B",
      lineWidth: 2,
      title: "SMA 50",
    });

    // Calculate padding to align with candlestick data
    const sma5Start = Math.max(0, data.length - indicators.sma5.length);
    const sma20Start = Math.max(0, data.length - indicators.sma20.length);
    const sma50Start = Math.max(0, data.length - indicators.sma50.length);

    if (indicators.sma5 && indicators.sma5.length > 0) {
      const sma5Data = indicators.sma5.map((value, index) => ({
        time: data[sma5Start + index].date,
        value: value,
      }));
      sma5Series.setData(sma5Data);
    }

    if (indicators.sma20 && indicators.sma20.length > 0) {
      const sma20Data = indicators.sma20.map((value, index) => ({
        time: data[sma20Start + index].date,
        value: value,
      }));
      sma20Series.setData(sma20Data);
    }

    if (indicators.sma50 && indicators.sma50.length > 0) {
      const sma50Data = indicators.sma50.map((value, index) => ({
        time: data[sma50Start + index].date,
        value: value,
      }));
      sma50Series.setData(sma50Data);
    }

    // Add prediction marker if available
    if (selectedPeriod) {
      const prediction = selectedPeriod.predictedPrice;
      const lastDate = data[data.length - 1]?.date;
      
      if (lastDate && prediction) {
        // Add a marker for the prediction
        candlestickSeries.setMarkers([
          {
            time: lastDate,
            position: prediction > currentPrice ? "aboveBar" : "belowBar",
            color: prediction > currentPrice ? "#26a69a" : "#ef5350",
            shape: prediction > currentPrice ? "arrowUp" : "arrowDown",
            text: `${selectedPeriod.period}: ${prediction > currentPrice ? "Bullish" : "Bearish"} ($${prediction})`,
          },
        ]);
      }
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
  }, [data, indicators, selectedPeriod, currentPrice]);

  return (
    <div className="chart-wrapper">
      <div className={`chart-trend-label ${trendDirection}`}>
        Trend ({trendPeriodLabel}): {trendLabel}
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
}
