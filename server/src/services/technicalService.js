import { SMA, RSI, MACD, BollingerBands, EMA, ADX, Stochastic, ATR } from "technicalindicators";
import { linearRegression, linearRegressionLine } from "simple-statistics";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateTechnicalIndicators(history) {
  const closes = history.map((h) => h.close).filter((n) => typeof n === "number");
  const highs = history.map((h) => h.high).filter((n) => typeof n === "number");
  const lows = history.map((h) => h.low).filter((n) => typeof n === "number");

  const sma5 = SMA.calculate({ period: 5, values: closes });
  const sma20 = SMA.calculate({ period: 20, values: closes });
  const sma50 = SMA.calculate({ period: 50, values: closes });
  const sma200 = SMA.calculate({ period: 200, values: closes });
  const ema12 = EMA.calculate({ period: 12, values: closes });
  const ema26 = EMA.calculate({ period: 26, values: closes });
  const rsi14 = RSI.calculate({ period: 14, values: closes });
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const bb = BollingerBands.calculate({
    period: 20,
    values: closes,
    stdDev: 2,
  });
  
  // ADX for trend strength
  const adx = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  
  // Stochastic Oscillator for momentum
  const stochastic = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3,
  });
  
  // ATR for volatility
  const atr = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });

  return {
    closes,
    highs,
    lows,
    sma5,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    rsi14,
    macd,
    bollingerBands: bb,
    adx,
    stochastic,
    atr,
  };
}

function predictForPeriod(history, currentPrice, daysAhead, periodName) {
  const closes = history.map((h) => h.close).filter((n) => typeof n === "number");
  
  const indicators = calculateTechnicalIndicators(history);
  const { sma5, sma20, sma50, sma200, rsi14, macd, adx, stochastic, atr } = indicators;

  // Use different lookback periods based on prediction timeframe
  const lookback = Math.min(Math.max(daysAhead * 2, 30), closes.length);
  const recentCloses = closes.slice(-lookback);
  const points = recentCloses.map((value, index) => [index, value]);
  const lr = linearRegression(points);
  const line = linearRegressionLine(lr);
  const trendStart = line(0);
  const trendEnd = line(lookback - 1);
  const trendPct = (trendEnd - trendStart) / trendStart;

  // Get latest indicator values
  const lastRsi = rsi14[rsi14.length - 1] ?? 50;
  const lastMacd = macd[macd.length - 1] ?? { MACD: 0, signal: 0 };
  const macdMomentum = (lastMacd.MACD ?? 0) - (lastMacd.signal ?? 0);
  const lastAdx = adx[adx.length - 1]?.adx ?? 25;
  const lastStoch = stochastic[stochastic.length - 1] ?? { k: 50, d: 50 };
  const lastAtr = atr[atr.length - 1] ?? (currentPrice * 0.02);
  
  // Trend strength from ADX (above 25 = strong trend)
  const trendStrength = lastAdx > 25 ? (lastAdx - 25) / 75 : 0;
  
  // Stochastic signals (overbought > 80, oversold < 20)
  const stochSignal = lastStoch.k < 20 ? 0.01 : lastStoch.k > 80 ? -0.01 : 0;
  
  // Volatility adjustment from ATR
  const volatilityFactor = lastAtr / currentPrice;

  // RSI signals
  const overboughtPenalty = lastRsi > 70 ? -0.02 : 0;
  const oversoldBoost = lastRsi < 30 ? 0.02 : 0;
  
  // Moving average crossovers
  const shortTermCross = (sma5[sma5.length - 1] ?? currentPrice) > (sma20[sma20.length - 1] ?? currentPrice) ? 0.01 : -0.01;
  
  // Long-term trend (Golden Cross / Death Cross)
  const longTermTrend = sma200.length > 0 && sma50.length > 0 ?
    ((sma50[sma50.length - 1] ?? currentPrice) > (sma200[sma200.length - 1] ?? currentPrice) ? 0.008 : -0.008) : 0;

  // MACD signal strength
  const macdSignalStrength = (macdMomentum / currentPrice) * 100;

  // Scale the prediction based on timeframe
  const timeframeFactor = Math.sqrt(daysAhead / 7);
  
  // Weighted combination of all signals
  const expectedMove =
    (trendPct * 0.30 +                    // Linear regression trend
    macdSignalStrength * 0.25 +           // MACD momentum
    shortTermCross * 0.15 +               // Short-term MA crossover
    longTermTrend * 0.10 +                // Long-term trend
    stochSignal * 0.10 +                  // Stochastic signal
    (overboughtPenalty + oversoldBoost) * 0.10) // RSI extremes
    * (1 + trendStrength * 0.3)           // Amplify if strong trend
    * timeframeFactor;                     // Scale by timeframe

  // Adjust bounds based on volatility and timeframe
  const baseMaxMove = daysAhead <= 7 ? 0.05 : daysAhead <= 30 ? 0.12 : daysAhead <= 90 ? 0.25 : daysAhead <= 180 ? 0.40 : 0.60;
  const maxMove = baseMaxMove * (1 + volatilityFactor * 2); // Higher volatility = wider bounds
  const boundedMove = clamp(expectedMove, -maxMove, maxMove);
  const predictedPrice = currentPrice * (1 + boundedMove);
  
  // Calculate confidence based on trend strength and indicator agreement
  const indicatorAgreement = (
    (trendPct > 0 && macdMomentum > 0 && shortTermCross > 0 ? 1 : 0) +
    (trendPct < 0 && macdMomentum < 0 && shortTermCross < 0 ? 1 : 0)
  ) / 2;
  const baseConfidence = 0.50 + (lastAdx / 100 * 0.3) + (indicatorAgreement * 0.2);
  const confidence = clamp(baseConfidence * (1 - Math.abs(boundedMove) * 0.3), 0.40, 0.95);

  return {
    period: periodName,
    daysAhead,
    predictedPrice: Number(predictedPrice.toFixed(2)),
    expectedMovePct: Number((boundedMove * 100).toFixed(2)),
    direction: boundedMove > 0.005 ? "up" : boundedMove < -0.005 ? "down" : "flat",
    confidence: Number(confidence.toFixed(2)),
  };
}

