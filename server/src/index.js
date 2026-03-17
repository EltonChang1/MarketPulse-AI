import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { estimateNewsImpact, generateComprehensiveAnalysis, generateDetailedNewsSummary } from "./services/analysisService.js";
import { fetchQuoteAndHistory } from "./services/marketService.js";
import { fetchLatestNews } from "./services/newsService.js";
import { predictMultipleTimeframes } from "./services/technicalService.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import watchlistRoutes from "./routes/watchlist.js";
import searchRoutes from "./routes/search.js";

dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 4000;

const TOP_COMPANIES = [
  { symbol: "AAPL", companyName: "Apple" },
  { symbol: "MSFT", companyName: "Microsoft" },
  { symbol: "NVDA", companyName: "NVIDIA" },
  { symbol: "AMZN", companyName: "Amazon" },
  { symbol: "GOOGL", companyName: "Alphabet" },
  { symbol: "META", companyName: "Meta Platforms" },
  { symbol: "BRK-B", companyName: "Berkshire Hathaway" },
  { symbol: "TSLA", companyName: "Tesla" },
  { symbol: "AVGO", companyName: "Broadcom" },
  { symbol: "JPM", companyName: "JPMorgan Chase" },
];

const MARKET_TZ = "America/New_York";
const MARKET_OPEN_MINUTE = 9 * 60 + 30; // 9:30 ET
const MARKET_CLOSE_MINUTE = 16 * 60; // 16:00 ET
const OPEN_CACHE_TTL_MS = 2 * 60 * 1000;

const aggregateCache = new Map();
const symbolCache = new Map();
const inFlight = new Map();

const weekdayToIndex = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function getEasternTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return {
    weekdayIndex: weekdayToIndex[weekday] ?? 0,
    hour,
    minute,
  };
}

function getMarketState(date = new Date()) {
  const { weekdayIndex, hour, minute } = getEasternTimeParts(date);
  const minuteOfDay = hour * 60 + minute;
  const isWeekday = weekdayIndex >= 0 && weekdayIndex <= 4;
  const isOpen = isWeekday && minuteOfDay >= MARKET_OPEN_MINUTE && minuteOfDay < MARKET_CLOSE_MINUTE;

  return {
    isOpen,
    weekdayIndex,
    minuteOfDay,
  };
}

function getMsUntilNextMarketOpen(date = new Date()) {
  const { weekdayIndex, minuteOfDay } = getMarketState(date);
  const currentMinuteOfWeek = weekdayIndex * 1440 + minuteOfDay;
  const openMinutesOfWeek = [0, 1, 2, 3, 4].map((day) => day * 1440 + MARKET_OPEN_MINUTE);

  const allDiffs = openMinutesOfWeek.map((openMinute) => {
    const diff = (openMinute - currentMinuteOfWeek + 7 * 1440) % (7 * 1440);
    return diff === 0 ? 7 * 1440 : diff;
  });

  const minDiffMinutes = Math.min(...allDiffs);
  return minDiffMinutes * 60 * 1000;
}

function getCacheTtlMs(date = new Date()) {
  const marketState = getMarketState(date);
  if (marketState.isOpen) return OPEN_CACHE_TTL_MS;

  return getMsUntilNextMarketOpen(date) + 60 * 1000;
}

function getCacheKey(prefix, params) {
  return `${prefix}:${JSON.stringify(params)}`;
}

