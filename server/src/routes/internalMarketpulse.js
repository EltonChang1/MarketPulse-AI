import express from "express";
import { internalApiAuth } from "../middleware/internalApiAuth.js";
import { fetchQuoteAndHistory } from "../services/marketService.js";
import { fetchLatestNews } from "../services/newsService.js";
import { analyzeCompany, getPatternOptions, isValidMarketSymbol } from "../services/stockAnalysisService.js";

const router = express.Router();
router.use(internalApiAuth);

router.get("/health", (_req, res) => {
  res.json({ ok: true, scope: "internal-mp", timestamp: new Date().toISOString() });
});

router.get("/quote/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    if (!isValidMarketSymbol(symbol)) {
      return res.status(400).json({ message: "Invalid symbol" });
    }
    const market = await fetchQuoteAndHistory(symbol);
    res.json({
      symbol,
      currentPrice: market.currentPrice,
      previousClose: market.previousClose,
      dayChangePct: Number(
        (((market.currentPrice - market.previousClose) / market.previousClose) * 100).toFixed(2)
      ),
      marketCap: market.marketCap,
      historyLength: market.history?.length ?? 0,
      candlestickBars: market.candlestickData?.length ?? 0,
    });
  } catch (error) {
    res.status(502).json({ message: error?.message || "Upstream quote failed" });
  }
});

/**
 * Headlines via the same stack as agent tool `latest_news_headlines` (Yahoo/RSS in Node only).
 * Query: companyName (optional), maxItems | limit (1–15, default 8)
 */
router.get("/news/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    if (!isValidMarketSymbol(symbol)) {
      return res.status(400).json({ message: "Invalid symbol" });
    }
    const companyName = String(req.query.companyName || symbol).trim() || symbol;
    const rawLimit = req.query.maxItems ?? req.query.limit;
    const maxItems = Math.min(15, Math.max(1, Number(rawLimit) || 8));
    const news = await fetchLatestNews(companyName, symbol, maxItems);
    res.json({
      symbol,
      companyName,
      generatedAt: new Date().toISOString(),
      count: news.length,
      headlines: news.map((n) => ({ title: n.title, link: n.link, pubDate: n.pubDate })),
    });
  } catch (error) {
    res.status(502).json({ message: error?.message || "News fetch failed" });
  }
});

/**
 * Body: { symbols: string[], markers?: number, perIndicator?: number }
 * Max 8 symbols per call to bound latency and cost.
 */
router.post("/analyze", async (req, res) => {
  try {
    const raw = req.body?.symbols;
    const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
    const symbols = list
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => isValidMarketSymbol(s))
      .slice(0, 8);

    if (!symbols.length) {
      return res.status(400).json({ message: "Provide symbols: string[] (1–8 tickers)" });
    }

    const technicalOptions = getPatternOptions(req.body || {});
    const settled = await Promise.allSettled(
      symbols.map((sym) => analyzeCompany(sym, sym, technicalOptions))
    );

    const data = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => {
        const v = r.value;
        const { candlestickData, news, ...rest } = v;
        return {
          ...rest,
          newsHeadlineCount: news?.length ?? 0,
          candlestickBarCount: candlestickData?.length ?? 0,
        };
      });

    const failures = settled
      .map((r, i) => ({ r, sym: symbols[i] }))
      .filter(({ r }) => r.status === "rejected")
      .map(({ r, sym }) => ({ symbol: sym, error: r.reason?.message || "error" }));

    res.json({
      generatedAt: new Date().toISOString(),
      count: data.length,
      data,
      partialFailure: failures.length > 0,
      failures,
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Analyze failed" });
  }
});

export default router;
