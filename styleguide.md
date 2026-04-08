# MarketPulse AI — UI style guide

This document defines the **visual language** for MarketPulse AI: **black, white, and silver** chrome with semantic tokens, plus **restrained** green/red only where finance UX requires clear up/down or risk cues. Patterns follow **financial markets table**, **glass-style cards**, and **dashboard shell** references from the design brief. **Product behavior is unchanged**; this guide governs **look, tokens, spacing, and motion**.

---

## 0. Implementation status (`web/`)

| Item | Status |
|------|--------|
| Tailwind CSS | **Enabled** — `tailwind.config.js`, `postcss.config.js`, `src/index.css` |
| Design tokens | **`:root` HSL variables** in `src/index.css` (light + `.dark` optional) |
| Legacy CSS | `styles.css`, `styles/dashboard.css`, `auth.css`, `briefings.css`, `ask-marketpulse.css` consume `hsl(var(--…))` |
| Path alias `@/*` | `vite.config.js` + `jsconfig.json` → `src/*` |
| `cn()` helper | `src/lib/utils.js` (`clsx` + `tailwind-merge`) for new Tailwind-heavy UI |
| shadcn primitives | Optional — add under `src/components/ui/` when you introduce registry components |

Entry CSS order: `main.jsx` imports `index.css` then `styles.css`.

---

## 1. Brand palette — monochrome chrome

**Primary experience:** near-black headers and CTAs, white/off-white surfaces, zinc/silver borders and secondary text.

- **Do not** use purple/blue gradients for brand chrome (legacy removed).
- **Silver** is expressed as `muted`, `border`, `accent`, and `ring` — not metallic effects unless a specific component (e.g. liquid glass) calls for it.
- **Green / red** are **secondary**: reserved for performance, risk, and candle/support/resistance semantics so numbers stay scannable.

### 1.1 CSS variables (source of truth)

Defined in `src/index.css` (`:root` and `.dark`):

| Token | Role |
|-------|------|
| `--background` | Page wash (cool gray-white) |
| `--foreground` | Primary text (near black) |
| `--card` / `--card-foreground` | Raised panels |
| `--primary` / `--primary-foreground` | Primary buttons, inverse text on dark fills |
| `--primary-hover` | Darken slightly for hovers / gradient end |
| `--secondary` / `--secondary-foreground` | Subtle fills (silver-gray) |
| `--muted` / `--muted-foreground` | Table headers, hints, disabled tone |
| `--accent` / `--accent-foreground` | Hover highlights, silver emphasis |
| `--border` / `--input` | Hairlines and fields |
| `--ring` | Focus rings (graphite/silver, not blue) |
| `--destructive` / `--destructive-foreground` | Errors and strong danger text |
| `--chrome` / `--chrome-foreground` / `--chrome-muted` | Top bar / marketing hero (near-black → graphite gradient) |
| `--positive` / `--negative` | Market direction (desaturated green/red) |

Tailwind maps these in `tailwind.config.js` (e.g. `bg-background`, `text-muted-foreground`, `border-border`).

---

## 2. Default paths

| Asset | Path |
|-------|------|
| App source | `web/src/` |
| UI primitives (shadcn-style) | **`web/src/components/ui/`** |
| Feature screens | `web/src/components/` |
| Tokens | `web/src/index.css` |
| Utilities | `web/src/lib/utils.js` |

### Why `components/ui/`

Keeps shadcn CLI output predictable, separates **primitives** from **routes/features**, and avoids one-off styling drift.

---

## 3. Using tokens in CSS and JSX

### 3.1 Legacy CSS

Use **`hsl(var(--token))`** or modern alpha: **`hsl(var(--destructive) / 0.12)`** (no comma in `hsl()`).

### 3.2 Tailwind (new or refactored JSX)

Prefer utilities: `bg-card`, `text-foreground`, `rounded-2xl`, `border border-border/50`, `shadow-card`, `text-muted-foreground`, `text-positive`, etc.

### 3.3 Performance and money

- **Up / positive:** `text-positive`, pills `bg` with `hsl(var(--positive) / 0.12)` and border `hsl(var(--positive) / 0.35)`.
- **Down / risk:** `text-negative` or `destructive` family for strong warnings.
- Avoid rainbow **chart** palettes; use **grayscale series** (`#18181b` → `#a1a1aa`) and only green/red for support/resistance or bullish/bearish markers where necessary.

### 3.4 Focus and inputs

`border-input`, `focus-visible:ring-2 ring-ring`, `ring-offset-background`. **No** default blue focus halo.

---

## 4. Pattern A — Market table

- Outer: `max-w-7xl`, inner card `bg-card border border-border/50 rounded-2xl overflow-hidden`.
- Horizontal scroll: `overflow-x-auto`, inner `min-w-[1000px]`.
- Header row: uppercase, `text-muted-foreground`, `bg-muted/15`, `border-b border-border/20`.
- Rows: `hover:bg-muted/30`, selected `bg-muted/50`.
- Metric pills: bordered, token-based positive/negative (§3.3).

---

## 5. Pattern B — Cards (incl. glass)

- Default cards: `rounded-xl` or `rounded-2xl`, `border`, `shadow-card` / `shadow-card-lg`.
- Glass variants: keep displacement filter ids unique per view; shadows use neutral blacks/whites, not violet glow.

---

## 6. Pattern C — Dashboard shell

- Shell: `bg-card rounded-2xl border shadow-sm`, generous padding `p-4 md:p-6`.
- Search: icon + input + optional `kbd` for shortcuts; `bg-background`, silver border.
- Quick actions: grid, circular icon wells `bg-muted`, `group-hover:bg-background`.
- Lists: mono amounts; positive/negative pills (§3.3).

---

## 7. Global chrome

- **App header** (`styles.css` `.app-header`): graphite gradient using `--chrome` and zinc stops, **light bottom border**, white/light text via `--chrome-foreground`.
- **Dashboard hero** (`.dashboard-header`): same chrome language as app header.
- **Auth** (`.auth-container`): **light** silver gradient — `background` → `muted` → soft zinc highlight (no purple).

---

## 8. Motion and a11y

| Tool | Use |
|------|-----|
| Framer Motion | Optional stagger; keep subtle |
| `prefers-reduced-motion` | Shorten or disable nonessential motion |

---

## 9. Icons

Prefer **lucide-react** for new work; emoji may remain in legacy copy but prefer SVG/icons for new features.

---

## 10. Dependencies (`web/package.json`)

| Concern | Packages |
|---------|----------|
| Tailwind | `tailwindcss`, `postcss`, `autoprefixer` |
| Class merge | `clsx`, `tailwind-merge` |
| Future shadcn | `class-variance-authority`, `@radix-ui/react-slot`, etc. |

---

## 11. Audit checklist

- [ ] No purple/blue **brand** gradients on headers or auth.
- [ ] Surfaces use **semantic** tokens, not raw hex in new code.
- [ ] Tables/lists scroll horizontally on small viewports when dense.
- [ ] Gains/losses use **shared** positive/negative rules.
- [ ] Focus states visible and **graphite/silver**, not default browser blue.
- [ ] Charts use **monochrome series** unless an exception is documented.

This guide is the **single reference** for MarketPulse AI UI: **monochrome chrome**, **token-driven** styling, and **preserved product behavior**.
