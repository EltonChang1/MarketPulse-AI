const windows = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.AGENT_RATE_LIMIT_PER_MINUTE || 30);

function keyForRequest(req) {
  if (req.userId) return `u:${req.userId}`;
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `ip:${ip}`;
}

export function agentRateLimit(req, res, next) {
  const k = keyForRequest(req);
  const now = Date.now();
  let w = windows.get(k);
  if (!w || now - w.start >= WINDOW_MS) {
    w = { start: now, count: 0 };
    windows.set(k, w);
  }
  w.count += 1;
  if (w.count > MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many agent requests. Try again in a minute.",
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - w.start)) / 1000),
    });
  }
  next();
}
