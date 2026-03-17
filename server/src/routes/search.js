import express from "express";
import axios from "axios";

const router = express.Router();

// Popular ETFs and commodities
const COMMODITIES = [
  { symbol: "USO", name: "U.S. Oil Fund", type: "commodity" },
  { symbol: "GLD", name: "SPDR Gold Shares", type: "commodity" },
  { symbol: "SLV", name: "iShares Silver Trust", type: "commodity" },
  { symbol: "DBC", name: "Commodities ETF", type: "commodity" },
  { symbol: "VIX", name: "Volatility Index", type: "index" },
];

const TOP_ETFS = [
  { symbol: "SPY", name: "S&P 500 ETF", type: "etf" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", type: "etf" },
  { symbol: "IWM", name: "Russell 2000 ETF", type: "etf" },
  { symbol: "EFA", name: "Emerging Markets ETF", type: "etf" },
  { symbol: "AGG", name: "Bond ETF", type: "etf" },
  { symbol: "GLD", name: "Gold ETF", type: "etf" },
];

const ALLOWED_QUOTE_TYPES = new Set(["EQUITY", "ETF", "MUTUALFUND", "INDEX"]);

async function fetchQuotes(symbols = []) {
  if (!Array.isArray(symbols) || symbols.length === 0) return new Map();

  const endpoint = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
  const response = await axios.get(endpoint, {
    timeout: 12000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  const quoteMap = new Map();
  const results = response.data?.quoteResponse?.result || [];
  for (const quote of results) {
    if (quote?.symbol) {
      quoteMap.set(quote.symbol, {
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || quote.symbol,
        currentPrice: quote.regularMarketPrice ?? null,
        changePercent: quote.regularMarketChangePercent ?? null,
      });
    }
  }

  return quoteMap;
}

// Get Commodities & ETFs with live price snapshot
router.get("/commodities-etfs", async (req, res) => {
  try {
    const symbols = [...COMMODITIES.map((x) => x.symbol), ...TOP_ETFS.map((x) => x.symbol)];
    const quotes = await fetchQuotes(symbols);

    const commodities = COMMODITIES.map((item) => ({
      ...item,
      currentPrice: quotes.get(item.symbol)?.currentPrice ?? null,
      changePercent: quotes.get(item.symbol)?.changePercent ?? null,
    }));

    const etfs = TOP_ETFS.map((item) => ({
      ...item,
      currentPrice: quotes.get(item.symbol)?.currentPrice ?? null,
      changePercent: quotes.get(item.symbol)?.changePercent ?? null,
    }));

    res.json({
      commodities,
      etfs,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch commodities/ETFs", error: error.message });
  }
});

// Search symbols dynamically from Yahoo Finance API
router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query || query.length === 0) {
      return res.json({ results: [] });
    }

    const endpoint = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
    const response = await axios.get(endpoint, {
      timeout: 12000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    const quotes = response.data?.quotes || [];
    const results = quotes
      .filter((item) => item?.symbol && item?.shortname && ALLOWED_QUOTE_TYPES.has(item.quoteType))
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname,
        exchange: item.exchange || item.exchDisp || "",
        type: item.quoteType,
      }))
      .slice(0, 12);

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: "Failed to search stocks", error: error.message });
  }
});

export default router;
