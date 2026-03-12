import { useEffect, useMemo, useRef } from "react";

function toTradingViewSymbol(symbol = "") {
  const normalized = String(symbol || "").toUpperCase().replace("-", ".");
  if (!normalized) return "NASDAQ:AAPL";

  const nyseSymbols = new Set(["BRK.B", "JPM"]);
  const exchange = nyseSymbols.has(normalized) ? "NYSE" : "NASDAQ";
  return `${exchange}:${normalized}`;
}

function loadTradingViewScript() {
  return new Promise((resolve, reject) => {
    if (window.TradingView?.widget) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-tradingview="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TradingView script")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.dataset.tradingview = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView script"));
    document.body.appendChild(script);
  });
}

export default function TradingViewChart({ symbol }) {
  const widgetContainerId = useRef(`tradingview_${Math.random().toString(36).slice(2)}`);
  const tvSymbol = useMemo(() => toTradingViewSymbol(symbol), [symbol]);

  useEffect(() => {
    let isDisposed = false;

    loadTradingViewScript()
      .then(() => {
        if (isDisposed || !window.TradingView?.widget) return;

        const container = document.getElementById(widgetContainerId.current);
        if (!container) return;

        container.innerHTML = "";

        new window.TradingView.widget({
          width: "100%",
          height: 640,
          symbol: tvSymbol,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          studies: ["Volume@tv-basicstudies"],
          withdateranges: true,
          hide_side_toolbar: false,
          details: false,
          calendar: false,
          hotlist: false,
          show_popup_button: false,
          hide_top_toolbar: false,
          hide_legend: false,
          container_id: widgetContainerId.current,
        });
      })
      .catch((error) => {
        console.error("TradingView widget load error:", error?.message || error);
      });

    return () => {
      isDisposed = true;
      const container = document.getElementById(widgetContainerId.current);
      if (container) container.innerHTML = "";
    };
  }, [tvSymbol]);

  return (
    <div className="tradingview-wrapper">
      <div className="tradingview-widget-shell">
        <div id={widgetContainerId.current} className="tradingview-widget-container" />
      </div>
    </div>
  );
}
