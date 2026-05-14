import Portfolio from "../models/Portfolio.js";

const hasMongoConfigured = Boolean(process.env.MONGODB_URI);
const memoryPortfolios = new Map(); // userId -> { transactions: [] }

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTx(raw) {
  if (!raw || typeof raw !== "object") return null;
  const side = raw.side === "sell" ? "sell" : "buy";
  const symbol = String(raw.symbol || "").trim().toUpperCase();
  const quantity = Number(raw.quantity);
  const price = Number(raw.price);
  const date = String(raw.date || new Date().toISOString().slice(0, 10));
  if (!symbol || !Number.isFinite(quantity) || quantity <= 0) return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    id: raw.id || makeId(),
    side,
    symbol,
    quantity,
    price,
    date,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export async function getPortfolio(userId) {
  if (hasMongoConfigured) {
    const doc = await Portfolio.findOne({ userId }).lean();
    return { transactions: doc?.transactions || [] };
  }
  return memoryPortfolios.get(userId) || { transactions: [] };
}

export async function addTransaction(userId, rawTx) {
  const tx = normalizeTx(rawTx);
  if (!tx) {
    const err = new Error("Invalid transaction payload");
    err.code = "INVALID_TX";
    throw err;
  }

  if (hasMongoConfigured) {
    const doc = await Portfolio.findOneAndUpdate(
      { userId },
      { $push: { transactions: tx }, $setOnInsert: { userId } },
      { upsert: true, new: true }
    ).lean();
    return { transactions: doc.transactions };
  }

  const existing = memoryPortfolios.get(userId) || { transactions: [] };
  existing.transactions = [...existing.transactions, tx];
  memoryPortfolios.set(userId, existing);
  return existing;
}

export async function deleteTransaction(userId, txId) {
  if (hasMongoConfigured) {
    const doc = await Portfolio.findOneAndUpdate(
      { userId },
      { $pull: { transactions: { id: txId } } },
      { new: true }
    ).lean();
    return { transactions: doc?.transactions || [] };
  }
  const existing = memoryPortfolios.get(userId) || { transactions: [] };
  existing.transactions = existing.transactions.filter((t) => t.id !== txId);
  memoryPortfolios.set(userId, existing);
  return existing;
}

export async function getPortfoliosForUserIds(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return new Map();
  if (hasMongoConfigured) {
    const docs = await Portfolio.find({ userId: { $in: userIds } }).lean();
    return new Map(docs.map((d) => [d.userId, d.transactions || []]));
  }
  const out = new Map();
  userIds.forEach((uid) => {
    const p = memoryPortfolios.get(uid);
    if (p) out.set(uid, p.transactions);
  });
  return out;
}

// Derives current holdings from transaction history.
// Mirrors deriveHoldingsFromTransactions in web/src/context/portfolioStore.js
// but additionally tracks totalCostBasis so leaderboard can compute returns.
export function deriveHoldings(transactions) {
  const sorted = [...(transactions || [])].sort((a, b) => {
    const d = String(a.date).localeCompare(String(b.date));
    return d !== 0 ? d : String(a.createdAt).localeCompare(String(b.createdAt));
  });

  const bySymbol = new Map();
  for (const tx of sorted) {
    const cur = bySymbol.get(tx.symbol) || {
      symbol: tx.symbol,
      quantity: 0,
      avgCost: 0,
      totalCostBasis: 0,
    };
    if (tx.side === "buy") {
      const newQty = cur.quantity + tx.quantity;
      cur.totalCostBasis += tx.quantity * tx.price;
      cur.avgCost = newQty > 0 ? cur.totalCostBasis / newQty : 0;
      cur.quantity = newQty;
    } else {
      const sellQty = Math.min(cur.quantity, tx.quantity);
      cur.totalCostBasis -= sellQty * cur.avgCost; // reduce cost basis proportionally
      cur.quantity -= sellQty;
      if (cur.quantity <= 0) {
        cur.quantity = 0;
        cur.avgCost = 0;
        cur.totalCostBasis = 0;
      }
    }
    bySymbol.set(tx.symbol, cur);
  }
  return [...bySymbol.values()].filter((h) => h.quantity > 0);
}
