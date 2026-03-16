import { SMA, RSI, MACD, BollingerBands, EMA, ADX, Stochastic, ATR } from "technicalindicators";
import { linearRegression, linearRegressionLine } from "simple-statistics";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeOBV(closes, volumes) {
  const obv = [0];
  for (let index = 1; index < closes.length; index += 1) {
    const previous = obv[index - 1] ?? 0;
    const volume = volumes[index] ?? 0;

    if (closes[index] > closes[index - 1]) {
      obv.push(previous + volume);
    } else if (closes[index] < closes[index - 1]) {
      obv.push(previous - volume);
    } else {
      obv.push(previous);
    }
  }

  return obv;
}

function computeADL(highs, lows, closes, volumes) {
  const adl = [];
  let cumulative = 0;

  for (let index = 0; index < closes.length; index += 1) {
    const high = highs[index] ?? closes[index];
    const low = lows[index] ?? closes[index];
    const close = closes[index] ?? 0;
    const volume = volumes[index] ?? 0;
    const range = high - low;
    const moneyFlowMultiplier = range === 0 ? 0 : ((close - low) - (high - close)) / range;
    const moneyFlowVolume = moneyFlowMultiplier * volume;
    cumulative += moneyFlowVolume;
    adl.push(cumulative);
  }

  return adl;
}

function computeAroon(highs, lows, period = 25) {
  const aroonUp = [];
  const aroonDown = [];

  for (let index = period - 1; index < highs.length; index += 1) {
    const highWindow = highs.slice(index - period + 1, index + 1);
    const lowWindow = lows.slice(index - period + 1, index + 1);

    let highIdx = 0;
    let lowIdx = 0;

    for (let windowIndex = 1; windowIndex < highWindow.length; windowIndex += 1) {
      if (highWindow[windowIndex] >= highWindow[highIdx]) highIdx = windowIndex;
      if (lowWindow[windowIndex] <= lowWindow[lowIdx]) lowIdx = windowIndex;
    }

    const periodsSinceHigh = period - 1 - highIdx;
    const periodsSinceLow = period - 1 - lowIdx;

    aroonUp.push(((period - periodsSinceHigh) / period) * 100);
    aroonDown.push(((period - periodsSinceLow) / period) * 100);
  }

  return { aroonUp, aroonDown };
}

function computeSlope(values) {
  if (!values || values.length < 2) return 0;
  const points = values.map((value, index) => [index, value]);
  const model = linearRegression(points);
  return model.m;
}

function normalizeSeries(values, scale = 1) {
  return values.map((value) => Number((value / scale).toFixed(2)));
}

function buildOverlayLines(history, closes) {
  const allPoints = closes.map((value, index) => [index, value]);
  const overallTrendModel = linearRegression(allPoints);
  const overallTrendLine = linearRegressionLine(overallTrendModel);

  const trendLine = history.map((point, index) => ({
    time: point.date,
    value: Number(overallTrendLine(index).toFixed(2)),
  }));

  const recentWindow = history.slice(-60);
  const resistance = Math.max(...recentWindow.map((point) => point.high));
  const support = Math.min(...recentWindow.map((point) => point.low));

  const supportLine = history.map((point) => ({ time: point.date, value: Number(support.toFixed(2)) }));
  const resistanceLine = history.map((point) => ({ time: point.date, value: Number(resistance.toFixed(2)) }));

  return { trendLine, supportLine, resistanceLine };
}

