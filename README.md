# MarketPulse AI

MarketPulse AI is a full-stack stock analysis app with a portfolio tracker built on a transaction ledger.

It helps users:
- Track portfolio positions from buy/sell history (with trade dates)
- View allocation by symbol
- Compare portfolio performance against major market indexes
- Keep portfolio symbols visible on the main dashboard under watchlist

## What is new in this version

- Portfolio page with transaction-first workflow (buy/sell + date + price)
- Time-accurate performance replay across multiple buys and sells
- Allocation donut chart by current holdings weight
- Benchmark comparison against DJIA, NASDAQ, S&P 500, and Russell 2000
- Dashboard sidebar section for portfolio symbols

## Screenshots (latest)

### Portfolio overview
![Portfolio Overview](docs/images/11-portfolio-overview.png)

### Add buy/sell transaction
![Add Transaction Form](docs/images/12-portfolio-add-transaction-form.png)

### Allocation donut
![Allocation Donut](docs/images/13-portfolio-allocation-donut.png)

### Portfolio vs market comparison
![Portfolio vs Market Comparison](docs/images/14-portfolio-vs-market-comparison.png)

### Dashboard portfolio section under watchlist
![Dashboard Portfolio Sidebar](docs/images/15-dashboard-portfolio-sidebar.png)

### Transaction history
![Transaction History](docs/images/16-portfolio-transaction-history.png)

### Derived holdings
![Derived Holdings](docs/images/17-portfolio-derived-holdings.png)

## Tech stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Data & analysis: Yahoo market data, technical indicator pipeline, news/sentiment integration
- Persistence: Browser localStorage (portfolio model scoped by signed-in user)

## Project structure

- `server/` — API, analysis pipeline, auth/watchlist routes
- `web/` — dashboard, stock detail, portfolio UI
- `docs/images/` — current screenshot assets used by docs

## Quick start

1. Install dependencies

```bash
npm install
npm run install:all
```

2. Optional server env setup

```bash
cp .env.example server/.env
```

3. Start backend + frontend

```bash
npm run dev
```

4. Open locally
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`

## Core API endpoints

- `GET /api/health`
- `GET /api/companies`
- `GET /api/analyze`
- `GET /api/analyze/:symbol`

## Documentation

- Product walkthrough: `USERGUIDE.md`
- Screenshot index: `docs/images/README.md`

## Notes

- Portfolio data is persisted in localStorage in a transaction model and derived into current holdings.
- Existing legacy holdings data is migrated to transaction format automatically.
- This project is for educational/demo use and not financial advice.
