import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPortfolioForUser } from "../context/portfolioStore";
import "../styles/ask-marketpulse.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function parseRouteSymbol(pathname) {
  const m = pathname.match(/^\/stock\/([^/]+)/);
  return m ? decodeURIComponent(m[1]).toUpperCase() : null;
}

function parseSseBuffer(buffer) {
  const events = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    let eventName = "message";
    const dataLines = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    const payload = dataLines.join("\n");
    if (!payload) continue;
    try {
      events.push({ event: eventName, data: JSON.parse(payload) });
    } catch {
      events.push({ event: eventName, data: payload });
    }
  }
  return { events, rest };
}

function flushTailSse(buffer) {
  if (!buffer.trim()) return [];
  const closed = buffer.endsWith("\n\n") ? buffer : `${buffer}\n\n`;
  return parseSseBuffer(closed).events;
}

export default function AskMarketPulse() {
  const { token, user, isAuthenticated } = useAuth();
  const location = useLocation();
  const routeSymbol = parseRouteSymbol(location.pathname);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const portfolioSnapshot = isAuthenticated ? getPortfolioForUser(user) : null;

  const sendStream = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setError("");
    setInput("");
    setStreaming(true);
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg, { role: "assistant", text: "", tools: [] }]);

    const watchlistSymbols = user?.watchlist?.length ? user.watchlist : undefined;

    const headers = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          symbol: routeSymbol || undefined,
          watchlistSymbols,
          portfolioSnapshot,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || res.statusText || "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      const toolLines = [];
      let sawDone = false;

      const applyEvents = (evs) => {
        for (const { event, data } of evs) {
          if (event === "delta" && data?.text) {
            assistantText += data.text;
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, text: assistantText, tools: [...toolLines] };
              }
              return next;
            });
          }
          if (event === "tool" && data?.phase === "start") {
            toolLines.push(`→ ${data.name}(${JSON.stringify(data.args || {})})`);
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, text: assistantText, tools: [...toolLines] };
              }
              return next;
            });
          }
          if (event === "done") {
            sawDone = true;
          }
          if (event === "error") {
            throw new Error(data?.message || "Stream error");
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseBuffer(buffer);
        buffer = rest;
        applyEvents(events);
      }

      applyEvents(flushTailSse(buffer));

      if (!sawDone && assistantText === "" && toolLines.length === 0) {
        throw new Error("Stream ended without a response");
      }
    } catch (e) {
      setError(e?.message || String(e));
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        const sorry = `Sorry — ${e?.message || "something went wrong"}.`;
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, text: sorry, tools: last.tools || [] };
          return next;
        }
        return [...next, { role: "assistant", text: sorry, tools: [] }];
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, token, user, routeSymbol, portfolioSnapshot]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="ask-mp-fab"
        onClick={() => setOpen(true)}
        aria-label="Open Ask MarketPulse"
      >
        Ask AI
      </button>

      {open ? (
        <div className="ask-mp-overlay" role="dialog" aria-modal="true" aria-label="Ask MarketPulse">
          <button type="button" className="ask-mp-backdrop" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="ask-mp-panel">
            <div className="ask-mp-head">
              <h2>Ask MarketPulse</h2>
              <button type="button" className="ask-mp-close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <p className="ask-mp-context">
              {routeSymbol ? `Context: ${routeSymbol}` : "Context: general"}
              {isAuthenticated ? " · Signed in" : " · Guest (add a ticker in your message)"}
            </p>
            <div className="ask-mp-messages">
              {messages.length === 0 ? (
                <p className="ask-mp-hint">
                  Ask for a quote, analysis, or news. Example: &quot;Summarize NVDA vs my watchlist risk.&quot;
                </p>
              ) : null}
              {messages.map((msg, i) => (
                <div key={i} className={`ask-mp-msg ask-mp-msg-${msg.role}`}>
                  {msg.role === "user" ? <strong>You</strong> : <strong>Assistant</strong>}
                  {msg.tools?.length ? (
                    <pre className="ask-mp-tools">{msg.tools.join("\n")}</pre>
                  ) : null}
                  <div className="ask-mp-msg-body">{msg.text}</div>
                </div>
              ))}
            </div>
            {error ? <div className="ask-mp-error">{error}</div> : null}
            <div className="ask-mp-input-row">
              <input
                type="text"
                className="ask-mp-input"
                placeholder="Message…"
                value={input}
                disabled={streaming}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendStream()}
              />
              <button type="button" className="ask-mp-send" disabled={streaming || !input.trim()} onClick={sendStream}>
                {streaming ? "…" : "Send"}
              </button>
            </div>
            <p className="ask-mp-disclaimer">Not financial advice. Data delays and model errors are possible.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
