/**
 * Bearer token for harness / automation calling MarketPulse HTTP APIs (no end-user JWT).
 * Set INTERNAL_API_TOKEN; if unset, INTERNAL_SERVICE_TOKEN is accepted for convenience.
 */
export function internalApiAuth(req, res, next) {
  const expected = process.env.INTERNAL_API_TOKEN || process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    return res.status(503).json({
      message: "Internal API disabled",
      hint: "Set INTERNAL_API_TOKEN (or INTERNAL_SERVICE_TOKEN) for machine callers.",
    });
  }
  const auth = req.headers.authorization;
  const token = auth && auth.split(" ")[1];
  if (!token || token !== expected) {
    return res.status(401).json({ message: "Invalid or missing internal API token" });
  }
  next();
}