export function predictMultipleTimeframes(history, currentPrice) {
  if (history.length < 250) {
    throw new Error("Not enough data points for technical analysis");
  }

  const indicators = calculateTechnicalIndicators(history);
  const { closes, sma5, sma20, sma50, sma200, ema12, ema26, rsi14, macd, bollingerBands } = indicators;

  const predictions = {
    week: predictForPeriod(history, currentPrice, 7, "1 Week"),
    month: predictForPeriod(history, currentPrice, 30, "1 Month"),
    quarter: predictForPeriod(history, currentPrice, 90, "3 Months"),
    halfYear: predictForPeriod(history, currentPrice, 180, "6 Months"),
    year: predictForPeriod(history, currentPrice, 365, "1 Year"),
  };

  const lastBB = bollingerBands[bollingerBands.length - 1] || { upper: currentPrice, middle: currentPrice, lower: currentPrice };
  const lastAdx = indicators.adx[indicators.adx.length - 1] || { adx: 25, pdi: 0, mdi: 0 };
  const lastStoch = indicators.stochastic[indicators.stochastic.length - 1] || { k: 50, d: 50 };
  const lastAtr = indicators.atr[indicators.atr.length - 1] || (currentPrice * 0.02);

  return {
    predictions,
    indicators: {
      sma5: Number((sma5[sma5.length - 1] ?? currentPrice).toFixed(2)),
      sma20: Number((sma20[sma20.length - 1] ?? currentPrice).toFixed(2)),
      sma50: Number((sma50[sma50.length - 1] ?? currentPrice).toFixed(2)),
      sma200: Number((sma200[sma200.length - 1] ?? currentPrice).toFixed(2)),
      ema12: Number((ema12[ema12.length - 1] ?? currentPrice).toFixed(2)),
      ema26: Number((ema26[ema26.length - 1] ?? currentPrice).toFixed(2)),
      rsi14: Number((rsi14[rsi14.length - 1] ?? 50).toFixed(2)),
      macd: Number(((macd[macd.length - 1]?.MACD ?? 0)).toFixed(4)),
      macdSignal: Number(((macd[macd.length - 1]?.signal ?? 0)).toFixed(4)),
      macdHistogram: Number(((macd[macd.length - 1]?.histogram ?? 0)).toFixed(4)),
      bbUpper: Number(lastBB.upper.toFixed(2)),
      bbMiddle: Number(lastBB.middle.toFixed(2)),
      bbLower: Number(lastBB.lower.toFixed(2)),
      adx: Number(lastAdx.adx.toFixed(2)),
      plusDI: Number((lastAdx.pdi ?? 0).toFixed(2)),
      minusDI: Number((lastAdx.mdi ?? 0).toFixed(2)),
      stochK: Number(lastStoch.k.toFixed(2)),
      stochD: Number(lastStoch.d.toFixed(2)),
      atr: Number(lastAtr.toFixed(2)),
    },
    indicatorSeries: {
      sma5: sma5.map(v => Number(v.toFixed(2))),
      sma20: sma20.map(v => Number(v.toFixed(2))),
      sma50: sma50.map(v => Number(v.toFixed(2))),
      rsi14: rsi14.map(v => Number(v.toFixed(2))),
    },
  };
}
