# MarketPulse AI — User Guide

This guide reflects the **current** web app: unified dark/light shell, home “terminal lite” layout, portfolio analytics, **Classic** legacy workspace, and deep **stock analysis** (predictions, reversal signals, TradingView charting, news). **Research Briefings** are no longer exposed in the UI.

## Screenshot index

One-page map of all figures: **thumbnail** (scaled) + **caption**. Full-resolution files live in [`docs/images/`](docs/images/) (see [`docs/images/README.md`](docs/images/README.md)).

| Thumbnail | Caption |
|:----------|:--------|
| <img src="docs/images/1.Signup_page.png" width="200" alt="Figure 1 signup" /> | **1 — Sign up** — Auth shell: dot backdrop, pill nav, username/email/password, Sign up CTA. |
| <img src="docs/images/2.watchlist_banner.png" width="200" alt="Figure 2 watchlist screener" /> | **2 — Watchlist screener** — Home: search, watchlist table (sparklines), sidebar list + add ticker. |
| <img src="docs/images/3.Market_Overview.png" width="200" alt="Figure 3 market overview" /> | **3 — Market overview** — Index cards, mini candles, + Watchlist / View Analysis, portfolio strip in sidebar. |
| <img src="docs/images/4.Stocks_with_market_movers.png" width="200" alt="Figure 4 market movers" /> | **4 — Movers** — Featured stock cards + Most Active / Gainers / Losers / IPO columns. |
| <img src="docs/images/5.User_portfolio.png" width="200" alt="Figure 5 portfolio" /> | **5 — Portfolio** — Add transaction, performance tiles, allocation donut, vs-indexes line chart. |
| <img src="docs/images/6.User_holdings%26transaction.png" width="200" alt="Figure 6 holdings and transactions" /> | **6 — Holdings & history** — Positions table + transaction log (buy/sell pills, delete). |
| <img src="docs/images/7.Individual_stock_with_prediction.png" width="200" alt="Figure 7 stock predictions" /> | **7 — Predictions** — Symbol header, period tiles, forecast strip (price, move, direction, confidence). |
| <img src="docs/images/8.Interactive_stock_chart_from_tradingview.png" width="200" alt="Figure 8 TradingView chart" /> | **8 — TradingView (Classic)** — Full embed: intervals, candles, volume, drawings, ranges. |
| <img src="docs/images/9.Individual_stock_key_signals.png" width="200" alt="Figure 9 reversal intelligence" /> | **9 — Reversal intelligence** — Bollinger/RSI/volume/ATR/Fib/touches/divergence cards. |
| <img src="docs/images/10.Prediction_reasoning.png" width="200" alt="Figure 10 prediction reasoning" /> | **10 — Prediction reasoning** — Weighted signal model + pattern matches list. |
| <img src="docs/images/11.Technical_indicators.png" width="200" alt="Figure 11 technical indicators" /> | **11 — Technical indicators** — MAs, momentum, Bollinger, trend/volume grid. |
| <img src="docs/images/12.Comprehensive_analysis.png" width="200" alt="Figure 12 comprehensive analysis" /> | **12 — Comprehensive analysis** — Summary, news sentiment, risks, opportunities. |
| <img src="docs/images/13.Latest_news.png" width="200" alt="Figure 13 latest news" /> | **13 — Latest news** — Headlines, timestamps, sources for the symbol. |

---

## Table of contents

