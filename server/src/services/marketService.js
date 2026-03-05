import axios from "axios";

export async function fetchQuoteAndHistory(symbol) {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`;

  const chartResponse = await axios.get(chartUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  const result = chartResponse.data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data found for ${symbol}`);
  }

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const history = timestamps
    .map((t, i) => ({
      date: new Date(t * 1000).toISOString().split("T")[0],
      close: closes[i],
    }))
    .filter((point) => typeof point.close === "number");

  if (history.length < 20) {
    throw new Error(`Insufficient history for ${symbol}`);
  }

  const currentPrice = result.meta?.regularMarketPrice ?? history[history.length - 1].close;
  const previousClose =
    result.meta?.chartPreviousClose ??
    result.meta?.previousClose ??
    history[history.length - 2].close;

  return {
    symbol,
    currentPrice,
    previousClose,
    marketCap: null,
    history,
  };
}
