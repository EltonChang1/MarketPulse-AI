# MarketPulse AI — UI style guide (TradingView-inspired IA)

This guide defines how to evolve MarketPulse AI toward a **classy, market-terminal aesthetic** inspired by [TradingView](https://www.tradingview.com/)—**information density, chart credibility, and restrained chrome**—while preserving product behavior (APIs, auth, routing, data logic). It extends the earlier **21st.dev / shadcn-style** integration (Tailwind, `components/ui`, semantic tokens).

**Product direction:** see [`docs/PRD-tradingview-style-experience.md`](docs/PRD-tradingview-style-experience.md) for phased goals, functional requirements, and acceptance criteria.

---

## 1) Objective

Build a visual layer that is:

- **Market-native** — home and key surfaces read like a **terminal lite** (summary context + scannable lists + search), not a marketing dashboard of tiles.
- **Elegant** — clear hierarchy, refined spacing, professional typography (tabular numbers for prices).
- **Token-driven** — semantic colors, dark mode first-class; chart APIs use `web/src/lib/themeTokens.js` where raw hex is not appropriate.

All functional workflows must remain unchanged unless a PRD explicitly migrates them.

---

## 2) Required stack check

The codebase should support:

- shadcn-style project structure
- Tailwind CSS
- TypeScript-ready architecture

### Current repo status (`web/`)

- **Tailwind CSS:** enabled
- **shadcn-compatible paths:** enabled via alias (`@/`) and `src/components/ui`
- **TypeScript:** not yet migrated app-wide (current app is JSX)

### If TypeScript is not enabled

Use this migration path (incremental):

1. Install `typescript`, `@types/react`, `@types/react-dom`
2. Add `tsconfig.json`
3. Rename files progressively (`.jsx` → `.tsx`)
4. Start with UI primitives in `src/components/ui`

Do not block UI refresh on full TS migration; migrate safely in slices.

---

## 3) Default paths

Use these paths as canonical:

- App source: `web/src`
- UI primitives: `web/src/components/ui`
- Feature screens: `web/src/components`
- Tokens and theme: `web/src/index.css`
- Chart/theme helpers: `web/src/lib/themeTokens.js`
- Utility helper (`cn`): `web/src/lib/utils.js` (or `.ts` after TS migration)

### Why `/components/ui` is important

If default path is not `/components/ui`, create it. This keeps:

- predictable imports (`@/components/ui/...`),
- compatibility with shadcn/21st snippets,
- strict separation between primitives and business features.

---

## 4) Component integration blueprint

Anchor components for the **TradingView-like** direction:

1. **Market table** (`financial-markets-table`) — primary home grid when watchlist data exists; dense columns, row → symbol detail.
2. **Shared primitives** — `button`, `badge`, `card` for surfaces that still need cards (sidebar, modals, settings).
3. **Global shell** — header/nav carries **Portfolio, Briefings, Classic** (and auth); home does **not** duplicate quick-action marketing tiles.

**Deprecated on home:** the former `financial-dashboard` shell (quick actions, “recent activity,” “financial services” list) has been **removed** from the product; do not reintroduce equivalent blocks without PRD review.

### 4.1 Installation dependencies

Install in `web/`:

```bash
npm install framer-motion lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-slot
```

If using Next.js `next-themes`, replace with local theme provider in Vite (this repo uses `ThemeContext` + `dark` class on `<html>`).

### 4.2 Files in `src/components/ui` (current direction)

- `financial-markets-table.jsx` — screener-style table + sparklines
- `badge.jsx`, `button.jsx`, `card.jsx` — shared chrome
- `sign-in-flow-1.jsx` — 21st.dev-inspired auth shell (`SignUpAuthShell`) for `/signup` and `/signin`
- `sidebar-row.jsx` — compact screener-style sidebar rows

Optional future additions (PRD Phase 1+): **market summary strip** component, denser table variant, tabbed macro section.

### 4.3 Demo placement

Place demos in route-level components for visual QA only.  
Do not duplicate production data logic in demos.

### 4.4 Auth surfaces — 21st.dev “Sign In Flow 1” (Vite port)

**Reference:** [Sign In Flow | 21st.dev](https://21st.dev/community/components/erikx/sign-in-flow-1/default)

**Goal:** Match that component’s **layout, motion, and dark chrome** on `/signup` and `/signin` without requiring Next.js.

**Stack expectations from the upstream snippet**

- shadcn-style paths (`components/ui`, `cn` from `@/lib/utils`)
- Tailwind CSS
- TypeScript in the upstream paste — **this repo’s app is still JSX**; port as `.jsx` until TS migration

**Vite / React Router adaptations (required here)**

| Upstream (Next) | MarketPulse (`web/`) |
|-----------------|----------------------|
| `next/link` `Link` + `href` | `react-router-dom` `Link` + `to` |
| `import from "@/components/ui/sign-in-flow-1"` | Same alias via Vite (`@` → `src`) |
| Full-screen layout inside `App` + global header | **Hide** `AppHeader` and `AskMarketPulse` on `/signup` and `/signin` so the auth shell is full-bleed (see `App.jsx` + `useLocation`) |

**Canonical file**

- `web/src/components/ui/sign-in-flow-1.jsx` — exports `SignUpAuthShell`, `AuthFlowBackdrop`, `AuthFlowNavbar` (motion + Tailwind; **CSS dot-field backdrop** instead of `@react-three/fiber` + `three` to keep bundle size and WebGL failure modes small). If you need pixel-parity WebGL later, add:

  ```bash
  cd web && npm install three @react-three/fiber
  ```

  and replace `AuthFlowBackdrop` internals only (keep the same exports so `SignUpPage` / `SignInPage` stay stable).

**Signup product rules**

- **Username** replaces first/last name on signup; **required**; **2–24 chars**, `a-zA-Z0-9_`; stored server-side and shown in the **top-right** (`AppHeader`) when present (fallback: legacy `firstName` / `email`).
- API: `POST /api/auth/signup` body includes `{ email, password, username }`.

**Integration checklist (from 21st workflow)**

1. Confirm `web/src/components/ui` exists and Tailwind scans it.
2. Copy/adapt the visual shell into `sign-in-flow-1.jsx` (already done for this repo).
3. Wire **real** auth + validation in `SignUpPage.jsx` / `AuthContext.jsx` (not demo-only state).
4. Prefer **lucide-react** for any new icons if you extend the shell.
5. Validate keyboard focus, contrast on black, and mobile nav on the floating header.

---

## 5) Implementation guidelines

For each component integration:

1. Analyze structure and required dependencies
2. Review arguments/props and local state
3. Identify context hooks/providers needed (theme, auth, motion settings)
4. Ask:
   - What data/props are passed?
   - Any state management constraints?
   - Required assets/icons?
   - Expected responsive behavior?
   - Best placement in current UX flow?

### Integration steps

0. Copy or create component in `src/components/ui`
1. Install external dependencies
2. Map to real app data (do not hardcode production values)
3. Preserve existing routes and actions
4. Replace old presentation layer progressively
5. Validate dark mode + reduced motion

---

## 6) Website-wide adoption plan (non-breaking)

### Phase A — Foundation

- Keep semantic tokens in `index.css`
- Keep theme toggle with persistent `dark` class
- Ensure new UI uses semantic classes (`bg-*`, `text-*`, `border-*`)

### Phase B — Primary surfaces (TradingView-like)

- **Home:** omnibar search → **market-oriented** content (table, future summary strip, commodities/macro). **No** marketing dashboard card above search.
- **Sidebar:** watchlist + portfolio mini; align padding, borders, and type to main column.
- **Detail / Portfolio / Briefings:** shared `Button` / `Badge` / `Card`; chart-first layout on detail (see PRD Phase 2).

### Phase C — Detail and portfolio screens

- Refactor detail panels and controls to match shared patterns
- Keep charting engines and analysis logic unchanged

### Phase D — QA and consistency

- Focus states everywhere
- Keyboard navigation intact
- Motion reduced when preferred
- Dark mode visual parity

---

## 7) Interaction and elegance rules

- Motion is meaningful: orient, reveal, confirm
- Hover/active states are subtle, not noisy
- **Information density is high** but breathable (TradingView benchmark)
- One primary CTA per **section**; global nav owns cross-page navigation
- Numeric data uses **tabular figures** and stable alignment
- Positive/negative deltas: consistent semantic colors only (no decorative rainbow)

---

## 8) Pattern standards

### Market table standard

- Horizontal scroll container for dense columns on small viewports
- Stable grid columns across header and rows
- Selection state + hover state
- Performance chips for percentages
- Sparkline animations with reduced-motion fallback

### Card standard

- Unified card rhythm (`rounded`, `border`, `shadow`, padding scale)
- Use cards **where content is grouped** (sidebar blocks, settings), not as the default home hero

### Home / “terminal lite” standard (north star)

- **No** competing hero grids of “features” above real data
- Optional **market summary strip** (indices, key instruments) when data is available
- **Search** remains visually primary for discovery

---

## 9) Theme and color policy

This guide **does not lock** the product to a fixed palette.

- Use semantic tokens for all new UI.
- Keep positive/negative semantics consistent for market data.
- Brand palette can evolve without rewriting components.
- Chart-related JS must prefer `themeTokens` over hard-coded hex where APIs require RGB/hex strings.

---

## 10) Accessibility and quality gates

Before merge:

- [ ] keyboard-focus visible for all controls
- [ ] color contrast passes AA for text
- [ ] no interaction relies on color only
- [ ] loading and error states visible and explicit
- [ ] dark mode parity checked
- [ ] reduced motion respected

---

## 11) What is already applied in this repo

- Tailwind + semantic token layer
- Theme toggle with persisted dark mode
- `@` alias and `components/ui` structure
- **Global nav:** **Classic** link in the main header and in the auth shell nav (guest + signed-in)
- **Reduced motion:** `prefers-reduced-motion` disables auth dot animation (`index.css`); `FinancialTable` row stagger/blur and sparkline draw respect `useReducedMotion`
- **Auth a11y:** Lucide menu icons on the auth shell; `focus-visible` rings on shell nav links, form fields, and primary buttons
- **Home:** search, optional `FinancialTable` from watchlist data, commodities section, sidebar watchlist/portfolio — **without** the former `FinancialDashboard` block
- **Auth:** `/signup` and `/signin` use `sign-in-flow-1.jsx` full-bleed shell (global header hidden on those routes); signup requires **username** (API + Mongo/memory store)
- Stock detail, portfolio, and briefings refactors toward shared UI primitives (ongoing per PRD phases)

---

This style guide is the source of truth for implementing MarketPulse’s **TradingView-inspired** UI direction. For scope, milestones, and acceptance criteria, use the PRD linked at the top.
