import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
const MODEL_NOT_FOUND_PATTERN = /(not found|not supported|404)/i;

let cachedGeminiClient = null;
let cachedGeminiModelName = null;
let geminiDisabled = false;
let hasLoggedGeminiDisabled = false;

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

function getGeminiApiKey() {
  return process.env.Default_Gemini_API_Key || process.env.GEMINI_API_KEY || "";
}

function getConfiguredGeminiModels() {
  const configured = String(process.env.GEMINI_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;
  return DEFAULT_GEMINI_MODELS;
}

function isModelNotFoundError(error) {
  return MODEL_NOT_FOUND_PATTERN.test(String(error?.message || ""));
}

function logGeminiDisabledOnce(message) {
  if (hasLoggedGeminiDisabled) return;
  hasLoggedGeminiDisabled = true;
  console.warn(message);
}

async function generateGeminiText(prompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is missing");
  }

  if (geminiDisabled) {
    throw new Error("Gemini temporarily disabled due to incompatible model configuration");
  }

  if (!cachedGeminiClient) {
    cachedGeminiClient = new GoogleGenerativeAI(apiKey);
  }

  const candidates = cachedGeminiModelName ? [cachedGeminiModelName] : getConfiguredGeminiModels();
  let lastError;

  for (const modelName of candidates) {
    try {
      const model = cachedGeminiClient.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      cachedGeminiModelName = modelName;
      return result.response.text();
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) {
        break;
      }
    }
  }

  if (isModelNotFoundError(lastError)) {
    geminiDisabled = true;
    logGeminiDisabledOnce(
      `Gemini model unavailable for configured API version. Checked models: ${getConfiguredGeminiModels().join(", ")}. Falling back to heuristic summaries.`
    );
  }

  throw lastError || new Error("Gemini request failed");
}

export async function estimateNewsImpact({ symbol, companyName, newsItems, technicalForecast }) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return heuristicImpact(newsItems);
  }

  try {
    const prompt = JSON.stringify({
      company: companyName,
      symbol,
      technicalForecast,
      headlines: newsItems.map((n) => ({ title: n.title, source: n.source, pubDate: n.pubDate })),
      instruction: "Analyze the news sentiment and return ONLY valid JSON with keys: impact (positive/negative/neutral), confidence (0.0-1.0), summary (one concise sentence). No markdown, no extra text.",
    });

    const content = await generateGeminiText(prompt);
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
    if (!geminiDisabled) {
      console.error("Gemini API error:", error.message);
    }
    return heuristicImpact(newsItems);
  }
}