1. [Screenshot index](#screenshot-index)
2. [What MarketPulse does](#what-marketpulse-does)
3. [Accounts & sign-in](#accounts--sign-in)
4. [Global navigation & theme](#global-navigation--theme)
5. [Home dashboard](#home-dashboard)
6. [Portfolio](#portfolio)
7. [Stock analysis (detail page)](#stock-analysis-detail-page) — includes **Classic / TradingView** (figure 8)
8. [Ask AI](#ask-ai)
9. [Run locally](#run-locally)
10. [Routes](#routes)
11. [API quick reference](#api-quick-reference)
12. [Troubleshooting](#troubleshooting)
13. [Disclaimer](#disclaimer)

---

## What MarketPulse does

MarketPulse AI helps you:

- Scan markets and your **watchlist** from one home screen.
- Add symbols from **market cards** to your watchlist (when signed in).
- Track a **manual portfolio** (transactions, allocation, performance vs major indexes).
- Open any symbol for **multi-horizon predictions**, **reversal-style signals**, **technical indicators**, **AI-style narrative analysis**, and **news**.
- Use **Classic** for the original grid + full **TradingView** widget workflow.
- Chat with context via **Ask AI** (watchlist/portfolio-aware when signed in).

Educational and informational use only — not financial advice.

---

## Accounts & sign-in

![Create account — signup shell](docs/images/1.Signup_page.png)

**Figure 1 — Signup page**

- Full-screen **black** canvas with a subtle **dot grid** and centered auth layout (same visual language as the rest of the app in dark mode).
- Top **pill navigation**: logo (four dots), **Home**, **Portfolio**, **Classic**, and **Log in**.
- **Create account** collects **Username** (shown in the header when you’re signed in), **email**, **password**, and **confirm password**. Pill-shaped fields; primary **Sign up** button.
- Footer links to **Sign in** and a short responsibility disclaimer.

**Sign in** uses the same shell (route `/signin`). Guests can browse many areas; **watchlist persistence** and **portfolio** tied to the account expect you to be logged in where noted below.

---

## Global navigation & theme

- **Header** (all main routes): **MarketPulse AI** + **Home** · **Portfolio** · **Classic**; **Dark** / **Light** toggle; **Log in** / **Sign up** or avatar, display name, **Logout**.
- **Hash routing** (e.g. `http://localhost:5173/#/portfolio`).
- **Ask AI** appears as a floating button on most pages when the feature is enabled.

---

## Home dashboard

The home experience is built around **search**, a **watchlist screener** (when you have symbols and are signed in), **market sections**, and a **right sidebar**.

### Watchlist screener & search

![Home — watchlist screener and sidebar](docs/images/2.watchlist_banner.png)

**Figure 2 — Watchlist screener**

- **Search** bar: find stocks by ticker or company name; choosing a result opens that symbol’s analysis page.
- **Watchlist screener** table: columns such as name/ticker, **last** price, **change**, **change %**, **volume**, **market cap**, and a small **sparkline**. Row interactions align with opening the symbol.
- **My Watchlist** sidebar: compact rows with price and change; **remove** (✕); expand/collapse; field to **add a ticker** (Enter to add).

### Market overview

![Market overview — indices and cards](docs/images/3.Market_Overview.png)

**Figure 3 — Market overview**

- Section **Market Overview** with subtitle about commodities and indices.
- **Market indicators** as **cards**: symbol, type, name, **mini candlestick** strip, last price, day **change %** (green/red).
- Each card: **+ Watchlist** (or **In watchlist**) and **View Analysis →** to open the stock page.
- Sidebar: **My Watchlist** and **My Portfolio Stocks** (quantities, **Manage** to open portfolio, **View** on rows).

### Featured stocks & movers

![Stocks and market movers](docs/images/4.Stocks_with_market_movers.png)

**Figure 4 — Cards and movers**

- **Large cards** for highlighted names (e.g. MSFT, AMZN): candles, price, % change, **+ Watchlist** and **View Analysis**.
- **Market Movers**: four columns — **Most Active**, **Most Gainers**, **Most Losers**, **Biggest IPO This Month** (may be empty if no data).

---

## Portfolio

Route: **`/#/portfolio`**. Tracks **your** transactions and derives holdings, P/L, allocation, and a **vs indexes** chart.

### Summary, allocation, and benchmark chart

![Portfolio — transactions, performance, allocation, comparison chart](docs/images/5.User_portfolio.png)

**Figure 5 — My Portfolio (overview)**

- **Add Transaction**: side (buy/sell), symbol, quantity, optional price (else live quote), date → **Add Transaction**.
- **Portfolio performance**: total cost basis, current value, gain/loss, total return (%).
- **Allocation**: **donut** with **color-coded** slices and a **legend** (symbol + %). Center shows total value.
- **Portfolio vs Market Indexes**: **multi-line** chart (portfolio + DJIA, NASDAQ, S&P 500, Russell 2000) with a clear **legend**; grid and 0% reference for reading relative performance.

### Holdings & history

![Holdings and transaction history](docs/images/6.User_holdings%26transaction.png)

**Figure 6 — Holdings & transactions**

- **Holdings** table: symbol, quantity, average buy, current price, market value, gain/loss, return (green/red).
- **Transaction History**: date, **BUY**/**SELL** pill, symbol, qty, price, total, **Delete** to remove a line (holdings recompute).

**Back to Dashboard** returns to home.

---

## Stock analysis (detail page)

Open via **View Analysis**, search, watchlist row, or **`/#/stock/SYMBOL`**. The figures below follow the **on-page sections** (predictions → reversal → reasoning → indicators → narrative → news). **Figure 8** is captured from **`/#/classic`** (full **TradingView** workspace) and is placed here so numeric screenshot order stays **1–13**.

### Price, watchlist, and prediction horizons

![Stock page — prediction periods and forecast](docs/images/7.Individual_stock_with_prediction.png)

**Figure 7 — Predictions**

- **Back** to prior context; title **Company (TICKER)**; last price and **day change**; **Add to watchlist** when signed in.
- **Select prediction period**: cards for **1 Week** through **1 Year** with projected price and % move; one period is **selected** (emphasized border).
- **Forecast** strip: predicted price, expected move, **direction** (e.g. bullish), **confidence** %.

### Classic — interactive TradingView chart

![Classic — TradingView interactive chart](docs/images/8.Interactive_stock_chart_from_tradingview.png)

**Figure 8 — Interactive TradingView chart**

- Route **`/#/classic`**: legacy **watchlist chips**, filters, sort, and **card grid** of symbols; this shot shows the embedded **TradingView** panel for **NVDA** (or your selected symbol).
- **Toolbar**: symbol search, intervals (e.g. **1D**), chart type (**Candles**), **Indicators**, snapshot; **OHLC** + last change; **drawing tools** rail; **volume** histogram; range shortcuts (**1M**, **3M**, **YTD**, …); **ADJ** / settings.
- Stock **detail** pages also include charting; use **Classic** when you want this **full TradingView** layout alongside the older dashboard workflow.

### Reversal intelligence (“key signals”)

![Reversal intelligence dashboard](docs/images/9.Individual_stock_key_signals.png)

**Figure 9 — Reversal intelligence**

Cards summarize **trend / reversal context**, for example:

- **Channel position (Bollinger)** — where price sits in the band (e.g. upper half / % of channel).
- **RSI (14)** — zone (oversold / neutral / overbought) with numeric RSI.
- **Volume vs 20-day average** — multiple of average and commentary.
- **ATR** — weekly/monthly typical range vs price.
- **Fibonacci retracement** — key levels vs current price.
- **Channel touch counts** — upper/lower band touches over recent bars.
- **RSI vs Stochastic** — whether oscillators **agree** or diverge.

### How predictions are built + patterns

![Prediction reasoning and pattern matches](docs/images/10.Prediction_reasoning.png)

**Figure 10 — Prediction reasoning**

- Expandable **“How is this prediction calculated?”**: explains **weighted blend** of signals (e.g. regression trend, MACD, MA crosses, stochastic, RSI), **ADX** scaling, **horizon** scaling, and **ATR** caps.
- **Pattern matches used in prediction**: named patterns (e.g. Aroon, MACD cross, OBV divergence) with short descriptions.

### Technical indicators (numeric grid)

![Technical indicators — four columns](docs/images/11.Technical_indicators.png)

**Figure 11 — Technical indicators**

- **Moving averages** — SMA 5 / 20 / 50 / 200.
- **Momentum** — RSI, MACD line/signal/histogram, Stochastic %K / %D.
- **Bollinger Bands** — upper, middle, lower.
- **Trend + volume** — ADX, DI+/DI−, Aroon, OBV, A/D line, ATR, etc.

### Comprehensive analysis

![Comprehensive analysis — four quadrants](docs/images/12.Comprehensive_analysis.png)

**Figure 12 — Comprehensive analysis**

- **Financial summary** — price + short technical narrative.
- **News analysis** — synthesis from recent headlines with **sentiment** badge (e.g. positive + confidence).
- **Risk factors** — bullet risks (red accent).
- **Opportunities** — bullet positives (green accent).

### Latest news

![Latest news list](docs/images/13.Latest_news.png)

**Figure 13 — Latest news**

- **Latest News**: scrollable list of **headlines**, **timestamps**, and **sources**; opens external reporting when you use the links in the app.

---

## Ask AI

- **Ask AI** (floating control): opens a panel to **chat** with the assistant.
- Context can include the **current stock route** (if you are on `/stock/...`), your **watchlist**, and **portfolio** when authenticated.
- Responses may stream; tool usage may appear in the UI. Not financial advice.

---

## Run locally

### Install

```bash
npm install
npm run install:all
```

### Optional environment

```bash
cp .env.example server/.env
```

### Start

```bash
npm run dev
```

### URLs

- Frontend: `http://localhost:5173` (or `5173` per Vite)
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`

---

## Routes

| Path | Purpose |
|------|---------|
| `/#/` | Home — search, screener (if watchlist), market sections, sidebar |
| `/#/signup` | Create account |
| `/#/signin` | Sign in |
| `/#/portfolio` | Portfolio manager and performance |
| `/#/stock/:symbol` | Full stock analysis for `symbol` |
| `/#/classic` | Legacy dashboard + TradingView-friendly workflow |
| `/#/briefings` | Redirects to home (feature removed from UI) |

---

## API quick reference

- `GET /api/health`
- `GET /api/analyze?symbols=...` — batch analysis for watchlist-style data
- `GET /api/analyze/:symbol` — single symbol detail
- `GET /api/commodities-etfs` — market overview payload for home sections
- `POST /api/auth/signup` | `POST /api/auth/signin` — auth
- Watchlist endpoints (authenticated) under `/api/watchlist/...`

Example:

```bash
curl "http://localhost:4000/api/analyze/AAPL?markers=10&perIndicator=3"
```

---

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| App won’t start | `npm run install:all`; free ports **4000** and **5173** |
| No data | `curl http://localhost:4000/api/health`; check server logs and env keys for data providers |
| Watchlist not saving | Sign in; watchlist is stored per account via API |
| Chart or analysis incomplete | Refresh; retry symbol; check upstream quote/analysis errors in server logs |

---

## Disclaimer

MarketPulse AI is for **education and demonstration** only. It is **not** investment, tax, or legal advice. Past performance and model outputs do not guarantee future results. Always do your own research before making financial decisions.