async function withCache({
  key,
  cache,
  compute,
  includeStaleOnError = true,
}) {
  const now = Date.now();
  const existing = cache.get(key);
  const marketState = getMarketState();

  if (existing && existing.expiresAt > now) {
    return { payload: existing.payload, cacheStatus: "hit", marketState };
  }

  if (inFlight.has(key)) {
    const payload = await inFlight.get(key);
    return { payload, cacheStatus: "coalesced", marketState };
  }

  const requestPromise = (async () => {
    const payload = await compute();
    const ttlMs = getCacheTtlMs();
    cache.set(key, {
      payload,
      expiresAt: Date.now() + ttlMs,
    });
    return payload;
  })();

  inFlight.set(key, requestPromise);

  try {
    const payload = await requestPromise;
    return { payload, cacheStatus: "miss", marketState };
  } catch (error) {
    if (includeStaleOnError && existing?.payload) {
      return {
        payload: {
          ...existing.payload,
          stale: true,
          staleReason: error?.message || "Unknown upstream error",
        },
        cacheStatus: "stale-fallback",
        marketState,
      };
    }
    throw error;
  } finally {
    inFlight.delete(key);
  }
}

function parseIntInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getPatternOptions(query = {}) {
  return {
    maxMarkers: parseIntInRange(query.markers, 10, 3, 30),
    maxPerIndicator: parseIntInRange(query.perIndicator, 3, 1, 10),
  };
}

function isValidMarketSymbol(symbol = "") {
  return /^(\^[A-Z]{1,7}|[A-Z]{1,7}(?:-[A-Z])?)$/.test(String(symbol).toUpperCase());
}

app.use(cors());
app.use(express.json());

// Auth & Watchlist Routes
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api", searchRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "marketpulse-ai", timestamp: new Date().toISOString() });
});

app.get("/api/companies", (_req, res) => {
  res.json(TOP_COMPANIES);
});
app.get("/api/commodities-etfs", async (req, res) => {
  try {
    const commoditySymbols = [
      { symbol: "USO", name: "Crude Oil", type: "Commodity" },
      { symbol: "GLD", name: "Gold", type: "Commodity" },
      { symbol: "SLV", name: "Silver", type: "Commodity" },
      { symbol: "DXY", name: "US Dollar Index", type: "Currency" },
    ];

    const indicatorSymbols = [
      { symbol: "^GSPC", name: "S&P 500", type: "Index" },
      { symbol: "^DJI", name: "Dow Jones", type: "Index" },
      { symbol: "^IXIC", name: "NASDAQ Composite", type: "Index" },
      { symbol: "^RUT", name: "Russell 2000", type: "Index" },
      { symbol: "^VIX", name: "CBOE Volatility Index", type: "Index" },
    ];

    const cacheKey = getCacheKey("commodities-etfs", {});
    const { payload, cacheStatus, marketState } = await withCache({
      key: cacheKey,
      cache: aggregateCache,
      compute: async () => {
        const fetchData = async (items) => {
          const settled = await Promise.allSettled(
            items.map(async (item) => {
              const market = await fetchQuoteAndHistory(item.symbol);
              const candles = (market.candlestickData || [])
                .slice(-24)
                .map((candle) => ({
                  time: candle.time,
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                }));

              return {
                symbol: item.symbol,
                displaySymbol: item.symbol.replace(/^\^/, ""),
                name: item.name,
                type: item.type,
                currentPrice: Number(market.currentPrice.toFixed(2)),
                changePercent: Number(
                  (((market.currentPrice - market.previousClose) / market.previousClose) * 100).toFixed(2)
                ),
                previousClose: Number(market.previousClose.toFixed(2)),
                candles,
              };
            })
          );

          return settled
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);
        };

        const commodities = await fetchData(commoditySymbols);
        const indicators = await fetchData(indicatorSymbols);

        if (commodities.length === 0 && indicators.length === 0) {
          throw new Error("No market overview data available from upstream providers");
        }

        return {
          commodities,
          indicators,
          generatedAt: new Date().toISOString(),
        };
      },
    });

    return res.json({
      ...payload,
      marketOpen: marketState.isOpen,
      cacheStatus,
    });
  } catch (error) {
    console.error("Error fetching commodities-etfs:", error);
    return res.status(500).json({
      message: "Failed to fetch commodities and ETFs",
      error: error.message,
    });
  }
});

