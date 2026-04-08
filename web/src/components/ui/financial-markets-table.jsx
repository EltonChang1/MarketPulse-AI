"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

function getPerformanceColor(value, isDark, mounted) {
  if (!mounted) {
    const isPositive = value >= 0;
    return {
      bgColor: isPositive ? "bg-positive/10" : "bg-negative/10",
      borderColor: isPositive ? "border-positive/30" : "border-negative/30",
      textColor: isPositive ? "text-positive" : "text-negative",
    };
  }

  const isPositive = value >= 0;
  return {
    bgColor: isPositive ? (isDark ? "bg-positive/10" : "bg-green-50") : isDark ? "bg-negative/10" : "bg-red-50",
    borderColor: isPositive
      ? isDark
        ? "border-positive/30"
        : "border-green-200"
      : isDark
        ? "border-negative/30"
        : "border-red-200",
    textColor: isPositive ? (isDark ? "text-green-400" : "text-green-700") : isDark ? "text-red-400" : "text-red-700",
  };
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function formatLargeNumber(amount, unit) {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}${unit}`;
  return `${Number(amount || 0).toFixed(1)}${unit}`;
}

function formatPercentage(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Number(value || 0).toFixed(2)}%`;
}

function CountryPill({ code }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden border border-border/30 flex items-center justify-center bg-muted text-[10px] font-semibold">
      {code || "US"}
    </div>
  );
}

function Sparkline({ data, shouldReduceMotion }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 60;
      const y = 20 - ((value - min) / range) * 15;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-16 h-6">
      <motion.svg
        width="60"
        height="20"
        viewBox="0 0 60 20"
        className="overflow-visible"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 24,
          duration: shouldReduceMotion ? 0.2 : 0.5,
        }}
      >
        <motion.polyline
          points={points}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.3 : 0.8, ease: "easeOut", delay: 0.1 }}
        />
      </motion.svg>
    </div>
  );
}

export function FinancialTable({ title = "Index", indices = [], onIndexSelect, className = "" }) {
  const [selectedIndex, setSelectedIndex] = useState(indices[0]?.id || null);
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.99, filter: "blur(2px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 380, damping: 24, mass: 0.7 },
    },
  };

  const handleIndexSelect = (indexId) => {
    setSelectedIndex(indexId);
    onIndexSelect?.(indexId);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div
              className="px-8 py-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wide bg-muted/20 border-b border-border/20 text-left"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "250px 100px minmax(60px, 1fr) minmax(60px, 1fr) minmax(60px, 1fr) minmax(60px, 1fr) minmax(80px, 1fr) minmax(60px, 1fr) minmax(100px, 1fr)",
                columnGap: "6px",
              }}
            >
              <div>{title}</div>
              <div>YTD Return</div>
              <div>P/LTM EPS</div>
              <div>Div yield</div>
              <div>Mkt cap</div>
              <div>Volume</div>
              <div>2-day chart</div>
              <div>Price</div>
              <div className="pr-4">Daily performance</div>
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {indices.map((index, idx) => {
                const ytdColor = getPerformanceColor(index.ytdReturn, isDark, mounted);
                const dayColor = getPerformanceColor(index.dailyChangePercent, isDark, mounted);
                return (
                  <motion.div key={index.id} variants={rowVariants}>
                    <div
                      className={`px-8 py-3 cursor-pointer group relative transition-all duration-200 ${
                        selectedIndex === index.id ? "bg-muted/50 border-b border-border/30" : "hover:bg-muted/30"
                      } ${idx < indices.length - 1 && selectedIndex !== index.id ? "border-b border-border/20" : ""}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "250px 100px minmax(60px, 1fr) minmax(60px, 1fr) minmax(60px, 1fr) minmax(60px, 1fr) minmax(80px, 1fr) minmax(60px, 1fr) minmax(100px, 1fr)",
                        columnGap: "6px",
                      }}
                      onClick={() => handleIndexSelect(index.id)}
                    >
                      <div className="flex items-center gap-4">
                        <CountryPill code={index.countryCode} />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground/90 truncate">{index.name}</div>
                          <div className="text-xs text-muted-foreground/70">{index.country}</div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${ytdColor.bgColor} ${ytdColor.borderColor} ${ytdColor.textColor}`}>
                          {formatPercentage(index.ytdReturn)}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <span className="font-semibold text-foreground/90">{index.pltmEps ? index.pltmEps.toFixed(2) : "N/A"}</span>
                      </div>

                      <div className="flex items-center">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{formatPercentage(index.divYield)}</span>
                      </div>

                      <div className="flex items-center">
                        <span className="font-semibold text-foreground/90">{formatLargeNumber(index.marketCap, "B")}</span>
                      </div>

                      <div className="flex items-center">
                        <span className="font-semibold text-foreground/90">
                          {index.volume >= 1 ? formatLargeNumber(index.volume, "M") : `${(index.volume * 1000).toFixed(1)}k`}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <div className="px-6">
                          <Sparkline data={index.chartData} shouldReduceMotion={shouldReduceMotion} />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <span className="font-semibold text-foreground/90">{formatCurrency(index.price)}</span>
                      </div>

                      <div className="flex items-center gap-2 pr-4">
                        <span className={`font-semibold ${index.dailyChange >= 0 ? "text-positive" : "text-negative"}`}>
                          {index.dailyChange >= 0 ? "+" : ""}
                          {Number(index.dailyChange || 0).toFixed(2)}
                        </span>
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${dayColor.bgColor} ${dayColor.borderColor} ${dayColor.textColor}`}>
                          {formatPercentage(index.dailyChangePercent)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
