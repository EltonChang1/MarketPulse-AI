import express from "express";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get User Watchlist
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("watchlist");
    res.json({ watchlist: user?.watchlist || [] });
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

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const upperSymbol = symbol.toUpperCase();
    if (!user.watchlist.includes(upperSymbol)) {
      user.watchlist.push(upperSymbol);
      await user.save();
    }

    res.json({ watchlist: user.watchlist, message: "Stock added to watchlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add to watchlist", error: error.message });
  }
});

// Remove Stock from Watchlist
router.delete("/remove/:symbol", authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const upperSymbol = symbol.toUpperCase();
    user.watchlist = user.watchlist.filter((s) => s !== upperSymbol);
    await user.save();

    res.json({ watchlist: user.watchlist, message: "Stock removed from watchlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from watchlist", error: error.message });
  }
});

export default router;