async function analyzeCompany(symbol, companyName, technicalOptions = {}) {
  const market = await fetchQuoteAndHistory(symbol);
  const technicalForecast = predictMultipleTimeframes(market.history, market.currentPrice, technicalOptions);
  const news = await fetchLatestNews(companyName, symbol, 10);
  const sentiment = await estimateNewsImpact({
    symbol,
    companyName,
    newsItems: news,
    technicalForecast,
  });
  const comprehensiveAnalysis = await generateComprehensiveAnalysis({
    symbol,
    companyName,
    newsItems: news,
    technicalForecast,
    currentPrice: market.currentPrice,
  });
  const newsSummary = await generateDetailedNewsSummary({
    symbol,
    companyName,
    newsItems: news,
    technicalForecast,
    currentPrice: market.currentPrice,
  });

  return {
    symbol,
    companyName,
    currentPrice: Number(market.currentPrice.toFixed(2)),
    previousClose: Number(market.previousClose.toFixed(2)),
    dayChangePct: Number(
      (((market.currentPrice - market.previousClose) / market.previousClose) * 100).toFixed(2)
    ),
    marketCap: market.marketCap,
    sentiment,
    technicalForecast,
    comprehensiveAnalysis,
    newsSummary,
    candlestickData: market.candlestickData,
    news,
    updatedAt: new Date().toISOString(),
  };
}

app.get("/api/analyze", async (req, res) => {
  try {
    const technicalOptions = getPatternOptions(req.query);

    // Support custom watchlist via ?symbols=AAPL,TSLA,...
    const symbolsParam = String(req.query.symbols || "").trim();
    const requestedSymbols = symbolsParam
      ? symbolsParam
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => isValidMarketSymbol(s))
          .slice(0, 20)
      : null;

    const companies =
      requestedSymbols && requestedSymbols.length > 0
        ? requestedSymbols.map((sym) => {
            const known = TOP_COMPANIES.find((c) => c.symbol === sym);
            return known || { symbol: sym, companyName: sym };
          })
        : TOP_COMPANIES;

    const cacheKey = getCacheKey("analyze", {
      ...technicalOptions,
      symbols: companies.map((c) => c.symbol).join(","),
    });

    const { payload, cacheStatus, marketState } = await withCache({
      key: cacheKey,
      cache: aggregateCache,
      compute: async () => {
        const settled = await Promise.allSettled(
          companies.map((company) => analyzeCompany(company.symbol, company.companyName, technicalOptions))
        );

        const data = settled
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);

        const failures = settled
          .map((result, index) => ({ result, company: companies[index] }))
          .filter(({ result }) => result.status === "rejected")
          .map(({ result, company }) => ({
            symbol: company.symbol,
            companyName: company.companyName,
            error: result.reason?.message || "Unknown error",
          }));

        if (data.length === 0) {
          throw new Error("Upstream market data provider unavailable");
        }

        return {
          generatedAt: new Date().toISOString(),
          count: data.length,
          data,
          partialFailure: failures.length > 0,
          failures,
        };
      },
    });

    return res.json({
      ...payload,
      marketOpen: marketState.isOpen,
      cacheStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to analyze stocks", error: error.message });
  }
});

app.get("/api/analyze/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    if (!isValidMarketSymbol(symbol)) {
      return res.status(400).json({ message: `Invalid symbol format: ${symbol}` });
    }
    const technicalOptions = getPatternOptions(req.query);
    const company = TOP_COMPANIES.find((c) => c.symbol === symbol) || { symbol, companyName: symbol };

    const cacheKey = getCacheKey(`analyze-${symbol}`, technicalOptions);

    const { payload, cacheStatus, marketState } = await withCache({
      key: cacheKey,
      cache: symbolCache,
      compute: async () => analyzeCompany(company.symbol, company.companyName, technicalOptions),
    });

    return res.json({
      ...payload,
      marketOpen: marketState.isOpen,
      cacheStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to analyze symbol", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`MarketPulse AI server running on http://localhost:${port}`);
});
