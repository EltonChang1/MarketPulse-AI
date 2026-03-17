import axios from "axios";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

const SYMBOL_ALIASES = {
  DXY: ["DX-Y.NYB", "DXY"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChartWithRetry(url, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        timeout: 15000,
      });
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const retryable = RETRYABLE_STATUS_CODES.has(status) || !status;
      const canRetry = retryable && attempt < maxAttempts;

      if (!canRetry) break;

      await sleep(300 * attempt);
    }
  }

  throw lastError;
}

function getSymbolCandidates(symbol) {
  const normalized = String(symbol || "").toUpperCase();
  const aliases = SYMBOL_ALIASES[normalized] || [normalized];

  return [...new Set([normalized, ...aliases])];
}

function buildChartUrls(symbol) {
  const candidates = getSymbolCandidates(symbol);
  const urls = [];

  for (const candidate of candidates) {
    const encoded = encodeURIComponent(candidate);
    for (const host of YAHOO_HOSTS) {
      urls.push(`https://${host}/v8/finance/chart/${encoded}?range=2y&interval=1d`);
    }
  }

  return urls;
}

function toNumber(value, fallback = NaN) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value && typeof value === "object" && typeof value.raw === "number") return value.raw;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchScreenerWithRetry(url, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        timeout: 15000,
      });
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const retryable = RETRYABLE_STATUS_CODES.has(status) || !status || status === 401;
      const canRetry = retryable && attempt < maxAttempts;
      if (!canRetry) break;
      await sleep(300 * attempt);
    }
  }

  throw lastError;
}

export async function fetchScreenerQuotes(scrId, count = 5) {
  const urls = YAHOO_HOSTS.map(
    (host) =>
      `https://${host}/v1/finance/screener/predefined/saved?formatted=false&scrIds=${encodeURIComponent(scrId)}&count=${count}&start=0`
  );

  let lastError;
  for (const url of urls) {
    try {
      const response = await fetchScreenerWithRetry(url, 2);
      const quotes = response?.data?.finance?.result?.[0]?.quotes || [];

      return quotes.map((quote) => {
        const symbol = String(quote?.symbol || "").toUpperCase();
        const currentPrice = toNumber(quote?.regularMarketPrice);
        const changePercent = toNumber(quote?.regularMarketChangePercent);
        const volume = toNumber(quote?.regularMarketVolume, 0);

        return {
          symbol,
          displaySymbol: symbol.replace(/^\^/, ""),
          name: quote?.longName || quote?.shortName || symbol,
          type: quote?.quoteType || "Equity",
          exchange: quote?.fullExchangeName || quote?.exchange || "",
          currentPrice: Number.isFinite(currentPrice) ? Number(currentPrice.toFixed(2)) : NaN,
          changePercent: Number.isFinite(changePercent) ? Number(changePercent.toFixed(2)) : NaN,
          volume: Number.isFinite(volume) ? volume : 0,
        };
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Failed to load screener quotes for ${scrId}`);
}

export async function fetchQuoteAndHistory(symbol) {
  const chartUrls = buildChartUrls(symbol);
  let lastError;

  for (const chartUrl of chartUrls) {
    try {
      const chartResponse = await fetchChartWithRetry(chartUrl, 2);
      const result = chartResponse.data?.chart?.result?.[0];
      if (!result) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const history = timestamps
        .map((t, i) => ({
          date: new Date(t * 1000).toISOString().split("T")[0],
          time: t,
          open: opens[i],
          high: highs[i],
          low: lows[i],
          close: closes[i],
          volume: volumes[i],
        }))
        .filter((point) => 
          typeof point.close === "number" && 
          typeof point.open === "number" &&
          typeof point.high === "number" &&
          typeof point.low === "number"
        );

      if (history.length < 250) {
        throw new Error(`Insufficient history for ${symbol}`);
      }

      const latestData = history[history.length - 1];
      const previousData = history[history.length - 2];

      return {
        symbol,
        currentPrice: latestData.close,
        previousClose: previousData.close,
        marketCap: null,
        history,
        candlestickData: history,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Failed to fetch chart data for ${symbol}`);
}
