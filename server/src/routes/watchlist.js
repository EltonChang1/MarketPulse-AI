import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { addUserWatchlistSymbol, getUserById, removeUserWatchlistSymbol } from "../services/userStore.js";

const router = express.Router();

// Get User Watchlist
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ watchlist: user.watchlist || [] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch watchlist", error: error.message });
  }
});

// Add Stock to Watchlist
router.post("/add", authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ message: "Symbol required" });
    }

    const watchlist = await addUserWatchlistSymbol(req.userId, symbol);
    if (!watchlist) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ watchlist, message: "Stock added to watchlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add to watchlist", error: error.message });
  }
});

// Remove Stock from Watchlist
router.delete("/remove/:symbol", authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;

    const watchlist = await removeUserWatchlistSymbol(req.userId, symbol);
    if (!watchlist) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ watchlist, message: "Stock removed from watchlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from watchlist", error: error.message });
  }
});

export default router;
