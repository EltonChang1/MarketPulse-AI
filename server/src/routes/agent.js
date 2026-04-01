import express from "express";
import { Readable } from "stream";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { harnessAuth } from "../middleware/harnessAuth.js";
import { runAgentChat, runAgentStream, httpStatusFromAgentError } from "../services/agentService.js";
import { agentRateLimit } from "../middleware/agentRateLimit.js";

const router = express.Router();

router.post("/chat", optionalAuth, agentRateLimit, async (req, res) => {
  try {
    const result = await runAgentChat(req);
    res.json(result);
  } catch (error) {
    res.status(httpStatusFromAgentError(error)).json({ message: error.message || "Agent error" });
  }
});

router.post("/stream", optionalAuth, agentRateLimit, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (res.flushHeaders) res.flushHeaders();
  await runAgentStream(req, res);
});

const harnessRouter = express.Router();
harnessRouter.use(harnessAuth);
harnessRouter.use(async (req, res) => {
  const base = process.env.HARNESS_SERVER_URL;
  if (!base) {
    return res.status(503).json({
      message: "HARNESS_SERVER_URL not configured",
      hint: "Deploy claw rust server and set HARNESS_SERVER_URL + optional HARNESS_UPSTREAM_TOKEN.",
    });
  }

  const rest = req.originalUrl.slice("/api/agent/harness".length) || "/";
  const target = `${String(base).replace(/\/$/, "")}${rest}`;

  const headers = new Headers();
  const ct = req.headers["content-type"];
  if (ct) headers.set("Content-Type", ct);
  const accept = req.headers.accept;
  if (accept) headers.set("Accept", accept);
  if (process.env.HARNESS_UPSTREAM_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.HARNESS_UPSTREAM_TOKEN}`);
  }
  if (req.userId) {
    headers.set("X-MarketPulse-User", String(req.userId));
  }

  const init = { method: req.method, headers };

  if (!["GET", "HEAD"].includes(req.method)) {
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
      init.body = JSON.stringify(req.body);
    } else if (typeof req.body === "string" && req.body.length > 0) {
      init.body = req.body;
    }
  }

  try {
    const upstream = await fetch(target, init);
    res.status(upstream.status);
    const passContentType = upstream.headers.get("content-type");
    if (passContentType) res.setHeader("Content-Type", passContentType);
    res.setHeader("X-Accel-Buffering", "no");
    if (!upstream.body) {
      res.end();
      return;
    }
    const nodeStream = Readable.fromWeb(upstream.body);
    req.on("close", () => {
      if (!nodeStream.destroyed) nodeStream.destroy();
    });
    nodeStream.on("error", () => {
      if (!res.writableEnded) res.destroy();
    });
    nodeStream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ message: "Harness proxy failed", error: err?.message || String(err) });
    }
  }
});

router.use("/harness", harnessRouter);

export default router;
