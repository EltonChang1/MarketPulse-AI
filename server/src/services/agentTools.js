import { fetchQuoteAndHistory } from "./marketService.js";
import { fetchLatestNews } from "./newsService.js";
import { predictMultipleTimeframes } from "./technicalService.js";
import { analyzeCompany, getPatternOptions, isValidMarketSymbol } from "./stockAnalysisService.js";

function compactAnalysisForAgent(full) {
  if (!full || typeof full !== "object") return full;
  const { candlestickData, news, ...rest } = full;
  return {
    ...rest,
    newsHeadlines: (news || []).slice(0, 10).map((n) => ({ title: n.title, link: n.link })),
    candlestickBarCount: Array.isArray(candlestickData) ? candlestickData.length : 0,
  };
}

export const AGENT_OPENAI_TOOLS = [
  {
    type: "function",
    function: {
      name: "analyze_symbol",
      description:
        "Full MarketPulse analysis for one ticker: price, multi-timeframe technical outlook, news, sentiment, and narrative summaries. Prefer this when the user asks for a complete view of a stock.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "US equity ticker, e.g. AAPL" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quick_quote",
      description: "Lightweight quote: current price, previous close, day change, and short history length. Use for simple price checks.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "technical_forecast_only",
      description: "Multi-timeframe technical predictions only (no LLM narrative blocks).",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "latest_news_headlines",
      description: "Recent news headlines for a company/ticker.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          companyName: { type: "string", description: "Optional display name for search" },
          maxItems: { type: "integer", description: "1–15, default 8" },
        },
        required: ["symbol"],
      },
    },
  },
];

export async function executeAgentTool(name, args, { patternQuery = {} } = {}) {
  const technicalOptions = getPatternOptions(patternQuery);

  switch (name) {
    case "analyze_symbol": {
      const symbol = String(args.symbol || "").trim().toUpperCase();
      if (!isValidMarketSymbol(symbol)) {
        return { error: `Invalid symbol: ${args.symbol}` };
      }
      const full = await analyzeCompany(symbol, symbol, technicalOptions);
      return compactAnalysisForAgent(full);
    }
    case "quick_quote": {
      const symbol = String(args.symbol || "").trim().toUpperCase();
      if (!isValidMarketSymbol(symbol)) {
        return { error: `Invalid symbol: ${args.symbol}` };
      }
      const market = await fetchQuoteAndHistory(symbol);
      return {
        symbol,
        currentPrice: market.currentPrice,
        previousClose: market.previousClose,
        dayChangePct: Number(
          (((market.currentPrice - market.previousClose) / market.previousClose) * 100).toFixed(2)
        ),
        historyBars: market.history?.length ?? 0,
      };
    }
    case "technical_forecast_only": {
      const symbol = String(args.symbol || "").trim().toUpperCase();
      if (!isValidMarketSymbol(symbol)) {
        return { error: `Invalid symbol: ${args.symbol}` };
      }
      const market = await fetchQuoteAndHistory(symbol);
      const technicalForecast = predictMultipleTimeframes(market.history, market.currentPrice, technicalOptions);
      return { symbol, currentPrice: market.currentPrice, technicalForecast };
    }
    case "latest_news_headlines": {
      const symbol = String(args.symbol || "").trim().toUpperCase();
      if (!isValidMarketSymbol(symbol)) {
        return { error: `Invalid symbol: ${args.symbol}` };
      }
      const companyName = String(args.companyName || symbol).trim() || symbol;
      const maxItems = Math.min(15, Math.max(1, Number(args.maxItems) || 8));
      const news = await fetchLatestNews(companyName, symbol, maxItems);
      return {
        symbol,
        headlines: news.map((n) => ({ title: n.title, link: n.link, pubDate: n.pubDate })),
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
