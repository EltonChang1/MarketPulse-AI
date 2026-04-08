"use client";

import { useEffect, useMemo, useState } from "react";
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

function formatCompact(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(2)}T`;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(2);
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

  if (shouldReduceMotion) {
    return (
      <div className="w-16 h-6">
        <svg width="60" height="20" viewBox="0 0 60 20" className="overflow-visible" aria-hidden>
          <polyline
            points={points}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

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
          duration: 0.5,
        }}
      >
        <motion.polyline
          points={points}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
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

  const containerVariants = useMemo(
    () => ({
      visible: {
        transition: shouldReduceMotion
          ? {}
          : { staggerChildren: 0.04, delayChildren: 0.08 },
      },
    }),
    [shouldReduceMotion]
  );

  const rowVariants = useMemo(
    () =>
      shouldReduceMotion
        ? {
            hidden: { opacity: 1, y: 0, scale: 1, filter: "none" },
            visible: { opacity: 1, y: 0, scale: 1, filter: "none", transition: { duration: 0 } },
          }
        : {
            hidden: { opacity: 0, y: 16, scale: 0.99, filter: "blur(2px)" },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              transition: { type: "spring", stiffness: 380, damping: 24, mass: 0.7 },
            },
          },
    [shouldReduceMotion]
  );

  const handleIndexSelect = (indexId) => {
    setSelectedIndex(indexId);
    onIndexSelect?.(indexId);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-border/50 bg-card shadow-card overflow-hidden dark:border-[#333] dark:bg-[rgba(31,31,31,0.65)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] dark:backdrop-blur-sm">
        <div
          className="overflow-x-auto"
          style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
        >
          <div className="min-w-[760px] md:min-w-[880px]">
            <div
              className="px-6 py-2 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wide bg-muted/20 border-b border-border/20 text-left"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 2.1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(90px, 1fr)",
                columnGap: "6px",
              }}
            >
              <div className="sticky left-0 z-20 bg-muted/90 backdrop-blur-sm">{title}</div>
              <div className="text-right">Last</div>
              <div className="text-right">Chg</div>
              <div className="text-right">Chg %</div>
              <div className="text-right">Vol</div>
              <div className="text-right">Mkt Cap</div>
              <div className="pr-4 text-right">Spark</div>
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {indices.map((index, idx) => {
                const dayColor = getPerformanceColor(index.dailyChangePercent, isDark, mounted);
                return (
                  <motion.div key={index.id} variants={rowVariants}>
                    <div
                      className={`px-6 py-2.5 cursor-pointer group relative transition-all duration-200 text-[13px] ${
                        selectedIndex === index.id ? "bg-muted/50 border-b border-border/30" : "hover:bg-muted/30"
                      } ${idx < indices.length - 1 && selectedIndex !== index.id ? "border-b border-border/20" : ""}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(200px, 2.1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(90px, 1fr)",
                        columnGap: "6px",
                      }}
                      onClick={() => handleIndexSelect(index.id)}
                    >
                      <div
                        className={`sticky left-0 z-10 flex items-center gap-3 pr-2 ${
                          selectedIndex === index.id ? "bg-muted/50" : "bg-card group-hover:bg-muted/30"
                        }`}
                      >
                        <CountryPill code={index.countryCode} />
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground/90 truncate">{index.symbol || index.name}</div>
                          <div className="text-[11px] text-muted-foreground/70 truncate">
                            {index.name?.split("·")?.[1]?.trim() || index.country}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="font-semibold text-foreground/90 tabular-nums">{formatCurrency(index.price)}</span>
                      </div>

                      <div className="flex items-center justify-end">
                        <span className={`font-semibold tabular-nums ${index.dailyChange >= 0 ? "text-positive" : "text-negative"}`}>
                          {index.dailyChange >= 0 ? "+" : ""}
                          {Number(index.dailyChange || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end">
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium border tabular-nums ${dayColor.bgColor} ${dayColor.borderColor} ${dayColor.textColor}`}>
                          {formatPercentage(index.dailyChangePercent)}
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="font-semibold text-foreground/90 tabular-nums">{formatCompact(Number(index.volume || 0) * 1_000_000)}</span>
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="font-semibold text-foreground/90 tabular-nums">{formatCompact(Number(index.marketCap || 0) * 1_000_000_000)}</span>
                      </div>

                      <div className="flex items-center justify-end pr-4">
                        <Sparkline data={index.chartData} shouldReduceMotion={shouldReduceMotion} />
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
