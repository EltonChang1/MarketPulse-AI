import axios from "axios";

export async function fetchQuoteAndHistory(symbol) {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2y&interval=1d`;

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

  // Get the most recent trading day's data
  const latestData = history[history.length - 1];
  const previousData = history[history.length - 2];
  
  // Use the latest close as current price, and previous day's close for comparison
  const currentPrice = latestData.close;
  const previousClose = previousData.close;

  return {
    symbol,
    currentPrice,
    previousClose,
    marketCap: null,
    history,
    candlestickData: history,
  };
}