export async function generateDetailedNewsSummary({ symbol, companyName, newsItems, technicalForecast, currentPrice }) {
  const apiKey = getGeminiApiKey();

  // If no news items, return empty summary
  if (!newsItems || newsItems.length === 0) {
    return {
      factsParagraph: `No recent news found for ${companyName} (${symbol}).`,
      impactParagraph: `Without recent news developments, stock price movement will likely be driven by technical factors and broader market conditions.`,
      source: "heuristic",
    };
  }

  // Use heuristic if no Gemini API key
  if (!apiKey) {
    const headlines = newsItems.slice(0, 10).map((n) => n.title).join(" ");
    const hasPositive = /beats|surge|growth|upgrade|record|strong|profit|partnership|innovation|buyback|expands|approval/i.test(headlines);
    const hasNegative = /misses|decline|downgrade|lawsuit|probe|layoffs|weak|loss|delay|recall|antitrust|cut/i.test(headlines);

    const sentiment = hasPositive && !hasNegative ? "positive" : hasNegative && !hasPositive ? "negative" : "mixed";

    let factsParagraph = `Recent news regarding ${companyName} shows ${sentiment} developments. Key headlines include: `;
    factsParagraph += newsItems
      .slice(0, 5)
      .map((n) => n.title)
      .join("; ");
    factsParagraph += ".";

    let impactParagraph = "";
    if (sentiment === "positive") {
      impactParagraph = `The positive news environment may support short-term strength (1-4 weeks). Medium-term (1-3 months), sustained positive momentum could drive 5-10% gains. Long-term (6-12 months), fundamentals from positive developments could contribute to substantial moves if execution continues.`;
    } else if (sentiment === "negative") {
      impactParagraph = `The negative news may pressure near-term price action (1-4 weeks). Medium-term (1-3 months), the stock could see 5-15% downside if concerns deepen. Long-term (6-12 months), resolution of issues or strategic pivots would be needed to reverse negative sentiment.`;
    } else {
      impactParagraph = `Mixed news sentiment suggests balanced short-term (1-4 weeks) price action with key catalysts pending. Medium-term (1-3 months), continued developments will determine directional bias. Long-term (6-12 months), fundamental improvements or market shifts could provide direction.`;
    }

    return {
      factsParagraph,
      impactParagraph,
      source: "heuristic",
    };
  }

  try {
    const topNews = newsItems.slice(0, 10).map((n) => `- ${n.title}`).join("\n");

    const prompt = `You are a financial analyst. Summarize the top 10 news items for ${companyName} (${symbol}), currently trading at $${currentPrice}.

Top 10 Recent News:
${topNews}

Technical Context:
- 1-week forecast: $${technicalForecast.predictions.week.predictedPrice} (${technicalForecast.predictions.week.expectedMovePct}%)
- 1-month forecast: $${technicalForecast.predictions.month.predictedPrice} (${technicalForecast.predictions.month.expectedMovePct}%)
- 3-month forecast: $${technicalForecast.predictions.quarter.predictedPrice} (${technicalForecast.predictions.quarter.expectedMovePct}%)
- 1-year forecast: $${technicalForecast.predictions.year.predictedPrice} (${technicalForecast.predictions.year.expectedMovePct}%)

Generate ONLY valid JSON with NO markdown or extra text. Use these exact keys:
{
  "factsParagraph": "One paragraph (3-5 sentences) summarizing the factual events/announcements from recent news. Focus on what happened without speculation.",
  "impactParagraph": "One paragraph (4-6 sentences) analyzing stock price impact broken down by timeframe: Short-term (days to 4 weeks), Medium-term (1-3 months), and Long-term (6-12 months). Include clear timelines and potential price movements."
}`;

    const content = await generateGeminiText(prompt);
    const parsed = parseJsonMaybe(content);

    if (!parsed || !parsed.factsParagraph || !parsed.impactParagraph) {
      throw new Error("Invalid response structure");
    }

    return {
      factsParagraph: parsed.factsParagraph,
      impactParagraph: parsed.impactParagraph,
      source: "gemini",
    };
  } catch (error) {
    if (!geminiDisabled) {
      console.error("Gemini API error in news summary:", error.message);
    }

    // Fallback heuristic
    let factsParagraph = `Recent developments for ${companyName} (${symbol}): `;
    factsParagraph += newsItems
      .slice(0, 5)
      .map((n) => n.title)
      .join("; ");
    factsParagraph += ".";

    const impactParagraph = `Market sentiment and technical indicators suggest short-term (1-4 weeks) direction could be mixed. Medium-term (1-3 months) developments depend on news resolution. Long-term (6-12 months) trends align with technical forecasts showing potential moves to $${technicalForecast.predictions.year.predictedPrice}.`;

    return {
      factsParagraph,
      impactParagraph,
      source: "heuristic",
    };
  }
}
  const apiKey = getGeminiApiKey();

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

    const content = await generateGeminiText(prompt);
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
    if (!geminiDisabled) {
      console.error("Gemini API error:", error.message);
    }
    return {
      financialSummary: `${companyName} (${symbol}) is currently trading at $${currentPrice}. Technical indicators suggest ${technicalForecast.predictions.week.direction} momentum in the short term.`,
      newsSummary: `Based on ${newsItems.length} recent news articles, sentiment appears mixed. Key developments include product launches, market movements, and industry trends.`,
      riskFactors: ["Market volatility", "Industry competition", "Economic conditions"],
      opportunities: ["Product innovation", "Market expansion", "Technology adoption"],
      source: "heuristic",
    };
  }
}