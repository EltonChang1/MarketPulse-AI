const PORTFOLIO_KEY = "marketpulse_portfolio_v1";

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(next) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(next || {}));
}

export function getPortfolioKeyForUser(user) {
  if (user?.email) return String(user.email).toLowerCase();
  return "guest";
}

function toDayString(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeTransaction(raw) {
  if (!raw || typeof raw !== "object") return null;
  const side = raw.side === "sell" ? "sell" : "buy";
  const symbol = String(raw.symbol || "").trim().toUpperCase();
  const quantity = Number(raw.quantity);
  const price = Number(raw.price);
  const date = toDayString(raw.date || raw.createdAt);

  if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    id: raw.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    side,
    symbol,
    quantity,
    price,
    date,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function transactionsFromLegacyHoldings(legacy) {
  if (!Array.isArray(legacy)) return [];
  return legacy
    .map((holding) => {
      const symbol = String(holding?.symbol || "").trim().toUpperCase();
      const quantity = Number(holding?.quantity);
      const price = Number(holding?.buyPrice);
      const date = toDayString(holding?.createdAt);
      if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return null;
      return {
        id: `legacy_${symbol}_${date}_${Math.random().toString(16).slice(2)}`,
        side: "buy",
        symbol,
        quantity,
        price,
        date,
        createdAt: holding?.createdAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function sortTransactions(rows) {
  return [...rows].sort((left, right) => {
    const d = String(left.date || "").localeCompare(String(right.date || ""));
    if (d !== 0) return d;
    return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
  });
}

function deriveHoldingsFromTransactions(transactions) {
  const bySymbol = new Map();

  sortTransactions(transactions).forEach((tx) => {
    const current = bySymbol.get(tx.symbol) || { symbol: tx.symbol, quantity: 0, buyPrice: 0 };

    if (tx.side === "buy") {
      const totalCost = current.buyPrice * current.quantity + tx.price * tx.quantity;
      const nextQty = current.quantity + tx.quantity;
      current.quantity = nextQty;
      current.buyPrice = nextQty > 0 ? totalCost / nextQty : 0;
    } else {
      const nextQty = Math.max(0, current.quantity - tx.quantity);
      current.quantity = nextQty;
      if (nextQty === 0) current.buyPrice = 0;
    }

    if (current.quantity > 0) {
      bySymbol.set(tx.symbol, current);
    } else {
      bySymbol.delete(tx.symbol);
    }
  });

  return [...bySymbol.values()].map((item) => ({
    symbol: item.symbol,
    quantity: item.quantity,
    buyPrice: item.buyPrice,
    createdAt: new Date().toISOString(),
  }));
}

function normalizeModel(raw) {
  if (raw && typeof raw === "object" && Array.isArray(raw.transactions)) {
    const transactions = raw.transactions.map(normalizeTransaction).filter(Boolean);
    return {
      transactions: sortTransactions(transactions),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

  if (Array.isArray(raw)) {
    return {
      transactions: sortTransactions(transactionsFromLegacyHoldings(raw)),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    transactions: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getPortfolioModelForUser(user) {
  const store = readStore();
  const key = getPortfolioKeyForUser(user);
  return normalizeModel(store[key]);
}

export function savePortfolioModelForUser(user, model) {
  const store = readStore();
  const key = getPortfolioKeyForUser(user);
  const normalized = normalizeModel(model);
  store[key] = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getPortfolioForUser(user) {
  const model = getPortfolioModelForUser(user);
  return deriveHoldingsFromTransactions(model.transactions);
}

export function savePortfolioForUser(user, holdings) {
  const nextModel = {
    transactions: transactionsFromLegacyHoldings(holdings),
    updatedAt: new Date().toISOString(),
  };
  savePortfolioModelForUser(user, nextModel);
}

export function derivePortfolioHoldings(transactions) {
  return deriveHoldingsFromTransactions(Array.isArray(transactions) ? transactions : []);
}

export function sortPortfolioTransactions(transactions) {
  return sortTransactions(Array.isArray(transactions) ? transactions : []);
}
