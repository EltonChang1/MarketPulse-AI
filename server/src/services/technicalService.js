import { SMA, RSI, MACD } from "technicalindicators";
import { linearRegression, linearRegressionLine } from "simple-statistics";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function predictOneWeekPrice(history, currentPrice) {
  const closes = history.map((h) => h.close).filter((n) => typeof n === "number");
  if (closes.length < 30) {
    throw new Error("Not enough data points for technical analysis");
  }

  const sma5 = SMA.calculate({ period: 5, values: closes });
  const sma20 = SMA.calculate({ period: 20, values: closes });
  const rsi14 = RSI.calculate({ period: 14, values: closes });
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const recentCloses = closes.slice(-30);
  const points = recentCloses.map((value, index) => [index, value]);
  const lr = linearRegression(points);
  const line = linearRegressionLine(lr);
  const trendStart = line(0);
  const trendEnd = line(29);
  const trendPct = (trendEnd - trendStart) / trendStart;

  const lastRsi = rsi14[rsi14.length - 1] ?? 50;
  const lastMacd = macd[macd.length - 1] ?? { MACD: 0, signal: 0 };
  const macdMomentum = (lastMacd.MACD ?? 0) - (lastMacd.signal ?? 0);

  const overboughtPenalty = lastRsi > 70 ? -0.01 : 0;
  const oversoldBoost = lastRsi < 30 ? 0.01 : 0;
  const crossoverSignal = (sma5[sma5.length - 1] ?? currentPrice) > (sma20[sma20.length - 1] ?? currentPrice) ? 0.006 : -0.006;

  const expectedMove =
    trendPct * 0.45 +
    (macdMomentum / currentPrice) * 0.35 +
    crossoverSignal +
    overboughtPenalty +
    oversoldBoost;

  const boundedMove = clamp(expectedMove, -0.12, 0.12);
  const predictedPrice = currentPrice * (1 + boundedMove);

  return {
    predictedPriceInWeek: Number(predictedPrice.toFixed(2)),
    expectedMovePct: Number((boundedMove * 100).toFixed(2)),
    direction: boundedMove > 0 ? "up" : boundedMove < 0 ? "down" : "flat",
    indicators: {
      sma5: Number((sma5[sma5.length - 1] ?? currentPrice).toFixed(2)),
      sma20: Number((sma20[sma20.length - 1] ?? currentPrice).toFixed(2)),
      rsi14: Number(lastRsi.toFixed(2)),
      macd: Number((lastMacd.MACD ?? 0).toFixed(4)),
      macdSignal: Number((lastMacd.signal ?? 0).toFixed(4)),
      trendPct30d: Number((trendPct * 100).toFixed(2)),
    },
  };
}
