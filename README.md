# MarketPulse AI

MarketPulse AI is a full-stack stock analysis and portfolio tracking application.

The current release focuses on a transaction-ledger portfolio workflow: users record buy/sell activity with trade dates, derive holdings from that ledger, and compare portfolio performance against major US indexes.

## What This Version Delivers

- Transaction-based portfolio tracking (`buy`/`sell` with date, quantity, price)
- Time-accurate performance replay from historical trades
- Allocation donut chart based on current derived holdings
- Benchmark comparison against DJIA, NASDAQ, S&P 500, and Russell 2000
- Dashboard integration showing portfolio symbols under watchlist
- Refresh-safe hash routing for deep-linked pages

## Screenshot Tour (In Order)

### 11) Portfolio Overview
![Portfolio Overview](docs/images/11-portfolio-overview.png)

### 12) Add Transaction Form
![Add Transaction Form](docs/images/12-portfolio-add-transaction-form.png)

### 13) Allocation Donut
![Allocation Donut](docs/images/13-portfolio-allocation-donut.png)

### 14) Portfolio vs Market Comparison
![Portfolio vs Market Comparison](docs/images/14-portfolio-vs-market-comparison.png)

### 15) Dashboard Portfolio Sidebar
![Dashboard Portfolio Sidebar](docs/images/15-dashboard-portfolio-sidebar.png)

### 16) Transaction History
![Transaction History](docs/images/16-portfolio-transaction-history.png)

### 17) Derived Holdings
![Derived Holdings](docs/images/17-portfolio-derived-holdings.png)

## Architecture

- `web/` — React + Vite frontend
- `server/` — Express API and market analysis pipeline
- `docs/images/` — documentation image assets used by README and USERGUIDE

## Tech Stack

- Frontend: React, Vite, React Router, Axios, lightweight-charts
- Backend: Node.js, Express, Axios, technicalindicators
- Data: market data + technical analysis + news/sentiment pipeline
- Persistence: browser localStorage (portfolio scoped by user key)

## Quick Start

### 1) Install dependencies

```bash
npm install
npm run install:all
```

### 2) Optional environment setup

```bash
cp .env.example server/.env
```

### 3) Run frontend and backend

```bash
npm run dev
```

### 4) Open locally

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`

## Routes

- Dashboard: `http://localhost:5173/#/`
- Portfolio: `http://localhost:5173/#/portfolio`
- Stock detail example: `http://localhost:5173/#/stock/AAPL`

## API Endpoints

- `GET /api/health`
- `GET /api/companies`
- `GET /api/analyze`
- `GET /api/analyze/:symbol`

Example:

```bash
curl "http://localhost:4000/api/analyze/AAPL?markers=10&perIndicator=3"
```

## Portfolio Data Model

Portfolio state uses a transaction-ledger model:

- Source of truth: transaction rows
- Derived state: current holdings and allocation
- Migration: legacy holdings are auto-converted to transaction rows

## Documentation

- User guide: `USERGUIDE.md`
- Screenshot index: `docs/images/README.md`

## Disclaimer

This project is for educational/demo purposes and is not financial advice.
