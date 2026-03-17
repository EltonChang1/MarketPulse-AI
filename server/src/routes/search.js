import express from "express";
import axios from "axios";

const router = express.Router();

const ALLOWED_QUOTE_TYPES = new Set(["EQUITY", "ETF", "MUTUALFUND", "INDEX"]);

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
