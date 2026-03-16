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

// Popular stocks for search autocomplete
const TOP_STOCKS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "V", name: "Visa" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "BAC", name: "Bank of America" },
  { symbol: "CSCO", name: "Cisco" },
  { symbol: "ABBV", name: "AbbVie" },
];

// Get Commodities & ETFs
router.get("/commodities-etfs", (req, res) => {
  try {
    res.json({
      commodities: COMMODITIES,
      etfs: TOP_ETFS,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch commodities/ETFs", error: error.message });
  }
});

// Search Stocks
router.get("/search", (req, res) => {
  try {
    const query = (req.query.q || "").toUpperCase().trim();

    if (!query || query.length === 0) {
      return res.json({ results: [] });
    }

    const results = TOP_STOCKS.filter(
      (stock) =>
        stock.symbol.includes(query) ||
        stock.name.toUpperCase().includes(query)
    ).slice(0, 10);

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: "Failed to search stocks", error: error.message });
  }
});

export default router;
