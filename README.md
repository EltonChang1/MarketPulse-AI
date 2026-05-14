# MarketPulse AI — Group Leaderboard Add-on

This folder mirrors the `MarketPulse-AI-main` repo structure. **Drop these files into the repo root and let them overwrite / add files.** All paths are relative to the repo root.

## What this adds

A social investment leaderboard system:

- Portfolio transactions move from `localStorage` to a real MongoDB-backed (or in-memory fallback) store on the server.
- Users can create / join private groups via invite codes.
- A leaderboard endpoint computes per-member cost basis, current market value, gain/loss, and return %, then ranks members by total return.
- The frontend gets two new pages (`/groups`, `/groups/:groupId`) and a Groups link in the header.

## Files in this drop

### NEW files (8 server + 3 web)

| Path | Purpose |
| --- | --- |
| `server/src/models/Portfolio.js` | Mongoose schema for per-user portfolio transactions |
| `server/src/models/Group.js` | Mongoose schema for groups + members + invite code |
| `server/src/services/portfolioStore.js` | Dual-mode (Mongo + memory) portfolio store; mirrors the `userStore.js` pattern; exports `deriveHoldings` for ranking |
| `server/src/services/groupStore.js` | Dual-mode group store: create / list / join / leave |
| `server/src/services/leaderboardService.js` | Computes the ranked leaderboard for a group; uses cached `fetchQuoteAndHistory` calls (2-min TTL) so price lookups are batched per unique symbol |
| `server/src/routes/portfolio.js` | `GET /api/portfolio`, `POST /api/portfolio/transactions`, `DELETE /api/portfolio/transactions/:id` |
| `server/src/routes/groups.js` | `GET /api/groups`, `POST /api/groups`, `GET /api/groups/:groupId`, `POST /api/groups/join`, `POST /api/groups/:groupId/leave`, `GET /api/groups/:groupId/leaderboard` |
| `web/src/lib/portfolioApi.js` | Thin axios wrapper for all portfolio + group endpoints |
| `web/src/components/GroupsPage.jsx` | `/groups` — list, create, join groups |
| `web/src/components/GroupDetailPage.jsx` | `/groups/:groupId` — leaderboard table |

### MODIFIED files (3)

These overwrite the originals in the repo. The diffs are small and localized:

| Path | What changed |
| --- | --- |
| `server/src/index.js` | Added 2 route imports (`portfolio`, `groups`) and 2 `app.use(...)` mounts. No logic touched. |
| `web/src/App.jsx` | Added 2 imports (`GroupsPage`, `GroupDetailPage`), added a `<ShellNavLink to="/groups">` between Portfolio and Classic, added 2 `<Route>` entries. No logic touched. |
| `web/src/components/PortfolioPage.jsx` | Swapped `localStorage` calls for backend API calls. Pulls `token` + `isAuthenticated` from `useAuth`. `handleAddTransaction` and `handleDeleteTransaction` now go through `addTransactionApi` / `deleteTransactionApi`. The `getPortfolioModelForUser` / `savePortfolioModelForUser` imports are removed; the pure helpers `derivePortfolioHoldings` and `sortPortfolioTransactions` are kept. |

## What is NOT touched

- `web/src/context/portfolioStore.js` — kept exactly as-is so the pure helpers still work. The localStorage logic is no longer called from the app, but lives there if you want to write a one-time migration that pushes old localStorage portfolios up to the API on first login.
- `server/src/models/User.js`, `server/src/services/userStore.js`, auth, watchlist — untouched.
- All market data services and existing routes — untouched.

## How to verify locally

From `server/`:

```bash
npm install      # no new dependencies needed; uses existing mongoose
npm run dev
```

From `web/`:

```bash
npm install
npm run dev
```

Sign up two accounts in different browsers (or one normal + one incognito). Create a group in account A, copy the invite code shown on the group card, paste it into account B's "Join with invite code" box. Add a few transactions on each Portfolio page and reload `/groups/:groupId` — you'll see the leaderboard with ranks.

Without `MONGODB_URI` in `.env`, everything still works using the in-memory `Map` fallback (same pattern as `userStore.js`). Data will reset on server restart. Set `MONGODB_URI` for persistence.

## API summary

```
GET    /api/portfolio                      → { transactions: [...] }
POST   /api/portfolio/transactions         body: { side, symbol, quantity, price, date }
DELETE /api/portfolio/transactions/:id

GET    /api/groups                         → { groups: [...] }
POST   /api/groups                         body: { name, description?, visibility? }
GET    /api/groups/:groupId                → { group }
POST   /api/groups/join                    body: { inviteCode }
POST   /api/groups/:groupId/leave
GET    /api/groups/:groupId/leaderboard    → { groupId, groupName, generatedAt, leaderboard: [...] }
```

All endpoints require `Authorization: Bearer <token>` (same auth as your existing watchlist routes).
