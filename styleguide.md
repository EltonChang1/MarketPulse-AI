# MarketPulse AI — 21st-style UI integration style guide

This guide defines how to apply a complete UI refresh inspired by **21st.dev-style interactive financial components** while preserving all current product behavior (APIs, auth, routing, data logic).

---

## 1) Objective

Build a **new visual layer** for MarketPulse AI that is:

- interactive (motion, hover/focus feedback, responsive controls),
- classy and elegant (clear hierarchy, refined spacing, premium components),
- production-friendly (tokenized, accessible, maintainable).

All functional workflows must remain unchanged.

---

## 2) Required stack check

The codebase should support:

- shadcn-style project structure
- Tailwind CSS
- TypeScript-ready architecture

### Current repo status (`web/`)

- **Tailwind CSS:** enabled
- **shadcn-compatible paths:** enabled via alias (`@/*`) and `src/components/ui`
- **TypeScript:** not yet migrated app-wide (current app is JSX)

### If TypeScript is not enabled

Use this migration path (incremental):

1. Install `typescript`, `@types/react`, `@types/react-dom`
2. Add `tsconfig.json`
3. Rename files progressively (`.jsx` -> `.tsx`)
4. Start with UI primitives in `src/components/ui`

Do not block UI refresh on full TS migration; migrate safely in slices.

---

## 3) Default paths

Use these paths as canonical:

- App source: `web/src`
- UI primitives: `web/src/components/ui`
- Feature screens: `web/src/components`
- Tokens and theme: `web/src/index.css`
- Utility helper (`cn`): `web/src/lib/utils.js` (or `.ts` after TS migration)

### Why `/components/ui` is important

If default path is not `/components/ui`, create it. This keeps:

- predictable imports (`@/components/ui/...`),
- compatibility with shadcn/21st snippets,
- strict separation between primitives and business features.

---

## 4) Component integration blueprint

The style language follows these three anchor components:

1. **Market table** (`financial-markets-table`)
2. **Score cards** (`financial-score-cards` + liquid dependencies)
3. **Dashboard shell** (`financial-dashboard`)

### 4.1 Installation dependencies

Install in `web/`:

```bash
npm install framer-motion lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-slot
```

If using Next.js `next-themes`, replace with local theme provider in Vite (already done in this repo with `ThemeContext` + `dark` class on `<html>`).

### 4.2 Files to place in `src/components/ui`

- `financial-markets-table.tsx` (or `.jsx` in current repo)
- `financial-score-cards.tsx`
- `financial-dashboard.tsx`
- `liquid-glass-button.tsx`
- `liquid-glass-card.tsx`
- `badge.tsx`
- `button.tsx`

### 4.3 Demo placement

Place demos in route-level components (or `src/pages`) for visual QA only.  
Do not duplicate production data logic in demos.

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

0. Copy component into `src/components/ui`
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
- Ensure all new UI uses semantic classes (`bg-*`, `text-*`, `border-*`)

### Phase B — Primary surfaces

- Home/dashboard adopts:
  - financial dashboard shell pattern,
  - market table pattern,
  - refined cards/list surfaces.
- Existing search/watchlist/portfolio behavior remains unchanged.

### Phase C — Detail and portfolio screens

- Refactor detail panels and controls to match shared card/button/input patterns
- Keep charting engines and analysis logic unchanged

### Phase D — QA and consistency

- Focus states everywhere
- Keyboard navigation intact
- Motion reduced when preferred
- Dark mode visual parity

---

## 7) Interaction and elegance rules

Use these rules across all pages:

- Motion is meaningful: orient, reveal, confirm
- Hover/active states are subtle, not noisy
- Information density is high but breathable
- One primary CTA per section
- Numeric data has stable alignment and clear emphasis

---

## 8) Pattern standards

### Market table standard

- Horizontal scroll container for dense columns
- Stable grid columns across header and rows
- Selection state + hover state
- Performance chips for percentages
- Sparkline animations with reduced-motion fallback

### Card standard

- Unified card rhythm (`rounded`, `border`, `shadow`, padding scale)
- Optional liquid glass cards for premium sections only
- Badge and button variants from shared primitives

### Dashboard standard

- Command-style search strip
- Quick actions grid
- Recent activity list
- Financial services list with optional premium/action affordances

---

## 9) Theme and color policy

This guide **does not lock** the product to a fixed palette.

- Use semantic tokens for all new UI.
- Keep positive/negative semantics consistent for market data.
- Brand palette can evolve without rewriting components.

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
- Interactive dashboard and market table patterns integrated into Home while keeping existing functionality

---

This style guide is the source of truth for implementing and scaling the 21st-style MarketPulse UI refresh across the entire website without changing business logic.
