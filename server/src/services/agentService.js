import OpenAI from "openai";
import { AGENT_OPENAI_TOOLS, executeAgentTool } from "./agentTools.js";
import { getUserById } from "./userStore.js";

const MAX_MESSAGE_CHARS = Number(process.env.AGENT_MAX_MESSAGE_CHARS || 8000);
const MAX_CONTEXT_NOTE_CHARS = 500;

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || /placeholder|your[_-]?key/i.test(key)) {
    const err = new Error("OPENAI_API_KEY is missing or not configured");
    err.status = 503;
    throw err;
  }
  return new OpenAI({ apiKey: key });
}

function modelName() {
  return process.env.AGENT_OPENAI_MODEL || "gpt-4o-mini";
}

export function validateAndTrimMessage(req) {
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    const err = new Error("message is required");
    err.status = 400;
    throw err;
  }
  const trimmed = message.trim();
  if (!trimmed.length) {
    const err = new Error("message is empty");
    err.status = 400;
    throw err;
  }
  if (trimmed.length > MAX_MESSAGE_CHARS) {
    const err = new Error(`message exceeds ${MAX_MESSAGE_CHARS} characters`);
    err.status = 400;
    throw err;
  }
  return trimmed;
}

export function httpStatusFromAgentError(err) {
  if (err?.status && Number.isFinite(err.status)) return err.status;
  const m = String(err?.message || err);
  if (/message is required|message is empty|exceeds/i.test(m)) return 400;
  if (/OPENAI_API_KEY|not configured/i.test(m)) return 503;
  if (/401|Incorrect API key|invalid api key/i.test(m)) return 503;
  if (/429|rate limit/i.test(m)) return 429;
  return 500;
}

async function buildUserContext(req) {
  const { symbol, watchlistSymbols, portfolioSnapshot, contextNote } = req.body || {};
  let watchlist = Array.isArray(watchlistSymbols)
    ? watchlistSymbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
    : [];
  if (req.userId && watchlist.length === 0) {
    const user = await getUserById(req.userId);
    watchlist = user?.watchlist || [];
  }
  const lines = [];
  if (symbol) lines.push(`User focus symbol: ${String(symbol).toUpperCase()}.`);
  if (watchlist.length) lines.push(`Watchlist: ${watchlist.join(", ")}.`);
  if (portfolioSnapshot && typeof portfolioSnapshot === "object") {
    lines.push(`Portfolio snapshot (client-provided JSON): ${JSON.stringify(portfolioSnapshot).slice(0, 4000)}`);
  }
  if (typeof contextNote === "string" && contextNote.trim()) {
    lines.push(`User context note: ${contextNote.trim().slice(0, MAX_CONTEXT_NOTE_CHARS)}`);
  }
  if (req.userEmail) lines.push(`Signed-in user email: ${req.userEmail}.`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are MarketPulse AI, a market intelligence assistant. You must use the provided tools for factual price, news, and analysis data—do not invent quotes or headlines.

Rules:
- Give clear, concise answers. Mention that this is not financial advice.
- When the user asks about a specific ticker, call analyze_symbol or quick_quote as appropriate.
- If watchlist context is provided, you may compare or prioritize those symbols when relevant.`;

async function executeToolCallsBatch(toolCalls, patternQuery) {
  const pairs = await Promise.all(
    toolCalls.map(async (tc) => {
      const fn = tc.function;
      let args = {};
      try {
        args = JSON.parse(fn.arguments || "{}");
      } catch {
        args = {};
      }
      let result;
      try {
        result = await executeAgentTool(fn.name, args, { patternQuery });
      } catch (err) {
        result = { error: err?.message || String(err) };
      }
      return {
        id: tc.id,
        content: JSON.stringify(result),
        name: fn.name,
        ok: !result?.error,
      };
    })
  );
  return pairs;
}

function appendToolResults(conv, pairs) {
  for (const tr of pairs) {
    conv.push({
      role: "tool",
      tool_call_id: tr.id,
      content: tr.content,
    });
  }
}

export async function runAgentChat(req) {
  const trimmed = validateAndTrimMessage(req);
  const openai = getOpenAI();
  const userContext = await buildUserContext(req);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(userContext ? [{ role: "system", content: `Context:\n${userContext}` }] : []),
    { role: "user", content: trimmed },
  ];

  const tools = AGENT_OPENAI_TOOLS;
  const patternQuery = req.body?.patternQuery || {};
  let conv = [...messages];

  for (let round = 0; round < 8; round += 1) {
    const completion = await openai.chat.completions.create({
      model: modelName(),
      messages: conv,
      tools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
      conv.push(msg);
      const pairs = await executeToolCallsBatch(msg.tool_calls, patternQuery);
      appendToolResults(conv, pairs);
      continue;
    }

    conv.push(msg);
    let reply = msg.content || "";

    if (!reply.trim() && choice.finish_reason === "stop") {
      conv.push({
        role: "user",
        content: "Briefly summarize the tool results above for the user in plain language (not financial advice).",
      });
      const followUp = await openai.chat.completions.create({
        model: modelName(),
        messages: conv,
        tool_choice: "none",
      });
      reply = followUp.choices[0]?.message?.content || reply;
    }

    return {
      reply,
      finishReason: choice.finish_reason,
      model: modelName(),
    };
  }

  throw new Error("Agent exceeded maximum tool rounds");
}

/**
 * Same agent loop, emits SSE: event "tool" | "delta" | "done" | "error"
 */
export async function runAgentStream(req, res) {
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const trimmed = validateAndTrimMessage(req);
    const openai = getOpenAI();
    const userContext = await buildUserContext(req);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(userContext ? [{ role: "system", content: `Context:\n${userContext}` }] : []),
      { role: "user", content: trimmed },
    ];

    const tools = AGENT_OPENAI_TOOLS;
    const patternQuery = req.body?.patternQuery || {};
    let conv = [...messages];

    for (let round = 0; round < 8; round += 1) {
      const completion = await openai.chat.completions.create({
        model: modelName(),
        messages: conv,
        tools,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      const msg = choice.message;

      if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
        conv.push(msg);
        for (const tc of msg.tool_calls) {
          const fn = tc.function;
          let args = {};
          try {
            args = JSON.parse(fn.arguments || "{}");
          } catch {
            args = {};
          }
          send("tool", { phase: "start", name: fn.name, args });
        }
        const pairs = await executeToolCallsBatch(msg.tool_calls, patternQuery);
        appendToolResults(conv, pairs);
        for (const p of pairs) {
          send("tool", { phase: "end", name: p.name, ok: p.ok });
        }
        continue;
      }

      conv.push(msg);
      let text = msg.content || "";

      if (!text.trim() && choice.finish_reason === "stop") {
        conv.push({
          role: "user",
          content: "Briefly summarize the tool results above for the user in plain language (not financial advice).",
        });
        const followUp = await openai.chat.completions.create({
          model: modelName(),
          messages: conv,
          tool_choice: "none",
        });
        text = followUp.choices[0]?.message?.content || text;
      }

      const parts = text.split(/(\s+)/);
      for (const p of parts) {
        if (p) send("delta", { text: p });
      }
      send("done", { model: modelName(), finishReason: choice.finish_reason });
      res.end();
      return;
    }

    send("error", { message: "Agent exceeded maximum tool rounds" });
    res.end();
  } catch (err) {
    const status = httpStatusFromAgentError(err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: err?.message || String(err), status })}\n\n`);
    res.end();
  }
}
