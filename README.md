# MarketPulse AI

MarketPulse AI is a full-stack market intelligence and portfolio platform.

Feel free to check it out here: [text](https://marketpulse-ai-rho.vercel.app/)

It combines market overview data, commodities, top company tracking, watchlists, personal portfolio analytics, and deep single-stock analysis (charting, signals, prediction calculations, and AI summaries).

## What the Website Can Do

- Show a live market overview with quick context for current conditions
- Track commodities alongside equities for broader macro awareness
- Surface the largest companies and market movers in one dashboard
- Let users maintain a watchlist and jump quickly to detail pages
- Let users manage a personal portfolio and inspect position-level details
- Provide individual stock intelligence:
  - chart review
  - reversal/pattern signals
  - prediction calculations
  - technical indicators
  - comprehensive AI-style analysis

## Product Walkthrough

### 1) Market Overview
![Market Overview](docs/images/1-market-overview.png)

### 2) Commodities
![Commodities](docs/images/2-commodities.png)

### 3) Largest Companies
![Largest Companies](docs/images/3-largest-companies.png)

### 4) Market Movers
![Market Movers](docs/images/4-market-movers.png)

### 5) Watchlist Sidebar
![Watchlist Sidebar](docs/images/5-watchlist-sidebar.png)

### 6) Personal Portfolio
![Personal Portfolio](docs/images/6-personal-portfolio.png)

### 7) Portfolio Details
![Portfolio Details](docs/images/7-portfolio-details.png)

### 8) Individual Stock Review
![Individual Stock Review](docs/images/8-individual-stock-review.png)

### 9) Individual Stock Chart
![Individual Stock Chart](docs/images/9-individual-stock-chart.png)

### 10) Individual Stock Reversal Intelligence
![Individual Stock Reversal Intelligence](docs/images/10-individual-stock-reversal-intelligence.png)

### 11) Individual Stock Prediction Calculation
![Individual Stock Prediction Calculation](docs/images/11-individual-stock-prediction-calculation.png)

### 12) Individual Stock Pattern Match
![Individual Stock Pattern Match](docs/images/12-individual-stock-pattern-match.png)

### 13) Individual Stock Technical Indicators
![Individual Stock Technical Indicators](docs/images/13-individual-stock-technical-indicators.png)

### 14) Individual Stock Comprehensive Analysis
![Individual Stock Comprehensive Analysis](docs/images/14-individual-stock-comprehensive-analysis.png)

## Architecture

- `web/` — React + Vite frontend
- `server/` — Node.js + Express backend and analysis services
- `docs/images/` — documentation screenshots used in this README and USERGUIDE

## Tech Stack

- Frontend: React, Vite, React Router, Axios, lightweight-charts
- Backend: Node.js, Express, Axios, technicalindicators
- Data pipeline: market feeds, technical analysis, and analysis/signal orchestration
- Persistence: localStorage for user-side state (watchlist/portfolio context)

## Quick Start

### 1. Install dependencies

```bash
npm install
npm run install:all
```

### 2. Optional environment setup

```bash
cp .env.example server/.env
```

### 3. Run frontend and backend

```bash
npm run dev
```

### 4. Open locally

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

## Documentation

- Full walkthrough: `USERGUIDE.md`
- Screenshot reference: `docs/images/README.md`

## Disclaimer

This project is for educational/demo usage only and is not financial advice.
