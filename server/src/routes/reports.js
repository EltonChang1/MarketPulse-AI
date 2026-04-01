import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { listResearchReports, getResearchReport } from "../services/researchReportStore.js";
import {
  generateWatchlistBriefForUser,
  generatePortfolioSnapshotBrief,
} from "../services/reportGenerationService.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
    const summaryOnly =
      req.query.summary === "1" || req.query.summary === "true" || req.query.fields === "summary";
    const rows = await listResearchReports(String(req.userId), { limit, summaryOnly });
    res.json({ reports: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to list reports", error: error.message });
  }
});

router.post("/generate", authenticateToken, async (req, res) => {
  const { kind, portfolioSnapshot } = req.body || {};
  const k = kind === "portfolio_snapshot" ? "portfolio_snapshot" : "watchlist_weekly";
  res.status(202).json({ accepted: true, kind: k });

  setImmediate(async () => {
    try {
      if (k === "portfolio_snapshot") {
        await generatePortfolioSnapshotBrief(String(req.userId), portfolioSnapshot || {});
      } else {
        await generateWatchlistBriefForUser(String(req.userId));
      }
    } catch (err) {
      console.error("Background report generation failed:", err?.message || err);
    }
  });
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const row = await getResearchReport(String(req.userId), req.params.id);
    if (!row) return res.status(404).json({ message: "Report not found" });
    res.json({ report: row });
  } catch (error) {
    res.status(500).json({ message: "Failed to load report", error: error.message });
  }
});

export default router;
