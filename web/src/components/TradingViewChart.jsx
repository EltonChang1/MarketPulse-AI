import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { tokenColor } from "@/lib/themeTokens";

function toTradingViewSymbol(symbol = "") {
  const normalized = String(symbol || "").toUpperCase().replace(/-/g, ".");
  if (!normalized) return "NASDAQ:AAPL";
  if (normalized.includes(":")) return normalized;

  const specialSymbolMap = {
    "^IXIC": "NASDAQ:IXIC",
    "^GSPC": "SP:SPX",
    "^DJI": "DJ:DJI",
    "^RUT": "TVC:RUT",
    "^VIX": "TVC:VIX",
    DXY: "TVC:DXY",
    "DX.Y.NYB": "TVC:DXY",
    USO: "AMEX:USO",
    GLD: "AMEX:GLD",
    SLV: "AMEX:SLV",
    UUP: "AMEX:UUP",
    SPY: "AMEX:SPY",
    IWM: "AMEX:IWM",
    VTI: "AMEX:VTI",
    AGG: "AMEX:AGG",
    QQQ: "NASDAQ:QQQ",
    "BRK.B": "NYSE:BRK.B",
    JPM: "NYSE:JPM",
  };

  if (specialSymbolMap[normalized]) {
    return specialSymbolMap[normalized];
  }

  if (normalized.startsWith("^")) {
    return `TVC:${normalized.slice(1)}`;
  }

  const nyseSymbols = new Set(["BRK.B", "JPM"]);
  if (nyseSymbols.has(normalized)) {
    return `NYSE:${normalized}`;
  }

  return normalized;
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
  const { theme } = useTheme();
  const widgetContainerId = useRef(`tradingview_${Math.random().toString(36).slice(2)}`);
  const [showPatternTrend, setShowPatternTrend] = useState(true);
  const tvSymbol = useMemo(() => toTradingViewSymbol(symbol), [symbol]);
  const trendColor = useMemo(() => tokenColor("foreground"), [theme]);

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
          theme: theme === "dark" ? "dark" : "light",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          studies: showPatternTrend ? ["Linear Regression@tv-basicstudies"] : [],
          studies_overrides: showPatternTrend
            ? {
                "linreg.plot.color": trendColor,
                "linreg.plot.linewidth": 2,
              }
            : {},
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
  }, [tvSymbol, showPatternTrend, theme, trendColor]);

  return (
    <div className="tradingview-wrapper">
      <div className="tradingview-header tv-trend-toggle-row">
        <label className="indicator-toggle-item tv-trend-toggle">
          <input type="checkbox" checked={showPatternTrend} onChange={() => setShowPatternTrend((v) => !v)} />
          <span>Pattern trend line</span>
        </label>
      </div>
      <div className="tradingview-widget-shell">
        <div id={widgetContainerId.current} className="tradingview-widget-container" />
      </div>
    </div>
  );
}
