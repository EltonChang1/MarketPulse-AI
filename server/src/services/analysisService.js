import { GoogleGenerativeAI } from "@google/generative-ai";

const POSITIVE_WORDS = [
  "beats",
  "surge",
  "growth",
  "upgrade",
  "record",
  "strong",
  "profit",
  "partnership",
  "innovation",
  "buyback",
  "expands",
  "approval",
];

const NEGATIVE_WORDS = [
  "misses",
  "decline",
  "downgrade",
  "lawsuit",
  "probe",
  "layoffs",
  "weak",
  "loss",
  "delay",
  "recall",
  "antitrust",
  "cut",
];

function heuristicImpact(newsItems = []) {
  const text = newsItems.map((n) => (n.title || "").toLowerCase()).join(" ");

  let positive = 0;
  let negative = 0;

  for (const word of POSITIVE_WORDS) {
    if (text.includes(word)) positive += 1;
  }

  for (const word of NEGATIVE_WORDS) {
    if (text.includes(word)) negative += 1;
  }

  if (positive === negative) {
    return {
      impact: "neutral",
      confidence: 0.55,
      summary: "News sentiment is mixed; impact appears balanced.",
      source: "heuristic",
    };
  }

  const impact = positive > negative ? "positive" : "negative";
  const confidence = Math.min(0.9, 0.55 + Math.abs(positive - negative) * 0.08);

  return {
    impact,
    confidence: Number(confidence.toFixed(2)),
    summary:
      impact === "positive"
        ? "Recent headlines are skewed positive and may support short-term price strength."
        : "Recent headlines are skewed negative and may pressure short-term price action.",
    source: "heuristic",
  };
}

function parseJsonMaybe(content = "") {
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fenced?.[1] ?? content;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function estimateNewsImpact({ symbol, companyName, newsItems, technicalForecast }) {
  const apiKey = process.env.Default_Gemini_API_Key;

  if (!apiKey) {
    return heuristicImpact(newsItems);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = JSON.stringify({
      company: companyName,
      symbol,
      technicalForecast,
      headlines: newsItems.map((n) => ({ title: n.title, source: n.source, pubDate: n.pubDate })),
      instruction: "Analyze the news sentiment and return ONLY valid JSON with keys: impact (positive/negative/neutral), confidence (0.0-1.0), summary (one concise sentence). No markdown, no extra text.",
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    const parsed = parseJsonMaybe(content);

    if (!parsed || !parsed.impact) {
      return heuristicImpact(newsItems);
    }

    const impact = ["positive", "negative", "neutral"].includes(parsed.impact)
      ? parsed.impact
      : "neutral";

    return {
      impact,
      confidence: Number(Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.6))).toFixed(2)),
      summary: parsed.summary || "Impact appears mixed based on current headlines.",
      source: "gemini",
    };
  } catch (error) {
    console.error("Gemini API error:", error.message);
    return heuristicImpact(newsItems);
  }
}

export async function generateComprehensiveAnalysis({ symbol, companyName, newsItems, technicalForecast, currentPrice }) {
  const apiKey = process.env.Default_Gemini_API_Key;

  if (!apiKey) {
    return {
      financialSummary: `${companyName} (${symbol}) is currently trading at $${currentPrice}. Technical indicators suggest ${technicalForecast.predictions.week.direction} momentum in the short term.`,
      newsSummary: `Based on ${newsItems.length} recent news articles, sentiment appears mixed. Key developments include product launches, market movements, and industry trends.`,
      riskFactors: ["Market volatility", "Industry competition", "Economic conditions"],
      opportunities: ["Product innovation", "Market expansion", "Technology adoption"],
      source: "heuristic",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze ${companyName} (${symbol}) based on:

Current Price: $${currentPrice}

Predictions:
- 1 Week: $${technicalForecast.predictions.week.predictedPrice} (${technicalForecast.predictions.week.expectedMovePct}%)
- 1 Month: $${technicalForecast.predictions.month.predictedPrice} (${technicalForecast.predictions.month.expectedMovePct}%)
- 3 Months: $${technicalForecast.predictions.quarter.predictedPrice} (${technicalForecast.predictions.quarter.expectedMovePct}%)
- 1 Year: $${technicalForecast.predictions.year.predictedPrice} (${technicalForecast.predictions.year.expectedMovePct}%)

Technical Indicators:
- RSI: ${technicalForecast.indicators.rsi14}
- SMA 50: $${technicalForecast.indicators.sma50}
- SMA 200: $${technicalForecast.indicators.sma200}

Recent News Headlines:
${newsItems.slice(0, 8).map((n, i) => `${i + 1}. ${n.title}`).join('\n')}

Provide ONLY valid JSON with these exact keys (no markdown, no extra text):
{
  "financialSummary": "2-3 sentence overview of technical position",
  "newsSummary": "2-3 sentence analysis of news sentiment",
  "riskFactors": ["risk1", "risk2", "risk3"],
  "opportunities": ["opp1", "opp2", "opp3"]
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    const parsed = parseJsonMaybe(content);

    if (!parsed) {
      throw new Error("Failed to parse Gemini response");
    }

    return {
      financialSummary: parsed.financialSummary || `Technical analysis for ${companyName}.`,
      newsSummary: parsed.newsSummary || "News sentiment is mixed.",
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : ["Market volatility"],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : ["Growth potential"],
      source: "gemini",
    };
  } catch (error) {
    console.error("Gemini API error:", error.message);
    return {
      financialSummary: `${companyName} (${symbol}) is currently trading at $${currentPrice}. Technical indicators suggest ${technicalForecast.predictions.week.direction} momentum in the short term.`,
      newsSummary: `Based on ${newsItems.length} recent news articles, sentiment appears mixed. Key developments include product launches, market movements, and industry trends.`,
      riskFactors: ["Market volatility", "Industry competition", "Economic conditions"],
      opportunities: ["Product innovation", "Market expansion", "Technology adoption"],
      source: "heuristic",
    };
  }}