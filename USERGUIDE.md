# MarketPulse AI User Guide

## Overview

This guide reflects the current MarketPulse AI experience, centered on transaction-based portfolio tracking and benchmark comparison.

You can:
- Add buy/sell trades with explicit trade dates
- Track current holdings derived from transaction history
- View allocation by symbol in a donut chart
- Compare portfolio return against major market indexes
- Access portfolio symbols directly from the dashboard sidebar

## Walkthrough

### 1) Dashboard: portfolio section under watchlist
![Dashboard Portfolio Sidebar](docs/images/15-dashboard-portfolio-sidebar.png)

What this section does:
- Shows your current portfolio symbols and quantities
- Lets you jump to a symbol detail view quickly
- Provides a `Manage` action to open the full portfolio page

Use this when:
- You want a quick snapshot of what you currently hold
- You want one-click navigation from dashboard to portfolio workflow

---

### 2) Portfolio page overview
![Portfolio Overview](docs/images/11-portfolio-overview.png)

Main areas on this page:
- Portfolio summary cards (positions, market value, gain/loss)
- Allocation chart area
- Portfolio vs market comparison chart
- Transactions and derived holdings tables

---

### 3) Add buy/sell transactions
![Add Transaction Form](docs/images/12-portfolio-add-transaction-form.png)

Required inputs:
- Side: `Buy` or `Sell`
- Symbol: e.g., `AAPL`
- Quantity: positive numeric value
- Trade date: used for time-accurate performance replay

Optional input:
- Trade price: if omitted, current price is fetched for the symbol

Validation behavior:
- Sell quantity cannot exceed your current held quantity for that symbol
- Invalid symbol/quantity shows a user-facing validation message

---

### 4) Allocation donut
![Allocation Donut](docs/images/13-portfolio-allocation-donut.png)

How allocation is calculated:
- Uses current derived holdings
- Computes each symbol weight as percentage of total market value
- Updates automatically after each transaction

---

### 5) Portfolio vs market comparison
![Portfolio vs Market Comparison](docs/images/14-portfolio-vs-market-comparison.png)

Benchmarks shown:
- DJIA
- NASDAQ
- S&P 500
- Russell 2000

How performance is computed:
- Portfolio value is replayed over time using transaction dates and historical prices
- Return series is normalized from the first valid baseline date
- Chart updates whenever transactions change

---

### 6) Transaction history
![Transaction History](docs/images/16-portfolio-transaction-history.png)

Each row records:
- Side (`BUY` or `SELL`)
- Date
- Symbol
- Quantity
- Price
- Total

Use this table to audit your full trade history and ensure data accuracy.

---

### 7) Derived holdings
![Derived Holdings](docs/images/17-portfolio-derived-holdings.png)

This table is not manually edited. It is derived from transaction history and shows:
- Current quantity per symbol
- Average cost basis
- Market value
- Unrealized gain/loss metrics

This approach keeps holdings consistent with your ledger and avoids drift.

## Getting started

### 1. Install

```bash
npm install
npm run install:all
```

### 2. Optional environment setup

```bash
cp .env.example server/.env
```

### 3. Run the app

```bash
npm run dev
```

### 4. Open
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

## Routing note

The app uses hash-based routing for refresh-safe navigation, so deep links look like:

```text
http://localhost:5173/#/portfolio
http://localhost:5173/#/stock/AAPL
```

## API quick reference

- `GET /api/health`
- `GET /api/companies`
- `GET /api/analyze`
- `GET /api/analyze/:symbol`

Example:

```bash
curl "http://localhost:4000/api/analyze/AAPL?markers=10&perIndicator=3"
```

## Data model note

Portfolio persistence uses a transaction-ledger model in localStorage per signed-in user.

- Source of truth: transaction rows
- Derived view: current holdings table
- Legacy holdings format is auto-migrated to transaction model

## Troubleshooting

### App does not start
- Reinstall dependencies: `npm run install:all`
- Check port usage for `4000` and `5173`

### Backend responds but charts/data are missing
- Verify: `curl http://localhost:4000/api/health`
- Ensure network access for market/news upstream data

### Portfolio looks inconsistent
- Check transaction rows first (they are the source of truth)
- Remove or correct erroneous transaction entries

## Disclaimer

MarketPulse AI is for educational/demo purposes only and is not financial advice.

For issues, questions, or contributions:
- GitHub Issues: https://github.com/EltonChang1/MarketPulse-AI/issues
- See README.md for additional setup information
- Check the codebase documentation for developer details
