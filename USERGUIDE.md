# MarketPulse AI User Guide

This guide explains the current MarketPulse AI experience using your latest screenshot set in strict order (`1` through `14`).

## Table of Contents

1. [Overview](#overview)
2. [What You Can Do](#what-you-can-do)
3. [Screen-by-Screen Walkthrough](#screen-by-screen-walkthrough)
4. [Run Locally](#run-locally)
5. [Routes](#routes)
6. [API Quick Reference](#api-quick-reference)
7. [Troubleshooting](#troubleshooting)
8. [Disclaimer](#disclaimer)

## Overview

MarketPulse AI is a stock and portfolio website designed for daily market monitoring and decision support.

It helps you move from broad market context to detailed single-stock analysis:
- Start with market/commodity context
- Narrow into leaders, movers, and watchlist symbols
- Inspect portfolio and position-level performance
- Drill into individual-stock chart, signals, prediction logic, and technical indicators

## What You Can Do

- Monitor overall market state and key themes
- Track commodities to understand macro pressure
- Follow largest companies and strongest movers
- Curate a watchlist for fast monitoring
- Track personal portfolio and deeper portfolio breakdowns
- Run deep analysis on single stocks with:
  - chart review
  - reversal intelligence
  - prediction calculations
  - pattern recognition
  - technical indicator dashboard
  - comprehensive final analysis summary

## Screen-by-Screen Walkthrough

### 1) Market Overview
![Market Overview](docs/images/1-market-overview.png)

What this screen provides:
- High-level status of current market environment
- Fast context before drilling into individual assets

---

### 2) Commodities
![Commodities](docs/images/2-commodities.png)

What this screen provides:
- Commodity-level movement visibility
- Additional macro signal layer for equity interpretation

---

### 3) Largest Companies
![Largest Companies](docs/images/3-largest-companies.png)

What this screen provides:
- Concentrated view of high-impact companies
- Quick way to monitor large-cap leadership and sentiment

---

### 4) Market Movers
![Market Movers](docs/images/4-market-movers.png)

What this screen provides:
- Strong gainers/losers snapshot
- Rapid identification of volatility and momentum pockets

---

### 5) Watchlist Sidebar
![Watchlist Sidebar](docs/images/5-watchlist-sidebar.png)

What this screen provides:
- Your personalized symbol shortlist
- Fast navigation into stock-specific review pages

---

### 6) Personal Portfolio
![Personal Portfolio](docs/images/6-personal-portfolio.png)

What this screen provides:
- Portfolio-level snapshot for your own holdings
- Immediate view of how your investments are tracking

---

### 7) Portfolio Details
![Portfolio Details](docs/images/7-portfolio-details.png)

What this screen provides:
- More detailed position and performance breakdown
- Better granularity for monitoring holdings

---

### 8) Individual Stock Review
![Individual Stock Review](docs/images/8-individual-stock-review.png)

What this screen provides:
- Consolidated analysis entry point for one symbol
- Context panel before technical deep-dive

---

### 9) Individual Stock Chart
![Individual Stock Chart](docs/images/9-individual-stock-chart.png)

What this screen provides:
- Price-action visualization
- Baseline for understanding trend and structure

---

### 10) Individual Stock Reversal Intelligence
![Individual Stock Reversal Intelligence](docs/images/10-individual-stock-reversal-intelligence.png)

What this screen provides:
- Reversal-oriented signal interpretation
- Early indication of potential trend shifts

---

### 11) Individual Stock Prediction Calculation
![Individual Stock Prediction Calculation](docs/images/11-individual-stock-prediction-calculation.png)

What this screen provides:
- Transparent prediction-oriented calculation view
- Insight into how projected outcomes are formed

---

### 12) Individual Stock Pattern Match
![Individual Stock Pattern Match](docs/images/12-individual-stock-pattern-match.png)

What this screen provides:
- Pattern detection and matching output
- Additional confidence signals for chart interpretation

---

### 13) Individual Stock Technical Indicators
![Individual Stock Technical Indicators](docs/images/13-individual-stock-technical-indicators.png)

What this screen provides:
- Indicator stack for momentum, trend, and volatility interpretation
- Structured technical signal review

---

### 14) Individual Stock Comprehensive Analysis
![Individual Stock Comprehensive Analysis](docs/images/14-individual-stock-comprehensive-analysis.png)

What this screen provides:
- Final integrated view that combines key signals and context
- End-to-end summary for the selected stock

## Run Locally

### 1) Install

```bash
npm install
npm run install:all
```

### 2) Optional environment setup

```bash
cp .env.example server/.env
```

### 3) Start

```bash
npm run dev
```

### 4) Open

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health endpoint: `http://localhost:4000/api/health`

## Routes

- `/#/` — dashboard
- `/#/portfolio` — portfolio page
- `/#/stock/:symbol` — stock detail page

## API Quick Reference

- `GET /api/health`
- `GET /api/companies`
- `GET /api/analyze`
- `GET /api/analyze/:symbol`

Example:

```bash
curl "http://localhost:4000/api/analyze/AAPL?markers=10&perIndicator=3"
```

## Troubleshooting

### App does not start
- Reinstall dependencies with `npm run install:all`
- Ensure ports `4000` and `5173` are not in use

### No data appears
- Verify backend health: `curl http://localhost:4000/api/health`
- Confirm network availability for upstream market data sources

### Stock analysis seems incomplete
- Refresh and retry symbol request
- Validate backend logs for upstream API failures

## Disclaimer

MarketPulse AI is for educational and demonstration purposes only and is not financial advice.
