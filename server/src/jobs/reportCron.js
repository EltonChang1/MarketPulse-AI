import cron from "node-cron";
import { listAllUserIds } from "../services/userStore.js";
import { generateWatchlistBriefForUser } from "../services/reportGenerationService.js";

export function scheduleReportCron() {
  if (process.env.ENABLE_REPORT_CRON !== "true") return;

  const expression = process.env.REPORT_CRON_EXPRESSION || "0 6 * * 0";
  cron.schedule(expression, async () => {
    console.log("[report-cron] Starting weekly watchlist briefs…");
    try {
      const ids = await listAllUserIds();
      for (const id of ids) {
        try {
          await generateWatchlistBriefForUser(id);
        } catch (err) {
          console.warn(`[report-cron] User ${id}:`, err?.message || err);
        }
      }
      console.log("[report-cron] Finished.");
    } catch (err) {
      console.error("[report-cron] Failed:", err?.message || err);
    }
  });

  console.log(`[report-cron] Scheduled: ${expression} (ENABLE_REPORT_CRON=true)`);
}

/**
 * Mount on Express: POST /api/internal/cron/weekly-briefings
 * Header: x-cron-secret: CRON_SECRET
 */
export function registerCronHttpTrigger(app) {
  app.post("/api/internal/cron/weekly-briefings", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers["x-cron-secret"] !== secret) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json({ ok: true, scheduled: true });
    setImmediate(async () => {
      try {
        const ids = await listAllUserIds();
        for (const id of ids) {
          try {
            await generateWatchlistBriefForUser(id);
          } catch (err) {
            console.warn(`[cron-http] User ${id}:`, err?.message || err);
          }
        }
      } catch (err) {
        console.error("[cron-http] Failed:", err?.message || err);
      }
    });
  });
}
