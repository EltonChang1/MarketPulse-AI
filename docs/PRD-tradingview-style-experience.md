# PRD — MarketPulse AI: TradingView-Inspired Experience

**Status:** Draft (product + design direction)  
**Owner:** Product / Design / Frontend  
**Scope:** Web client (`web/`) — visual IA, layout, and interaction patterns inspired by [TradingView](https://www.tradingview.com/) (reference captured 2026). **No change to core backend contracts or analysis algorithms unless explicitly called out.**

---

## 1. Summary

Evolve MarketPulse AI from a **feature-stacked dashboard** into a **classy, market-native surface** that feels closer to TradingView: **dense, scannable market data**, **clear hierarchy**, **professional chrome**, and **chart-first** workflows—while keeping MarketPulse’s differentiators (AI analysis, watchlist, portfolio, custom signals).

---

## 2. Problem

- The current home experience mixes **marketing-style panels** (quick actions, “financial services,” activity lists) with **real market tools**, which competes with focus and feels less “terminal-grade.”
- Users who compare us to TradingView expect **immediate market context** (indices, sectors, movers, search omnibar) and **tight typography/spacing**, not generic app cards.

---

## 3. Goals

| Goal | Success signal |
|------|----------------|
| **TradingView-like IA** | Home prioritizes **symbol discovery + market summary + lists** over promotional tiles. |
| **Elegant density** | More data per viewport without clutter; consistent numeric alignment. |
| **Chart credibility** | Charts feel primary; controls match pro terminal patterns. |
| **Brand continuity** | Still unmistakably MarketPulse (AI insights, portfolio). |
| **Accessibility** | WCAG AA for text; keyboard paths for search and lists; reduced motion respected. |

---

## 4. Non-goals

- Rebuilding a full TradingView charting product (drawing tools, Pine, social graph, broker execution).
- Replacing Lightweight Charts / TradingView embeds unless a future epic explicitly funds it.
- Changing auth, API shapes, or report generation logic in this PRD.

---

## 5. Reference patterns (from TradingView.com)

Use as **interaction and layout inspiration**, not pixel copying:

1. **Global wayfinding** — compact top bar: brand, search, primary nav clusters (Markets / Community analogs → our Portfolio, Classic).
2. **Hero restraint** — one strong headline + single primary CTA; avoid competing card grids on first paint.
3. **Market summary bands** — horizontal **ticker-style or strip modules**: major index, key futures/FX/commodity proxies, rates/inflation **where we have data**.
4. **Structured lists** — grouped lists (e.g. “Major indices,” “Watchlist movers”) with **symbol, name, last, change %**, optional sparkline.
5. **Editorial / ideas** (optional later) — card list with thumbnail, title, byline, symbol tag; **out of scope for v1** unless content pipeline exists.
6. **Dark-first polish** — TradingView’s strength is **dark UI contrast**; our `dark` token theme should be first-class on home and chart surfaces.

---

## 6. Current state (baseline)

- **Home:** Search, commodities section, authenticated watchlist sidebar, optional **markets table** (`FinancialTable`) when watchlist data exists.
- **Stock detail:** Rich analysis, Candlestick / TradingView, signals, patterns.
- **Portfolio:** Distinct page with shared `ui` primitives.
- **Removed from home (this release):** `FinancialDashboard` shell (quick actions / fake activity / services list) — **not required** for product narrative.

---

## 7. Target experience (phased)

### Phase 1 — Home “terminal lite” (MVP)

- **Single primary column** after global header:
  - **Omnibar search** (existing `SearchBar`) — visually dominant, TradingView-like width and focus ring.
  - **Market summary strip** (new or simplified): 3–6 cells from **real API data** (e.g. SPX, NDX, VIX, DXY if available via existing analyze endpoints or a thin `/api/market-summary` later).
  - **Watchlist table** as the **hero grid** (extend current `FinancialTable` or a denser variant): sortable columns, row click → stock route.
  - **Commodities / macro** section below fold or tabbed—reuse `CommoditiesSection` with tighter spacing.
- **Sidebar:** keep watchlist management; align card chrome to same token system as main column.

### Phase 2 — Detail page parity

- Collapse chrome; **chart occupies vertical priority**; analysis panels as **tabs or accordions** (TradingView’s density).
- Align toolbar (range, studies toggles) to a **single horizontal bar** above chart.

### Phase 3 — Optional “ideas” / education

- Surface **community** or editorial snippets as a slim rail—only if we have stable content.

---

## 8. Functional requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Home must not depend on `FinancialDashboard`; navigation to Portfolio, Classic remains available from **global header**. |
| FR-2 | Authenticated users see **live watchlist data** in the primary table/grid with existing refresh behavior. |
| FR-3 | Row selection opens **existing** stock detail route; no duplicate state machines. |
| FR-4 | Search remains the **primary entry** for guests and signed-in users. |
| FR-5 | Theme toggle continues to drive `dark` on `<html>`; home and charts must pass visual QA in both modes. |

---

## 9. Non-functional requirements

- **Performance:** No additional full-page blocking scripts; lazy-load heavy chart modules where possible.
- **Tokens:** New UI uses **semantic CSS variables** / Tailwind tokens; chart colors via `themeTokens` helpers (already introduced).
- **Telemetry (optional):** Track search submits, row opens, summary strip interactions.

---

## 10. Design system implications

- **Typography:** Slightly smaller base for tables (12–13px meta, 14px body); **tabular nums** for prices and %.
- **Color:** Neutral chrome; **green/red** only for signed deltas; avoid rainbow accents on chrome.
- **Motion:** Micro-interactions on row hover; **no** large stagger on initial table paint unless reduced-motion allows.

---

## 11. Engineering milestones

1. **Remove** home `FinancialDashboard` integration (done in same release as this PRD).
2. **Restyle** `dashboard.css` home layout: max-width, grid column ratios, sidebar alignment to TradingView-like proportions.
3. **Market summary strip** component + data hook (stub with static symbols if API not ready—feature-flag).
4. **Polish** `FinancialTable` for home: column set matches “screener” mental model (symbol, name, last, chg%, vol, spark).
5. **QA** dark mode + mobile horizontal scroll for tables.

---

## 12. Open questions

- Which **macro / index** symbols are guaranteed by the backend for a summary strip?
- Do we want **guests** to see delayed summary data or only signed-in?
- Should **Classic** remain linked in header only, or deprecate in favor of unified detail?

---

## 13. Acceptance criteria (Phase 1)

- [ ] Home renders **without** the former dashboard card block.
- [ ] Primary viewport emphasizes **search + market-oriented content** (table/strip).
- [ ] No regression in watchlist add/remove, navigation, or API errors.
- [ ] Styleguide updated to cite **TradingView as north-star IA** (not pixel clone).

---

*This PRD intentionally separates **visual/IA direction** from **TradingView’s full product scope**. Implementation should stay within MarketPulse’s data and compliance constraints.*