function detectPatternMatches(
  { history, closes, rsi14, macd, stochastic, adx, aroonUp, aroonDown, obv, adl },
  options = {}
) {
  const patternMatches = [];
  const totalBars = closes.length;
  const lastIndex = totalBars - 1;
  const lastDate = history[lastIndex]?.date;
  if (!lastDate) return patternMatches;

  const maxMarkers = Math.round(clamp(Number(options.maxMarkers ?? 10), 3, 30));
  const maxPerIndicator = Math.round(clamp(Number(options.maxPerIndicator ?? 3), 1, 10));
  const lookbackBars = Math.min(220, totalBars);
  const startBar = Math.max(1, totalBars - lookbackBars);
  const existing = new Set();
  const indicatorWeight = {
    MACD: 2.2,
    RSI: 2,
    ADX: 1.9,
    Aroon: 1.7,
    Stochastic: 1.6,
    OBV: 1.5,
    "A/D": 1.5,
  };

  const rsiOffset = totalBars - rsi14.length;
  const macdOffset = totalBars - macd.length;
  const stochOffset = totalBars - stochastic.length;
  const adxOffset = totalBars - adx.length;
  const aroonOffset = totalBars - aroonUp.length;

  const pushMatch = (match, bar, strength = 1) => {
    if (!match?.time) return;
    const key = `${match.time}|${match.indicator}|${match.label}`;
    if (existing.has(key)) return;
    existing.add(key);
    const denom = Math.max(1, lastIndex - startBar + 1);
    const recencyScore = ((bar - startBar) / denom) * 3;
    const weight = indicatorWeight[match.indicator] ?? 1.3;
    const normalizedStrength = Math.max(0, Math.min(3, strength));
    patternMatches.push({
      ...match,
      score: Number((weight + recencyScore + normalizedStrength).toFixed(3)),
    });
  };

  for (let bar = startBar; bar <= lastIndex; bar += 1) {
    const date = history[bar]?.date;
    if (!date) continue;

    const rsiIndex = bar - rsiOffset;
    if (rsiIndex > 0 && rsiIndex < rsi14.length) {
      const previous = rsi14[rsiIndex - 1];
      const current = rsi14[rsiIndex];
      if (previous < 30 && current >= 30) {
        pushMatch({
          time: date,
          indicator: "RSI",
          direction: "up",
          label: "RSI bullish recovery",
          detail: `RSI crossed up from oversold (${current.toFixed(1)})`,
        }, bar, Math.abs(30 - previous) / 10);
      } else if (previous > 70 && current <= 70) {
        pushMatch({
          time: date,
          indicator: "RSI",
          direction: "down",
          label: "RSI bearish cooling",
          detail: `RSI crossed down from overbought (${current.toFixed(1)})`,
        }, bar, Math.abs(previous - 70) / 10);
      }
    }

    const macdIndex = bar - macdOffset;
    if (macdIndex > 0 && macdIndex < macd.length) {
      const previous = macd[macdIndex - 1] ?? { MACD: 0, signal: 0 };
      const current = macd[macdIndex] ?? { MACD: 0, signal: 0 };
      const crossedUp = (previous.MACD ?? 0) <= (previous.signal ?? 0) && (current.MACD ?? 0) > (current.signal ?? 0);
      const crossedDown = (previous.MACD ?? 0) >= (previous.signal ?? 0) && (current.MACD ?? 0) < (current.signal ?? 0);
      if (crossedUp || crossedDown) {
        const macdSpread = Math.abs((current.MACD ?? 0) - (current.signal ?? 0));
        pushMatch({
          time: date,
          indicator: "MACD",
          direction: crossedUp ? "up" : "down",
          label: crossedUp ? "MACD bullish cross" : "MACD bearish cross",
          detail: crossedUp ? "MACD crossed above signal" : "MACD crossed below signal",
        }, bar, macdSpread * 60);
      }
    }

    const stochIndex = bar - stochOffset;
    if (stochIndex > 0 && stochIndex < stochastic.length) {
      const previous = stochastic[stochIndex - 1] ?? { k: 50, d: 50 };
      const current = stochastic[stochIndex] ?? { k: 50, d: 50 };
      const crossedUp = previous.k <= previous.d && current.k > current.d && current.k < 20;
      const crossedDown = previous.k >= previous.d && current.k < current.d && current.k > 80;
      if (crossedUp || crossedDown) {
        pushMatch({
          time: date,
          indicator: "Stochastic",
          direction: crossedUp ? "up" : "down",
          label: crossedUp ? "Stochastic bullish reversal" : "Stochastic bearish reversal",
          detail: crossedUp ? `%K/%D up-cross in oversold (${current.k.toFixed(1)})` : `%K/%D down-cross in overbought (${current.k.toFixed(1)})`,
        }, bar, Math.abs((current.k ?? 50) - (current.d ?? 50)) / 10);
      }
    }

    const adxIndex = bar - adxOffset;
    if (adxIndex > 0 && adxIndex < adx.length) {
      const previous = adx[adxIndex - 1] ?? { adx: 0, pdi: 0, mdi: 0 };
      const current = adx[adxIndex] ?? { adx: 0, pdi: 0, mdi: 0 };
      if ((current.adx ?? 0) > 20) {
        const upCross = (previous.pdi ?? 0) <= (previous.mdi ?? 0) && (current.pdi ?? 0) > (current.mdi ?? 0);
        const downCross = (previous.pdi ?? 0) >= (previous.mdi ?? 0) && (current.pdi ?? 0) < (current.mdi ?? 0);
        if (upCross || downCross) {
          pushMatch({
            time: date,
            indicator: "ADX",
            direction: upCross ? "up" : "down",
            label: upCross ? "ADX +DI bullish crossover" : "ADX -DI bearish crossover",
            detail: `ADX ${(current.adx ?? 0).toFixed(1)} confirms trend strength`,
          }, bar, (current.adx ?? 0) / 20);
        }
      }
    }

    const aroonIndex = bar - aroonOffset;
    if (aroonIndex > 0 && aroonIndex < aroonUp.length && aroonIndex < aroonDown.length) {
      const upPrev = aroonUp[aroonIndex - 1];
      const upNow = aroonUp[aroonIndex];
      const downPrev = aroonDown[aroonIndex - 1];
      const downNow = aroonDown[aroonIndex];
      const crossedUp = upPrev <= downPrev && upNow > downNow;
      const crossedDown = upPrev >= downPrev && upNow < downNow;
      if (crossedUp || crossedDown) {
        pushMatch({
          time: date,
          indicator: "Aroon",
          direction: crossedUp ? "up" : "down",
          label: crossedUp ? "Aroon bullish crossover" : "Aroon bearish crossover",
          detail: `Aroon Up ${upNow.toFixed(1)} / Down ${downNow.toFixed(1)}`,
        }, bar, Math.abs((upNow ?? 50) - (downNow ?? 50)) / 30);
      }
    }

    if (bar % 10 === 0 && bar >= 20) {
      const priceSlope = computeSlope(closes.slice(bar - 20, bar + 1));
      const obvSlope = computeSlope(obv.slice(bar - 20, bar + 1));
      const adlSlope = computeSlope(adl.slice(bar - 20, bar + 1));

      if (priceSlope > 0 && obvSlope < 0) {
        pushMatch({
          time: date,
          indicator: "OBV",
          direction: "down",
          label: "OBV bearish divergence",
          detail: "Price rising while OBV weakens",
        }, bar, 1.8);
      } else if (priceSlope < 0 && obvSlope > 0) {
        pushMatch({
          time: date,
          indicator: "OBV",
          direction: "up",
          label: "OBV bullish divergence",
          detail: "Price falling while OBV strengthens",
        }, bar, 1.8);
      }

      if (priceSlope > 0 && adlSlope < 0) {
        pushMatch({
          time: date,
          indicator: "A/D",
          direction: "down",
          label: "A/D bearish divergence",
          detail: "Price rising while A/D weakens",
        }, bar, 1.8);
      } else if (priceSlope < 0 && adlSlope > 0) {
        pushMatch({
          time: date,
          indicator: "A/D",
          direction: "up",
          label: "A/D bullish divergence",
          detail: "Price falling while A/D strengthens",
        }, bar, 1.8);
      }
    }
  }

  if (patternMatches.length === 0) {
    const lastRsi = rsi14[rsi14.length - 1] ?? 50;
    const macdLast = macd[macd.length - 1] ?? { MACD: 0, signal: 0 };
    const macdDirection = (macdLast.MACD ?? 0) >= (macdLast.signal ?? 0) ? "up" : "down";
    const aroonLastUp = aroonUp[aroonUp.length - 1] ?? 50;
    const aroonLastDown = aroonDown[aroonDown.length - 1] ?? 50;
    const aroonDirection = aroonLastUp >= aroonLastDown ? "up" : "down";

    pushMatch({
      time: lastDate,
      indicator: "RSI",
      direction: lastRsi >= 50 ? "up" : "down",
      label: "RSI momentum state",
      detail: `RSI currently ${lastRsi.toFixed(1)} (${lastRsi >= 50 ? "bullish bias" : "bearish bias"})`,
    }, lastIndex, 0.8);
    pushMatch({
      time: lastDate,
      indicator: "MACD",
      direction: macdDirection,
      label: "MACD momentum state",
      detail: `MACD ${(macdLast.MACD ?? 0).toFixed(3)} vs signal ${(macdLast.signal ?? 0).toFixed(3)}`,
    }, lastIndex, 0.8);
    pushMatch({
      time: lastDate,
      indicator: "Aroon",
      direction: aroonDirection,
      label: "Aroon trend state",
      detail: `Aroon Up ${aroonLastUp.toFixed(1)} / Down ${aroonLastDown.toFixed(1)}`,
    }, lastIndex, 0.8);
  }

  const ranked = [...patternMatches]
    .sort((a, b) => (b.score - a.score) || String(b.time).localeCompare(String(a.time)));

  const perIndicatorCount = new Map();
  const strongest = [];
  for (const match of ranked) {
    const count = perIndicatorCount.get(match.indicator) ?? 0;
    if (count >= maxPerIndicator) continue;
    strongest.push(match);
    perIndicatorCount.set(match.indicator, count + 1);
    if (strongest.length >= maxMarkers) break;
  }

  return strongest
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    .map(({ score, ...match }) => match);
}

