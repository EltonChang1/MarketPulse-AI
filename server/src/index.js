import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { estimateNewsImpact, generateComprehensiveAnalysis } from "./services/analysisService.js";
import { fetchQuoteAndHistory } from "./services/marketService.js";
import { fetchLatestNews } from "./services/newsService.js";
import { predictMultipleTimeframes } from "./services/technicalService.js";

dotenv.config();

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

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "marketpulse-ai", timestamp: new Date().toISOString() });
});

app.get("/api/companies", (_req, res) => {
  res.json(TOP_COMPANIES);
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
    candlestickData: market.candlestickData,
    news,
    updatedAt: new Date().toISOString(),
  };
}

app.get("/api/analyze", async (req, res) => {
  try {
    const technicalOptions = getPatternOptions(req.query);
    const settled = await Promise.allSettled(
      TOP_COMPANIES.map((company) => analyzeCompany(company.symbol, company.companyName, technicalOptions))
    );

    const data = settled
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const failures = settled
      .map((result, index) => ({ result, company: TOP_COMPANIES[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, company }) => ({
        symbol: company.symbol,
        companyName: company.companyName,
        error: result.reason?.message || "Unknown error",
      }));

    if (data.length === 0) {
      return res.status(503).json({
        message: "All stock analyses failed",
        error: "Upstream market data provider unavailable",
        failures,
      });
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      count: data.length,
      data,
      partialFailure: failures.length > 0,
      failures,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to analyze stocks", error: error.message });
  }
});

app.get("/api/analyze/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const technicalOptions = getPatternOptions(req.query);
    const company = TOP_COMPANIES.find((c) => c.symbol === symbol);

    if (!company) {
      return res.status(404).json({
        message: `Symbol not in top-10 list. Allowed: ${TOP_COMPANIES.map((c) => c.symbol).join(", ")}`,
      });
    }

    const data = await analyzeCompany(company.symbol, company.companyName, technicalOptions);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Failed to analyze symbol", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`MarketPulse AI server running on http://localhost:${port}`);
});
