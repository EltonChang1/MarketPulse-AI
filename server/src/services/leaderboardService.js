import { fetchQuoteAndHistory } from "./marketService.js";
import { getPortfoliosForUserIds, deriveHoldings } from "./portfolioStore.js";
import { getUserById } from "./userStore.js";

const PRICE_TTL_MS = 2 * 60 * 1000;
const priceCache = new Map(); // symbol -> { price, expiresAt }

async function getPriceCached(symbol) {
  const now = Date.now();
  const hit = priceCache.get(symbol);
  if (hit && hit.expiresAt > now) return hit.price;
  try {
    const { currentPrice } = await fetchQuoteAndHistory(symbol);
    priceCache.set(symbol, { price: currentPrice, expiresAt: now + PRICE_TTL_MS });
    return currentPrice;
  } catch (err) {
    if (hit) return hit.price; // stale fallback
    console.warn(`Leaderboard: failed price for ${symbol}: ${err.message}`);
    return null;
  }
}

async function getPricesForSymbols(symbols) {
  const unique = [...new Set(symbols)];
  const entries = await Promise.all(
    unique.map(async (sym) => [sym, await getPriceCached(sym)])
  );
  return new Map(entries);
}

export async function computeGroupLeaderboard(group) {
  const userIds = group.members.map((m) => m.userId);
  const portfolioMap = await getPortfoliosForUserIds(userIds);

  // Collect every symbol across all members so we batch price lookups once.
  const allSymbols = new Set();
  const perUserHoldings = new Map();
  for (const uid of userIds) {
    const txs = portfolioMap.get(uid) || [];
    const holdings = deriveHoldings(txs);
    perUserHoldings.set(uid, { txs, holdings });
    holdings.forEach((h) => allSymbols.add(h.symbol));
  }

  const priceMap = await getPricesForSymbols([...allSymbols]);

  const rows = await Promise.all(
    userIds.map(async (uid) => {
      const user = await getUserById(uid);
      const { txs, holdings } = perUserHoldings.get(uid) || { txs: [], holdings: [] };

      let currentValue = 0;
      let costBasis = 0;
      let topHolding = null;
      let topHoldingValue = -Infinity;

      for (const h of holdings) {
        const price = priceMap.get(h.symbol);
        const mv = price != null ? price * h.quantity : 0;
        currentValue += mv;
        costBasis += h.totalCostBasis;
        if (mv > topHoldingValue) {
          topHoldingValue = mv;
          topHolding = h.symbol;
        }
      }

      const gain = currentValue - costBasis;
      const returnPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      return {
        userId: uid,
        username: user?.username || user?.email || "Anonymous",
        totalCost: Number(costBasis.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        gain: Number(gain.toFixed(2)),
        returnPct: Number(returnPct.toFixed(2)),
        topHolding,
        holdingCount: holdings.length,
        hasPortfolio: txs.length > 0,
      };
    })
  );

  const ranked = rows
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((r, idx) => ({ rank: idx + 1, ...r }));

  return {
    groupId: group.id,
    groupName: group.name,
    generatedAt: new Date().toISOString(),
    leaderboard: ranked,
  };
}