function calculateTechnicalIndicators(history) {
  const closes = history.map((h) => h.close).filter((n) => typeof n === "number");
  const highs = history.map((h) => h.high).filter((n) => typeof n === "number");
  const lows = history.map((h) => h.low).filter((n) => typeof n === "number");
  const volumes = history.map((h) => h.volume ?? 0);

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

  const obv = computeOBV(closes, volumes);
  const adl = computeADL(highs, lows, closes, volumes);
  const { aroonUp, aroonDown } = computeAroon(highs, lows, 25);

  return {
    closes,
    highs,
    lows,
    volumes,
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
    obv,
    adl,
    aroonUp,
    aroonDown,
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

export function predictMultipleTimeframes(history, currentPrice, options = {}) {
  if (history.length < 250) {
    throw new Error("Not enough data points for technical analysis");
  }

  const indicators = calculateTechnicalIndicators(history);
  const {
    closes,
    sma5,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    rsi14,
    macd,
    bollingerBands,
    obv,
    adl,
    aroonUp,
    aroonDown,
    stochastic,
    adx,
    atr,
  } = indicators;

  const predictions = {
    week: predictForPeriod(history, currentPrice, 7, "1 Week"),
    month: predictForPeriod(history, currentPrice, 30, "1 Month"),
    quarter: predictForPeriod(history, currentPrice, 90, "3 Months"),
    halfYear: predictForPeriod(history, currentPrice, 180, "6 Months"),
    year: predictForPeriod(history, currentPrice, 365, "1 Year"),
  };

  const lastBB = bollingerBands[bollingerBands.length - 1] || { upper: currentPrice, middle: currentPrice, lower: currentPrice };
  const lastAdx = adx[adx.length - 1] || { adx: 25, pdi: 0, mdi: 0 };
  const lastStoch = stochastic[stochastic.length - 1] || { k: 50, d: 50 };
  const lastAtr = atr[atr.length - 1] || (currentPrice * 0.02);

  const overlays = buildOverlayLines(history, closes);
  const patternMatches = detectPatternMatches({
    history,
    closes,
    rsi14,
    macd,
    stochastic,
    adx,
    aroonUp,
    aroonDown,
    obv,
    adl,
  }, {
    maxMarkers: options.maxMarkers,
    maxPerIndicator: options.maxPerIndicator,
  });

  const predictionBasis = {
    indicatorsUsed: [
      "Linear Regression Trend Slope",
      "MACD vs Signal Spread",
      "SMA5 / SMA20 Short-term Crossover",
      "SMA50 / SMA200 Long-term Trend (Golden/Death Cross)",
      "Stochastic Overbought/Oversold",
      "RSI Extreme Zones (<30 / >70)",
    ],
    weights: {
      "Linear Regression Trend": "30%",
      "MACD Momentum": "25%",
      "Short-term MA Crossover (SMA5/20)": "15%",
      "Long-term Trend (SMA50/200)": "10%",
      "Stochastic (Overbought/Oversold)": "10%",
      "RSI Extremes (<30 or >70)": "10%",
    },
    amplifiers: [
      "ADX trend-strength multiplier (up to +30% when ADX > 25)",
      "Timeframe scaling: √(daysAhead / 7)",
    ],
    summary:
      "A weighted sum of six signals (see weights) gives an expected move percent. The result is amplified by ADX trend strength and scaled by the square root of the prediction horizon. Final price is bounded by ATR-based volatility limits per timeframe.",
  };

  // ─── Reversal Metrics ─────────────────────────────────────────────────────
  const bbPosition =
    lastBB.upper > lastBB.lower
      ? Number(((currentPrice - lastBB.lower) / (lastBB.upper - lastBB.lower)).toFixed(3))
      : 0.5;

  const volumes = indicators.volumes;
  const volWindow = Math.min(20, volumes.length);
  const avgVolume20 = volumes.slice(-volWindow).reduce((a, b) => a + (b ?? 0), 0) / Math.max(1, volWindow);
  const currentVolume = volumes[volumes.length - 1] ?? 0;
  const volumeRatio = avgVolume20 > 0 ? Number((currentVolume / avgVolume20).toFixed(2)) : 1;

  const recentHistory60 = history.slice(-60);
  const fibHigh = Math.max(...recentHistory60.map((h) => h.high ?? currentPrice));
  const fibLow = Math.min(...recentHistory60.map((h) => h.low ?? currentPrice));
  const fibRange = fibHigh - fibLow || 1;
  const fibonacci = {
    high: Number(fibHigh.toFixed(2)),
    level786: Number((fibLow + fibRange * 0.786).toFixed(2)),
    level618: Number((fibLow + fibRange * 0.618).toFixed(2)),
    level500: Number((fibLow + fibRange * 0.5).toFixed(2)),
    level382: Number((fibLow + fibRange * 0.382).toFixed(2)),
    level236: Number((fibLow + fibRange * 0.236).toFixed(2)),
    low: Number(fibLow.toFixed(2)),
  };

  const bbOffset = closes.length - bollingerBands.length;
  let upperTouches = 0;
  let lowerTouches = 0;
  const touchWindow = Math.min(60, bollingerBands.length);
  for (let i = bollingerBands.length - touchWindow; i < bollingerBands.length; i += 1) {
    const closePrice = closes[i + bbOffset];
    const bandUpper = bollingerBands[i]?.upper;
    const bandLower = bollingerBands[i]?.lower;
    if (typeof closePrice === "number" && typeof bandUpper === "number" && typeof bandLower === "number") {
      if (closePrice >= bandUpper * 0.998) upperTouches += 1;
      if (closePrice <= bandLower * 1.002) lowerTouches += 1;
    }
  }

  const atrValues = atr;
  const wLen = Math.min(5, atrValues.length);
  const mLen = Math.min(20, atrValues.length);
  const weeklyAtrAvg = atrValues.slice(-wLen).reduce((a, b) => a + b, 0) / Math.max(1, wLen);
  const monthlyAtrAvg = atrValues.slice(-mLen).reduce((a, b) => a + b, 0) / Math.max(1, mLen);

  const rsiCurrent = rsi14[rsi14.length - 1] ?? 50;
  const rsiPrev3 = rsi14[rsi14.length - 4] ?? rsiCurrent;
  const stochCurrent = stochastic[stochastic.length - 1]?.k ?? 50;
  const stochPrev3 = stochastic[stochastic.length - 4]?.k ?? stochCurrent;
  const rsiDir = rsiCurrent > rsiPrev3 + 1 ? "up" : rsiCurrent < rsiPrev3 - 1 ? "down" : "flat";
  const stochDir = stochCurrent > stochPrev3 + 2 ? "up" : stochCurrent < stochPrev3 - 2 ? "down" : "flat";
  const hasDivergence = rsiDir !== "flat" && stochDir !== "flat" && rsiDir !== stochDir;

  const reversalMetrics = {
    bbPosition,
    volumeRatio,
    currentVolume: Number(currentVolume.toFixed(0)),
    avgVolume20: Number(avgVolume20.toFixed(0)),
    fibonacci,
    channelTouches: { upper: upperTouches, lower: lowerTouches },
    dailyRange: {
      weeklyAvgAtr: Number(weeklyAtrAvg.toFixed(2)),
      monthlyAvgAtr: Number(monthlyAtrAvg.toFixed(2)),
      weeklyPct: Number(((weeklyAtrAvg / currentPrice) * 100).toFixed(2)),
      monthlyPct: Number(((monthlyAtrAvg / currentPrice) * 100).toFixed(2)),
    },
    divergence: {
      hasRsiStochDivergence: hasDivergence,
      rsiDirection: rsiDir,
      stochDirection: stochDir,
      rsiCurrent: Number(rsiCurrent.toFixed(1)),
      stochKCurrent: Number(stochCurrent.toFixed(1)),
    },
  };
  // ──────────────────────────────────────────────────────────────────────────

  return {
    predictions,
    predictionBasis,
    reversalMetrics,
    patternMatches,
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
      aroonUp: Number((aroonUp[aroonUp.length - 1] ?? 50).toFixed(2)),
      aroonDown: Number((aroonDown[aroonDown.length - 1] ?? 50).toFixed(2)),
      stochK: Number(lastStoch.k.toFixed(2)),
      stochD: Number(lastStoch.d.toFixed(2)),
      atr: Number(lastAtr.toFixed(2)),
      obv: Number((obv[obv.length - 1] ?? 0).toFixed(0)),
      adl: Number((adl[adl.length - 1] ?? 0).toFixed(0)),
    },
    indicatorSeries: {
      sma5: sma5.map(v => Number(v.toFixed(2))),
      sma20: sma20.map(v => Number(v.toFixed(2))),
      sma50: sma50.map(v => Number(v.toFixed(2))),
      rsi14: rsi14.map(v => Number(v.toFixed(2))),
      macd: macd.map(m => Number((m?.MACD ?? 0).toFixed(4))),
      macdSignal: macd.map(m => Number((m?.signal ?? 0).toFixed(4))),
      stochK: stochastic.map(s => Number((s?.k ?? 50).toFixed(2))),
      stochD: stochastic.map(s => Number((s?.d ?? 50).toFixed(2))),
      adx: adx.map(a => Number((a?.adx ?? 25).toFixed(2))),
      obv: normalizeSeries(obv, 1_000_000),
      adl: normalizeSeries(adl, 1_000_000),
      aroonUp: aroonUp.map((value) => Number(value.toFixed(2))),
      aroonDown: aroonDown.map((value) => Number(value.toFixed(2))),
      trendLine: overlays.trendLine,
      supportLine: overlays.supportLine,
      resistanceLine: overlays.resistanceLine,
    },
  };
}
