# MarketPulse AI — UI style guide

This guide defines how MarketPulse AI looks and feels: **one product**, not separate “marketing auth” vs “dashboard” skins.

**Visual north star:** the **`/signup` and `/signin` experience** (`SignUpAuthShell` in `web/src/components/ui/sign-in-flow-1.jsx`) — **true black canvas**, subtle **dot-grid backdrop**, **floating zinc / `#1f1f1f` glass header**, **pill inputs**, and **light-gradient primary CTAs**. All authenticated and guest routes should feel like extensions of that shell.

**Information architecture north star:** a **TradingView-inspired** terminal-lite layout (density, charts, scannability) — see [`docs/PRD-tradingview-style-experience.md`](docs/PRD-tradingview-style-experience.md) for phased scope and acceptance criteria.

---

## 1) Objectives

- **Single visual system** — Same logo glyph, header chrome, borders, typography, and CTA language on home, stock detail, portfolio, briefings, classic, and auth. No “two different apps.”
- **Market-native** — Home and key surfaces read like **terminal lite** (search, tables, lists), not marketing tile grids.
- **Token-driven** — Semantic Tailwind / CSS variables in `web/src/index.css`; charts use `web/src/lib/themeTokens.js` where APIs need raw colors.
- **Accessible** — Focus rings, contrast, reduced motion (see §10).

Functional workflows stay unchanged unless the PRD explicitly migrates them.

---

## 2) Unified chrome specification (match signup)

Use this as the checklist when building or refactoring any screen.

### Canvas & atmosphere

| Element | Specification | Implementation notes |
|--------|----------------|------------------------|
| Page background | `#000` | Dark mode app shell: `AppRoutes` uses `bg-black` + optional `AuthFlowBackdrop` (same dot layer as auth). |
| Dot field | White dots ~12% opacity, 22px grid, slow pulse | `.auth-flow-dot-layer` in `index.css`; respect `prefers-reduced-motion`. |
| Vignette | Radial fade + top gradient | `AuthFlowBackdrop` (reuse behind main app in dark mode). |

### Header & navigation

| Element | Specification | Implementation notes |
|--------|----------------|------------------------|
| Bar style | `border-[#333]`, `bg-[#1f1f1f]/90`, `backdrop-blur-md` | Global `AppHeader` in `App.jsx` mirrors auth navbar material. |
| Brand | **Glyph logo** (four zinc dots) + wordmark **MarketPulse AI** | Shared `MarketPulseGlyphLogo` export from `sign-in-flow-1.jsx`. |
| Nav links | Muted → white stacked hover, keyboard focus ring | Shared `ShellNavLink` (`variant="dark"` \| `"light"`). **Order:** Home, Briefings, Portfolio, Classic. |
| Ghost button | Rounded full, `#333` border, `rgba(31,31,31,0.62)` fill, zinc text | Log In, Logout, theme toggle (dark shell). |
| Primary CTA | `rounded-full` gradient `from-gray-100 to-gray-300`, black text | Sign Up (and analogous primaries). |

Auth-only routes keep the **rounded-full floating** navbar variant from 21st; the **main app** uses a **full-width sticky** bar with the **same colors and components** so the handoff from signup → home is seamless.

### Forms & dense inputs (dashboard)

Align search and sidebar inputs with signup fields:

- **Shape:** `rounded-full` (or very large radius).
- **Fill:** `border-white/10` / `bg-white/[0.06]` equivalent via tokens or `.dark .search-input` / `.dark .watchlist-input` in `dashboard.css`.
- **Focus:** soft white ring / border brightening — no harsh default browser outline only.

### Cards & sections

- **Hairline:** `#333` or `hsl(var(--border))` tuned in `.dark` to ~20% lightness.
- **Panel fill:** ~`#1f1f1f` at **~55% opacity** over black (commodities block, sidebar glass) — see `.dark .commodities-section` / `.dashboard-sidebar` overrides.

### Light mode (optional user preference)

- **Default theme is dark** (matches signup). Users may opt into **light** via the header toggle; storage key `marketpulse-theme` = `"light"` removes `dark` from `<html>`.
- In light mode, skip the full-screen dot backdrop; use semantic `--background` / `--card` from `:root` in `index.css`.
- `ShellNavLink` **`variant="light"`** uses `muted-foreground` / `foreground` stacks and ring tokens instead of white/zinc.

---

## 3) Required stack check

The codebase should support:

- shadcn-style project structure  
- Tailwind CSS  
- TypeScript-ready architecture (app is still JSX)

### Current repo status (`web/`)

- **Tailwind CSS:** enabled  
- **shadcn-compatible paths:** `@/` → `src`, `src/components/ui`  
- **TypeScript:** not migrated app-wide  

### If TypeScript is not enabled

Incremental migration (optional): install TS, add `tsconfig.json`, rename `components/ui` first. Do not block UI work on full TS migration.

---

## 4) Default paths

- App source: `web/src`  
- UI primitives: `web/src/components/ui`  
- Feature screens: `web/src/components`  
- Tokens: `web/src/index.css`  
- Chart helpers: `web/src/lib/themeTokens.js`  
- `cn`: `web/src/lib/utils.js`  

---

