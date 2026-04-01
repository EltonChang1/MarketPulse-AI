import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { fetchQuoteAndHistory, fetchScreenerQuotes } from "./services/marketService.js";
import { analyzeCompany, getPatternOptions, isValidMarketSymbol } from "./services/stockAnalysisService.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import watchlistRoutes from "./routes/watchlist.js";
import searchRoutes from "./routes/search.js";
import agentRoutes from "./routes/agent.js";
import reportRoutes from "./routes/reports.js";
import internalMarketpulseRoutes from "./routes/internalMarketpulse.js";
import { scheduleReportCron, registerCronHttpTrigger } from "./jobs/reportCron.js";

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

const SIX_LARGEST_MARKET_CAP_COMPANIES = [
  { symbol: "NVDA", name: "NVIDIA", type: "Stock" },
  { symbol: "GOOG", name: "Alphabet (Google)", type: "Stock" },
  { symbol: "AAPL", name: "Apple", type: "Stock" },
  { symbol: "MSFT", name: "Microsoft", type: "Stock" },
  { symbol: "AMZN", name: "Amazon", type: "Stock" },
  { symbol: "TSM", name: "TSMC", type: "Stock" },
];

const MARKET_TZ = "America/New_York";
const MARKET_OPEN_MINUTE = 9 * 60 + 30; // 9:30 ET
const MARKET_CLOSE_MINUTE = 16 * 60; // 16:00 ET
const OPEN_CACHE_TTL_MS = 2 * 60 * 1000;
const ANALYZE_CACHE_TTL_MS = 5 * 60 * 1000;

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
  ttlMs,
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
    const effectiveTtlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : getCacheTtlMs();
    cache.set(key, {
      payload,
      expiresAt: Date.now() + effectiveTtlMs,
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

function toMarketCardFromQuote(item, market) {
  const previousClose = Number(market.previousClose);
  const currentPrice = Number(market.currentPrice);
  const changePercent =
    Number.isFinite(currentPrice) && Number.isFinite(previousClose) && previousClose !== 0
      ? Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2))
      : NaN;

  const candles = (market.candlestickData || []).slice(-24).map((candle) => ({
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));

  return {
    symbol: item.symbol,
    displaySymbol: item.symbol.replace(/^\^/, ""),
    name: item.name || item.symbol,
    type: item.type || "Stock",
    currentPrice: Number.isFinite(currentPrice) ? Number(currentPrice.toFixed(2)) : NaN,
    changePercent,
    previousClose: Number.isFinite(previousClose) ? Number(previousClose.toFixed(2)) : NaN,
    candles,
    volume: null,
  };
}

function buildFallbackMoversFromCards(cards = []) {
  const byChangeDesc = [...cards].sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  const byChangeAsc = [...cards].sort((a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity));

  return {
    mostActive: cards.slice(0, 5),
    gainers: byChangeDesc.slice(0, 5),
    losers: byChangeAsc.slice(0, 5),
    ipoThisMonth: [],
  };
}

async function getStockFallbackOverview() {
  const fallbackCompanies = TOP_COMPANIES.slice(0, 10).map((company) => ({
    symbol: company.symbol,
    name: company.companyName,
    type: "Stock",
  }));

  const cards = [];
  for (const item of fallbackCompanies) {
    try {
      const market = await fetchQuoteAndHistory(item.symbol);
      cards.push(toMarketCardFromQuote(item, market));
    } catch (error) {
      console.warn(`Fallback overview fetch failed for ${item.symbol}: ${error?.message || error}`);
    }
  }

  return {
    indicators: cards.slice(0, 5),
    commodities: [],
    sixLargestCompanies: cards.slice(0, 6),
    topVolumeStocks: cards.slice(0, 6),
    movers: buildFallbackMoversFromCards(cards),
    generatedAt: new Date().toISOString(),
    fallback: true,
  };
}

app.use(cors());
app.use(express.json());

// Auth & Watchlist Routes
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api", searchRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/internal/mp", internalMarketpulseRoutes);
registerCronHttpTrigger(app);
scheduleReportCron();

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
      { symbol: "UNG", name: "Natural Gas", type: "Commodity" },
    ];

    const indicatorSymbols = [
      { symbol: "^DJI", name: "Dow Jones Industrial Average", type: "Index" },
      { symbol: "^IXIC", name: "NASDAQ Composite", type: "Index" },
      { symbol: "^RUT", name: "Russell 2000", type: "Index" },
      { symbol: "^GSPC", name: "S&P 500", type: "Index" },
      { symbol: "^NYA", name: "NYSE Composite", type: "Index" },
    ];

    const cacheKey = getCacheKey("commodities-etfs", {});
    const { payload, cacheStatus, marketState } = await withCache({
      key: cacheKey,
      cache: aggregateCache,
      ttlMs: ANALYZE_CACHE_TTL_MS,
      compute: async () => {
        const loadScreenerSafe = async (scrId, count = 5) => {
          try {
            return await fetchScreenerQuotes(scrId, count);
          } catch (error) {
            console.warn(`Screener ${scrId} failed: ${error?.message || error}`);
            return [];
          }
        };

        const fetchData = async (items) => {
          const results = [];

          for (const item of items) {
            try {
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

              results.push({
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
              });
            } catch (error) {
              console.warn(`Market overview fetch failed for ${item.symbol}: ${error?.message || error}`);
            }
          }

          return results;
        };

        const commodities = await fetchData(commoditySymbols);
        const indicators = await fetchData(indicatorSymbols);

        const mostActiveRaw = await loadScreenerSafe("most_actives", 12);
        const mostActive = mostActiveRaw.filter((item) => isValidMarketSymbol(item?.symbol || ""));
        const sixLargestCompanies = await fetchData(SIX_LARGEST_MARKET_CAP_COMPANIES);

        const gainers = (await loadScreenerSafe("day_gainers", 5)).filter((item) => isValidMarketSymbol(item?.symbol || ""));
        const losers = (await loadScreenerSafe("day_losers", 5)).filter((item) => isValidMarketSymbol(item?.symbol || ""));
        const ipoThisMonth = (await loadScreenerSafe("recent_ipo", 5)).filter((item) => isValidMarketSymbol(item?.symbol || ""));

        const movers = {
          mostActive: mostActive.slice(0, 5),
          gainers: gainers.slice(0, 5),
          losers: losers.slice(0, 5),
          ipoThisMonth: ipoThisMonth.slice(0, 5),
        };

        if (commodities.length === 0 && indicators.length === 0 && sixLargestCompanies.length === 0) {
          throw new Error("No market overview data available from upstream providers");
        }

        return {
          commodities,
          indicators,
          sixLargestCompanies,
          topVolumeStocks: sixLargestCompanies,
          movers,
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
    try {
      const fallback = await getStockFallbackOverview();
      const hasAnyCards =
        fallback.indicators.length > 0 ||
        fallback.commodities.length > 0 ||
        fallback.topVolumeStocks.length > 0;

      if (hasAnyCards) {
        return res.json({
          ...fallback,
          marketOpen: getMarketState().isOpen,
          cacheStatus: "fallback",
          message: "Commodities feed unavailable; serving stock fallback overview",
        });
      }
    } catch (fallbackError) {
      console.error("Fallback market overview failed:", fallbackError);
    }

    return res.status(500).json({
      message: "Failed to fetch commodities and ETFs",
      error: error.message,
    });
  }
});

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
      ttlMs: ANALYZE_CACHE_TTL_MS,
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
