import { authenticateToken } from "./auth.js";

/**
 * For /api/agent/harness/* proxy: either normal user JWT or internal service token + X-User-Id.
 */
export function harnessAuth(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const auth = req.headers.authorization;
  if (expected && auth === `Bearer ${expected}`) {
    const uid = req.headers["x-user-id"] || req.headers["x-marketpulse-user"];
    if (!uid) {
      return res.status(401).json({ message: "X-User-Id (or X-MarketPulse-User) required for service calls" });
    }
    req.userId = String(uid);
    req.harnessServiceActor = true;
    return next();
  }
  return authenticateToken(req, res, next);
}
