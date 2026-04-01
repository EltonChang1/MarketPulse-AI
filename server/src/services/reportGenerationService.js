import OpenAI from "openai";
import { analyzeCompany } from "./stockAnalysisService.js";
import { getUserById } from "./userStore.js";
import { createResearchReport, updateResearchReport } from "./researchReportStore.js";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function modelName() {
  return process.env.AGENT_OPENAI_MODEL || "gpt-4o-mini";
}

function compactForBrief(full) {
  if (!full) return null;
  const { candlestickData, news, comprehensiveAnalysis, technicalForecast, sentiment, symbol, companyName, currentPrice, dayChangePct } =
    full;
  return {
    symbol,
    companyName,
    currentPrice,
    dayChangePct,
    sentiment,
    technicalForecast,
    comprehensiveAnalysis,
    newsHeadlines: (news || []).slice(0, 6).map((n) => n.title),
    candleBars: Array.isArray(candlestickData) ? candlestickData.length : 0,
  };
}

/**
 * Background job: summarize user's server-side watchlist (up to 8 symbols).
 */
export async function generateWatchlistBriefForUser(userId) {
  const user = await getUserById(userId);
  const symbols = (user?.watchlist || []).slice(0, 8).map((s) => String(s).toUpperCase());
  if (!symbols.length) {
    const pending = await createResearchReport({
      userId,
      kind: "watchlist_weekly",
      title: "Watchlist briefing",
      body: "",
      status: "failed",
      errorMessage: "No symbols in watchlist",
      meta: {},
    });
    return pending;
  }

  const pending = await createResearchReport({
    userId,
    kind: "watchlist_weekly",
    title: `Watchlist briefing — ${symbols.join(", ")}`,
    body: "",
    status: "pending",
    meta: { symbols },
  });

  try {
    const settled = await Promise.allSettled(symbols.map((sym) => analyzeCompany(sym, sym, {})));
    const analyses = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => compactForBrief(r.value));
    const failures = settled
      .map((r, i) => ({ r, sym: symbols[i] }))
      .filter(({ r }) => r.status === "rejected")
      .map(({ r, sym }) => ({ symbol: sym, error: r.reason?.message || "error" }));

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: modelName(),
      messages: [
        {
          role: "system",
          content:
            "You are a research analyst. Write a concise weekly-style briefing in Markdown: executive summary, per-symbol bullets (max 3 bullets each), risks, and a one-line disclaimer that this is not financial advice. Use only the JSON data provided.",
        },
        {
          role: "user",
          content: JSON.stringify({ analyses, failures, generatedAt: new Date().toISOString() }).slice(0, 120_000),
        },
      ],
    });

    const body = completion.choices[0]?.message?.content || "";
    await updateResearchReport(userId, pending._id, {
      body,
      status: "ready",
      meta: { symbols, failures, model: modelName() },
    });
    return { ...pending, body, status: "ready" };
  } catch (err) {
    await updateResearchReport(userId, pending._id, {
      status: "failed",
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
}

/**
 * Portfolio snapshot is client-held; user sends a JSON summary with generate request.
 */
export async function generatePortfolioSnapshotBrief(userId, portfolioSnapshot) {
  const pending = await createResearchReport({
    userId,
    kind: "portfolio_snapshot",
    title: "Portfolio snapshot briefing",
    body: "",
    status: "pending",
    meta: { snapshotKeys: portfolioSnapshot && typeof portfolioSnapshot === "object" ? Object.keys(portfolioSnapshot) : [] },
  });

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: modelName(),
      messages: [
        {
          role: "system",
          content:
            "You are a portfolio analyst. Given a JSON snapshot of holdings/transactions from the client, write a short Markdown note: allocation observations, concentration risk, and suggested follow-ups. Not financial advice.",
        },
        {
          role: "user",
          content: JSON.stringify(portfolioSnapshot).slice(0, 80_000),
        },
      ],
    });
    const body = completion.choices[0]?.message?.content || "";
    await updateResearchReport(userId, pending._id, {
      body,
      status: "ready",
      meta: { model: modelName() },
    });
    return { ...pending, body, status: "ready" };
  } catch (err) {
    await updateResearchReport(userId, pending._id, {
      status: "failed",
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
}
