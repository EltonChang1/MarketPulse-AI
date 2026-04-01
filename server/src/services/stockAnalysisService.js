import { fetchQuoteAndHistory } from "./marketService.js";
import { fetchLatestNews } from "./newsService.js";
import { predictMultipleTimeframes } from "./technicalService.js";
import {
  estimateNewsImpact,
  generateComprehensiveAnalysis,
  generateDetailedNewsSummary,
} from "./analysisService.js";

function parseIntInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getPatternOptions(query = {}) {
  return {
    maxMarkers: parseIntInRange(query.markers, 10, 3, 30),
    maxPerIndicator: parseIntInRange(query.perIndicator, 3, 1, 10),
  };
}

export function isValidMarketSymbol(symbol = "") {
  return /^(\^[A-Z]{1,7}|[A-Z]{1,7}(?:-[A-Z])?)$/.test(String(symbol).toUpperCase());
}

export async function analyzeCompany(symbol, companyName, technicalOptions = {}) {
  const market = await fetchQuoteAndHistory(symbol);
  const technicalForecast = predictMultipleTimeframes(market.history, market.currentPrice, technicalOptions);
  let news = [];
  try {
    news = await fetchLatestNews(companyName, symbol, 10);
  } catch (error) {
    console.warn(`News fetch failed for ${symbol}: ${error?.message || error}`);
  }

  let sentiment = {
    impact: "neutral",
    confidence: 0.55,
    summary: "News sentiment unavailable; using technical signals only.",
    source: "fallback",
  };
  try {
    sentiment = await estimateNewsImpact({
      symbol,
      companyName,
      newsItems: news,
      technicalForecast,
    });
  } catch (error) {
    console.warn(`Sentiment estimation failed for ${symbol}: ${error?.message || error}`);
  }

  let comprehensiveAnalysis = {
    financialSummary: `${companyName} (${symbol}) is currently trading at $${market.currentPrice.toFixed(2)}. Technical indicators are available for analysis.`,
    newsSummary: news.length ? `Loaded ${news.length} recent news items.` : "Recent news is currently unavailable.",
    riskFactors: ["Market volatility", "Macro conditions", "Execution risk"],
    opportunities: ["Trend continuation", "Technical reversal setups", "Sector momentum"],
    source: "fallback",
  };
  try {
    comprehensiveAnalysis = await generateComprehensiveAnalysis({
      symbol,
      companyName,
      newsItems: news,
      technicalForecast,
      currentPrice: market.currentPrice,
    });
  } catch (error) {
    console.warn(`Comprehensive analysis failed for ${symbol}: ${error?.message || error}`);
  }

  let newsSummary = {
    factsParagraphs: news.length
      ? news.slice(0, 5).map((item, index) => `${index + 1}. ${item.title || "Recent market update."}`)
      : [`No recent news found for ${companyName} (${symbol}).`],
    factsParagraph: news.length
      ? news.slice(0, 5).map((item, index) => `${index + 1}. ${item.title || "Recent market update."}`).join(" ")
      : `No recent news found for ${companyName} (${symbol}).`,
    impactParagraph: "Short-term price action may depend more on technical signals until reliable fresh news data is available.",
    source: "fallback",
  };
  try {
    newsSummary = await generateDetailedNewsSummary({
      symbol,
      companyName,
      newsItems: news,
      technicalForecast,
      currentPrice: market.currentPrice,
    });
  } catch (error) {
    console.warn(`News summary generation failed for ${symbol}: ${error?.message || error}`);
  }

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