## 5) Component integration blueprint

1. **Market table** (`financial-markets-table.jsx`) — screener grid when watchlist data exists.  
2. **Shared primitives** — `button`, `badge`, `card` for grouped surfaces.  
3. **Global shell** — `AppHeader` + `ShellNavLink` + `MarketPulseGlyphLogo`; dark shell backdrop via `AuthFlowBackdrop` when `theme === "dark"` and route is not `/signup` | `/signin`.  
4. **Auth** — `sign-in-flow-1.jsx`: `SignUpAuthShell`, `AuthFlowNavbar`, `AuthFlowBackdrop`.

**Deprecated on home:** the former `financial-dashboard` marketing block — do not reintroduce without PRD review.

### Auth surfaces — 21st.dev “Sign In Flow 1” (Vite port)

**Reference:** [Sign In Flow | 21st.dev](https://21st.dev/community/components/erikx/sign-in-flow-1/default)

**Canonical file:** `web/src/components/ui/sign-in-flow-1.jsx` — exports `SignUpAuthShell`, `AuthFlowBackdrop`, `AuthFlowNavbar`, **`MarketPulseGlyphLogo`**, **`ShellNavLink`**.

**Vite / React Router:** `Link` + `to`; hide global `AppHeader` / `AskMarketPulse` on `/signup` and `/signin` only.

**Signup rules:** username required (2–24, `a-zA-Z0-9_`); `POST /api/auth/signup` body `{ email, password, username }`; header shows username when present.

---

## 6) Implementation guidelines

For each change:

1. Match **§2 Unified chrome** first (colors, borders, pills, logo).  
2. Use semantic tokens; only use raw hex when matching the auth reference or in documented overrides (`dashboard.css` `.dark …`).  
3. Preserve routes, APIs, and data flow.  
4. Validate **dark (default)** and **light (optional)** + reduced motion.

### Website-wide adoption plan

- **Foundation** — `.dark` tokens in `index.css` aligned to black / `#1f1f1f` / `#333`; default theme **dark** (`ThemeContext` + `index.html` inline script).  
- **Shell** — `App.jsx` uses shared logo + `ShellNavLink` + auth-colored header; dark routes get `AuthFlowBackdrop` under content.  
- **Home / dashboard** — `dashboard.css` `.dark` overrides for transparent dashboard canvas, pill search, glass commodities + sidebar.  
- **Other routes** — Portfolio, briefings, stock detail: prefer Tailwind + tokens; extend `.dark` rules if legacy CSS fights the shell.  
- **Classic** — Legacy `ClassicApp` may retain denser layout; it still lives inside the same global shell and theme.

---

## 7) Interaction and elegance rules

- Motion orients and confirms; no gratuitous loops on data-heavy views (backdrop pulse is the exception; it honors reduced motion).  
- High information density with clear rhythm (TradingView benchmark).  
- One primary CTA per **section**; navigation lives in the header.  
- Tabular figures for prices; semantic green/red for deltas only.

---

## 8) Pattern standards

### Market table

Horizontal scroll on small viewports; stable columns; selection + hover; sparklines with reduced-motion fallback.

### Cards

Rounded, bordered panels; use for grouped content (sidebar, settings), not as a home hero.

### Home / terminal lite

No competing feature grids above real data; search stays visually primary.

---

## 9) Theme and color policy

- **Default:** **dark** — matches signup; `html.dark` uses near-black `--background`, ~11% card (≈ `#1f1f1f`), ~20% border (≈ `#333`).  
- **Light:** opt-in; semantic `:root` tokens apply; no dot backdrop on the app shell.  
- Charts: prefer `themeTokens` over ad-hoc hex.  
- Positive / negative semantics stay consistent for market data.

---

## 10) Accessibility and quality gates

Before merge:

- [ ] keyboard-focus visible for all controls  
- [ ] color contrast passes AA for text  
- [ ] no interaction relies on color only  
- [ ] loading and error states visible  
- [ ] light + dark checked where both exist  
- [ ] reduced motion respected (`auth-flow-dot-layer`, `FinancialTable`, Framer usage)  

---

## 11) What is already applied in this repo

- **Default dark theme** — `ThemeContext` + `index.html` flash script (unless user saved `light`).  
- **Unified header** — `AppHeader` uses `MarketPulseGlyphLogo`, `ShellNavLink`, auth-style ghost / gradient CTAs; same nav labels as auth shell.  
- **Dark app shell** — Black page background + `AuthFlowBackdrop` under content (non-auth routes).  
- **Dark token tuning** — `index.css` `.dark` palette aligned to signup chrome.  
- **Home dashboard** — `.dark` overrides in `dashboard.css` for transparent canvas, pill search/watchlist inputs, glass commodities + sidebar.  
- **Shared exports** — `MarketPulseGlyphLogo`, `ShellNavLink` from `sign-in-flow-1.jsx`.  
- Tailwind + `@/` alias; `FinancialTable` reduced motion; auth form `focus-visible` rings.  
- Auth routes full-bleed `SignUpAuthShell`; username signup; **Classic** in global nav.

---

This style guide is the source of truth for **one visual system** anchored on the **signup / sign-in shell**, plus **TradingView-like** information design from the PRD.
