import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { getPortfolio, addTransaction, deleteTransaction } from "../services/portfolioStore.js";

const router = express.Router();

// Get current user's portfolio (transactions list)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const portfolio = await getPortfolio(req.userId);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch portfolio", error: error.message });
  }
});

// Add a transaction (buy/sell)
router.post("/transactions", authenticateToken, async (req, res) => {
  try {
    const portfolio = await addTransaction(req.userId, req.body);
    res.status(201).json(portfolio);
  } catch (error) {
    if (error.code === "INVALID_TX") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to add transaction", error: error.message });
  }
});

// Delete a transaction by id
router.delete("/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const portfolio = await deleteTransaction(req.userId, req.params.id);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: "Failed to delete transaction", error: error.message });
  }
});

export default router;
