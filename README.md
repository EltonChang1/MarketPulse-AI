# MarketPulse AI

A full-stack website that tracks the **top 5 largest US companies by market cap** and combines:

- Real-time stock data (Yahoo Finance endpoints)
- Real-time online news (Google News RSS)
- LLM sentiment impact analysis (or heuristic fallback)
- Technical analysis + one-week stock price prediction

## Top 5 companies

- AAPL (Apple)
- MSFT (Microsoft)
- NVDA (NVIDIA)
- AMZN (Amazon)
- GOOGL (Alphabet)

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

3. (Optional) Add OpenAI key in `server/.env`:
   ```env
   OPENAI_API_KEY=your_key_here
   LLM_MODEL=gpt-4o-mini
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

## Notes

- If `OPENAI_API_KEY` is missing, sentiment analysis automatically falls back to a keyword-based heuristic.
- This project is for educational/demo usage and not financial advice.
