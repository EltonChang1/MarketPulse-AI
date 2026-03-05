import OpenAI from "openai";

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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return heuristicImpact(newsItems);
  }

  try {
    const client = new OpenAI({ apiKey });

    const prompt = {
      company: companyName,
      symbol,
      technicalForecast,
      headlines: newsItems.map((n) => ({ title: n.title, source: n.source, pubDate: n.pubDate })),
      output: {
        impact: "positive|negative|neutral",
        confidence: "0.0-1.0",
        summary: "one concise sentence",
      },
    };

    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a financial-news sentiment assistant. Use only provided headlines. Return strict JSON with keys: impact, confidence, summary.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || "";
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
      source: "llm",
    };
  } catch {
    return heuristicImpact(newsItems);
  }
}
