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

3. (Optional) Add Gemini key in `server/.env`:
   ```env
   Default_Gemini_API_Key=your_key_here
   GEMINI_PROJECT_ID=projects/YOUR_PROJECT_NUMBER
   ```

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

## Screenshot map

Use these filenames for the screenshots (stored under `docs/images/`) to match the user guide sections:

- `marketpulse-overview-top10.png` — Home overview with 10 stock cards, trend badges, and filter bar.
- `marketpulse-detail-period-selector.png` — Detail page showing prediction period selector and forecast summary.
- `marketpulse-chart-trend-overlay.png` — Candlestick chart with SMA overlays and top-right trend label.
- `marketpulse-technical-indicators.png` — Technical indicators cards (MA, momentum, Bollinger Bands).
- `marketpulse-comprehensive-analysis.png` — Comprehensive analysis (financial summary, sentiment, risks/opportunities).
- `marketpulse-latest-news.png` — Latest news feed list for the selected stock.

See the full walkthrough in `USERGUIDE.md`.

## Notes

- If `Default_Gemini_API_Key` is missing, sentiment analysis automatically falls back to a keyword-based heuristic.
- This project is for educational/demo usage and not financial advice.
