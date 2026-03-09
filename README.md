# MarketPulse AI

A full-stack website that tracks the **top 10 largest US companies by market cap** and combines:

- Real-time stock data (Yahoo Finance endpoints)
- Real-time online news (Google News RSS)
- LLM sentiment impact analysis (or heuristic fallback)
- Technical analysis + multi-timeframe stock price prediction (1W / 1M / 3M / 6M / 1Y)

## Top 10 companies

- AAPL (Apple)
- MSFT (Microsoft)
- NVDA (NVIDIA)
- AMZN (Amazon)
- GOOGL (Alphabet)
- META (Meta Platforms)
- BRK-B (Berkshire Hathaway)
- TSLA (Tesla)
- AVGO (Broadcom)
- JPM (JPMorgan Chase)

## Project structure

- `server/` — Express API and analysis pipeline
- `web/` — React + Vite website UI

## Setup

1. From project root:
   ```bash
   cd MarketPulse-AI
   npm install
   npm run install:all
   ```

2. Create env file for server:
   ```bash
   cp .env.example server/.env
   ```

3. (Optional) Add API key in `server/.env`:
   ```env
   #for demonstrate
   Default_Gemini_API_Key=your_key_here
   GEMINI_PROJECT_ID=projects/YOUR_PROJECT_NUMBER
   GEMINI_MODELS=gemini-1.5-flash,gemini-1.5-pro
   ```

   Notes:
   - `GEMINI_MODELS` is optional and allows model fallback in order (left to right).
   - If Gemini is unavailable, the backend automatically falls back to heuristic analysis.

4. Run both backend and frontend:
   ```bash
   npm run dev
   ```

5. Open:
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:4000/api/health`

## API endpoints

- `GET /api/health`
- `GET /api/companies`
- `GET /api/analyze`
- `GET /api/analyze/:symbol`

## Features & Screenshots

MarketPulse AI includes comprehensive technical analysis and visualization tools. See `USERGUIDE.md` for detailed walkthrough of all features:

1. **Dashboard Overview** — 10 stock cards with live prices and trend indicators
2. **Stock Detail Page** — Comprehensive analysis for individual stocks
3. **Multi-Timeframe Predictions** — 1W, 1M, 3M, 6M, 1Y forecasts with confidence levels
4. **Interactive Charts** — Candlestick charts with moving averages and indicators
5. **Customizable Indicators** — Toggle individual technical indicators on/off
6. **Pattern Detection** — Automatic identification of technical patterns and signals
7. **Adjustable Markers** — Fine-tune chart marker density (API & UI controls)
8. **Technical Dashboard** — RSI, MACD, Bollinger Bands, ADX, Stochastic, OBV, A/D, Aroon
9. **AI Analysis** — Sentiment, risk factors, opportunities, financial summary
10. **Real-Time News** — Latest news feed with sentiment indicators

All screenshots are stored in `docs/images/` with descriptive filenames (01-dashboard-overview.png through 10-news-feed.png).

## Notes

- If `API_Key` is missing, sentiment analysis automatically falls back to a keyword-based heuristic.
- This project is for educational/demo usage and not financial advice.
