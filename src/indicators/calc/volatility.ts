// indicators/calc/volatility.ts
// Version: 1.10.0 | Updated: 2026-04-25 | By: GitHub Copilot

import type { CandleData } from '../../data/DataStore';

type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';

function sourceValue(candle: CandleData, source: PriceSource): number {
  switch (source) {
    case 'open':
      return candle.open;
    case 'high':
      return candle.high;
    case 'low':
      return candle.low;
    case 'hl2':
      return (candle.high + candle.low) / 2;
    case 'hlc3':
      return (candle.high + candle.low + candle.close) / 3;
    case 'ohlc4':
      return (candle.open + candle.high + candle.low + candle.close) / 4;
    default:
      return candle.close;
  }
}

function calculateEmaSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;
  const alpha = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  out[period - 1] = seed / period;
  for (let i = period; i < values.length; i++) {
    out[i] = values[i] * alpha + (out[i - 1] as number) * (1 - alpha);
  }
  return out;
}

function calculateEmaSeriesNullable(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const alpha = 2 / (normalizedPeriod + 1);
  const seedValues: number[] = [];
  let previous: number | undefined;

  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    if (previous === undefined) {
      seedValues.push(value);
      if (seedValues.length === normalizedPeriod) {
        previous = seedValues.reduce((sum, current) => sum + current, 0) / normalizedPeriod;
        out[index] = previous;
      }
      continue;
    }

    previous = (value * alpha) + (previous * (1 - alpha));
    out[index] = previous;
  }

  return out;
}

function calculateRollingMaxSeries(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const normalizedPeriod = Math.max(1, Math.floor(period));
  for (let index = normalizedPeriod - 1; index < values.length; index++) {
    let highest = -Infinity;
    let valid = true;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) {
      const value = values[lookback];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      if (value > highest) highest = value;
    }
    out[index] = valid ? highest : undefined;
  }
  return out;
}

function calculateRollingMinSeries(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const normalizedPeriod = Math.max(1, Math.floor(period));
  for (let index = normalizedPeriod - 1; index < values.length; index++) {
    let lowest = Infinity;
    let valid = true;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) {
      const value = values[lookback];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      if (value < lowest) lowest = value;
    }
    out[index] = valid ? lowest : undefined;
  }
  return out;
}

function calculateSmaSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function calculateLinearRegressionWindow(
  values: number[],
  endIndex: number,
  period: number,
): { middle: number; deviation: number } | null {
  const startIndex = endIndex - period + 1;
  if (startIndex < 0) return null;

  const xMean = (period - 1) / 2;
  const denominator = (period * (period - 1) * (period + 1)) / 12;
  if (denominator === 0) return null;

  let ySum = 0;
  let covariance = 0;
  for (let offset = 0; offset < period; offset++) {
    const value = values[startIndex + offset];
    ySum += value;
    covariance += (offset - xMean) * value;
  }

  const yMean = ySum / period;
  const slope = covariance / denominator;
  const intercept = yMean - (slope * xMean);
  const middle = intercept + (slope * (period - 1));

  let residualSum = 0;
  for (let offset = 0; offset < period; offset++) {
    const predicted = intercept + (slope * offset);
    residualSum += (values[startIndex + offset] - predicted) ** 2;
  }

  return {
    middle,
    deviation: Math.sqrt(residualSum / period),
  };
}

export function calculateTrueRangeSeries(data: CandleData[]): number[] {
  const tr: number[] = new Array(data.length).fill(0);
  if (!data.length) return tr;

  tr[0] = data[0].high - data[0].low;
  for (let i = 1; i < data.length; i++) {
    const hl = data[i].high - data[i].low;
    const hc = Math.abs(data[i].high - data[i - 1].close);
    const lc = Math.abs(data[i].low - data[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  return tr;
}

export function calculateAtrSeries(data: CandleData[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(data.length).fill(undefined);
  if (data.length < 2) return out;
  const tr = calculateTrueRangeSeries(data);

  for (let i = 0; i < data.length; i++) {
    if (i < period) continue;
    if (i === period) {
      let sum = 0;
      for (let j = 1; j <= period; j++) sum += tr[j];
      out[i] = sum / period;
    } else {
      out[i] = (((out[i - 1] as number) * (period - 1)) + tr[i]) / period;
    }
  }

  return out;
}

export function calculateATR(data: CandleData[], period = 14, key = 'atr'): void {
  if (data.length < 2) return;
  const tr: number[] = new Array(data.length).fill(0);
  tr[0] = data[0].high - data[0].low;
  for (let i = 1; i < data.length; i++) {
    const hl = data[i].high - data[i].low;
    const hc = Math.abs(data[i].high - data[i - 1].close);
    const lc = Math.abs(data[i].low - data[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      data[i][key] = undefined;
      continue;
    }
    if (i === period) {
      let sum = 0;
      for (let j = 1; j <= period; j++) sum += tr[j];
      data[i][key] = sum / period;
    } else {
      data[i][key] = (((data[i - 1][key] as number) * (period - 1)) + tr[i]) / period;
    }
  }
}

export function calculateAverageDailyRange(data: CandleData[], period = 14, key = 'average_daily_range'): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const ranges = data.map((candle) => candle.high - candle.low);
  const adr = calculateSmaSeries(ranges, normalizedPeriod);
  for (let index = 0; index < data.length; index++) data[index][key] = adr[index];
}

/** Pure Kern-Funktion: Bollinger-Statistik auf rohen Werten. Exportiert für externe Wrapper. */
export function calcBbandsSeries(values: number[], period: number): {
  middle: Array<number | undefined>;
  deviation: Array<number | undefined>;
} {
  const middle: Array<number | undefined> = new Array(values.length).fill(undefined);
  const deviation: Array<number | undefined> = new Array(values.length).fill(undefined);
  let sum = 0;
  let sumSquares = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    sumSquares += values[i] * values[i];

    if (i >= period) {
      sum -= values[i - period];
      sumSquares -= values[i - period] * values[i - period];
    }

    if (i < period - 1) continue;

    const mean = sum / period;
    const variance = period > 1 ? (sumSquares - ((sum * sum) / period)) / (period - 1) : 0;
    middle[i] = mean;
    deviation[i] = Math.sqrt(Math.max(variance, 0));
  }

  return { middle, deviation };
}

function calculateBollingerStats(data: CandleData[], period: number): {
  middle: Array<number | undefined>;
  deviation: Array<number | undefined>;
} {
  return calcBbandsSeries(data.map((c) => c.close), period);
}

function timestampToSessionKey(timestamp: number): string {
  const millis = timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
  const date = new Date(millis);
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

function bollingerComponents(data: CandleData[], period: number, stdDev: number): {
  upper: Array<number | undefined>;
  middle: Array<number | undefined>;
  lower: Array<number | undefined>;
} {
  const stats = calculateBollingerStats(data, period);
  const upper: Array<number | undefined> = new Array(data.length).fill(undefined);
  const lower: Array<number | undefined> = new Array(data.length).fill(undefined);
  for (let index = 0; index < data.length; index++) {
    const middle = stats.middle[index];
    const deviation = stats.deviation[index];
    if (typeof middle !== 'number' || typeof deviation !== 'number') continue;
    upper[index] = middle + (stdDev * deviation);
    lower[index] = middle - (stdDev * deviation);
  }
  return { upper, middle: stats.middle, lower };
}

export function calculateBollingerPercentB(data: CandleData[], period = 20, stdDev = 2, key = 'bollinger_percent_b'): void {
  if (data.length < period) return;

  const stats = calculateBollingerStats(data, period);
  for (let i = 0; i < data.length; i++) {
    const middle = stats.middle[i];
    const deviation = stats.deviation[i];
    if (typeof middle !== 'number' || typeof deviation !== 'number') {
      data[i][key] = undefined;
      continue;
    }

    const upper = middle + (stdDev * deviation);
    const lower = middle - (stdDev * deviation);
    const bandRange = upper - lower;
    data[i][key] = bandRange === 0 ? undefined : (data[i].close - lower) / bandRange;
  }
}

export function calculateBollingerBandwidth(data: CandleData[], period = 20, stdDev = 2, key = 'bollinger_bandwidth'): void {
  if (data.length < period) return;

  const stats = calculateBollingerStats(data, period);
  for (let i = 0; i < data.length; i++) {
    const middle = stats.middle[i];
    const deviation = stats.deviation[i];
    if (typeof middle !== 'number' || typeof deviation !== 'number' || middle === 0) {
      data[i][key] = undefined;
      continue;
    }

    const upper = middle + (stdDev * deviation);
    const lower = middle - (stdDev * deviation);
    data[i][key] = ((upper - lower) / middle) * 100;
  }
}

export function calculateBBTrend(
  data: CandleData[],
  shortPeriod = 20,
  longPeriod = 50,
  stdDev = 2,
  key = 'bbtrend',
): void {
  const shortBands = bollingerComponents(data, Math.max(1, Math.floor(shortPeriod)), stdDev);
  const longBands = bollingerComponents(data, Math.max(1, Math.floor(longPeriod)), stdDev);
  for (let index = 0; index < data.length; index++) {
    const shortMiddle = shortBands.middle[index];
    const shortUpper = shortBands.upper[index];
    const shortLower = shortBands.lower[index];
    const longUpper = longBands.upper[index];
    const longLower = longBands.lower[index];
    if (typeof shortMiddle !== 'number' || shortMiddle === 0 || typeof shortUpper !== 'number' || typeof shortLower !== 'number' || typeof longUpper !== 'number' || typeof longLower !== 'number') {
      data[index][key] = undefined;
      continue;
    }
    data[index][key] = ((Math.abs(shortLower - longLower) - Math.abs(shortUpper - longUpper)) / shortMiddle) * 100;
  }
}

export function calculatePivotPointsStandard(
  data: CandleData[],
  keyPrefix = 'pivot_standard_',
): void {
  let previousSession: { high: number; low: number; close: number } | null = null;
  let currentSessionKey = '';
  let currentHigh = -Infinity;
  let currentLow = Infinity;
  let currentClose = NaN;

  for (let index = 0; index < data.length; index++) {
    const candle = data[index];
    const sessionKey = timestampToSessionKey(candle.timestamp);
    if (sessionKey !== currentSessionKey) {
      if (currentSessionKey) previousSession = { high: currentHigh, low: currentLow, close: currentClose };
      currentSessionKey = sessionKey;
      currentHigh = candle.high;
      currentLow = candle.low;
      currentClose = candle.close;
    } else {
      currentHigh = Math.max(currentHigh, candle.high);
      currentLow = Math.min(currentLow, candle.low);
      currentClose = candle.close;
    }

    if (!previousSession) {
      ['p', 'r1', 's1', 'r2', 's2', 'r3', 's3'].forEach((key) => { data[index][`${keyPrefix}${key}`] = undefined; });
      continue;
    }

    const p = (previousSession.high + previousSession.low + previousSession.close) / 3;
    const range = previousSession.high - previousSession.low;
    data[index][`${keyPrefix}p`] = p;
    data[index][`${keyPrefix}r1`] = (2 * p) - previousSession.low;
    data[index][`${keyPrefix}s1`] = (2 * p) - previousSession.high;
    data[index][`${keyPrefix}r2`] = p + range;
    data[index][`${keyPrefix}s2`] = p - range;
    data[index][`${keyPrefix}r3`] = previousSession.high + (2 * (p - previousSession.low));
    data[index][`${keyPrefix}s3`] = previousSession.low - (2 * (previousSession.high - p));
  }
}

export function calculateDonchianChannels(
  data: CandleData[],
  period = 20,
  upperKey = 'donchian_upper',
  middleKey = 'donchian_middle',
  lowerKey = 'donchian_lower',
): void {
  if (data.length < period) return;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      data[i][upperKey] = undefined;
      data[i][middleKey] = undefined;
      data[i][lowerKey] = undefined;
      continue;
    }

    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > highest) highest = data[j].high;
      if (data[j].low < lowest) lowest = data[j].low;
    }

    data[i][upperKey] = highest;
    data[i][lowerKey] = lowest;
    data[i][middleKey] = (highest + lowest) / 2;
  }
}

export function calculateKeltnerChannels(
  data: CandleData[],
  period = 20,
  atrPeriod = 10,
  multiplier = 2,
  source: PriceSource = 'close',
  upperKey = 'keltner_upper',
  middleKey = 'keltner_middle',
  lowerKey = 'keltner_lower',
): void {
  if (data.length < period) return;

  const sourceValues = data.map((candle) => sourceValue(candle, source));
  const middle = calculateEmaSeries(sourceValues, Math.max(1, Math.floor(period)));
  const atr = calculateAtrSeries(data, Math.max(1, Math.floor(atrPeriod)));

  for (let i = 0; i < data.length; i++) {
    const middleValue = middle[i];
    const atrValue = atr[i];
    if (typeof middleValue !== 'number' || typeof atrValue !== 'number') {
      data[i][upperKey] = undefined;
      data[i][middleKey] = undefined;
      data[i][lowerKey] = undefined;
      continue;
    }

    data[i][middleKey] = middleValue;
    data[i][upperKey] = middleValue + (multiplier * atrValue);
    data[i][lowerKey] = middleValue - (multiplier * atrValue);
  }
}

export function calculateEnvelope(
  data: CandleData[],
  period = 20,
  percentage = 2.5,
  source: PriceSource = 'close',
  maType: 'sma' | 'ema' = 'sma',
  upperKey = 'envelope_upper',
  middleKey = 'envelope_middle',
  lowerKey = 'envelope_lower',
): void {
  if (data.length < period) return;

  const normalizedPeriod = Math.max(1, Math.floor(period));
  const sourceValues = data.map((candle) => sourceValue(candle, source));
  const basis = maType === 'ema'
    ? calculateEmaSeries(sourceValues, normalizedPeriod)
    : calculateSmaSeries(sourceValues, normalizedPeriod);
  const offsetFactor = Number(percentage) / 100;

  for (let i = 0; i < data.length; i++) {
    const middleValue = basis[i];
    if (typeof middleValue !== 'number') {
      data[i][upperKey] = undefined;
      data[i][middleKey] = undefined;
      data[i][lowerKey] = undefined;
      continue;
    }

    data[i][middleKey] = middleValue;
    data[i][upperKey] = middleValue * (1 + offsetFactor);
    data[i][lowerKey] = middleValue * (1 - offsetFactor);
  }
}

export function calculateHistoricalVolatility(
  data: CandleData[],
  period = 20,
  key = 'historical_volatility',
  source: PriceSource = 'close',
  annualization = 252,
): void {
  if (data.length <= period) return;

  const normalizedPeriod = Math.max(1, Math.floor(period));
  const annualizationFactor = Math.max(1, Number(annualization));
  const values = data.map((candle) => sourceValue(candle, source));
  const logReturns: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let i = 1; i < data.length; i++) {
    if (values[i] <= 0 || values[i - 1] <= 0) continue;
    logReturns[i] = Math.log(values[i] / values[i - 1]);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < normalizedPeriod) {
      data[i][key] = undefined;
      continue;
    }

    let sum = 0;
    let valid = true;
    for (let j = i - normalizedPeriod + 1; j <= i; j++) {
      const value = logReturns[j];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      sum += value;
    }
    if (!valid) {
      data[i][key] = undefined;
      continue;
    }

    const mean = sum / normalizedPeriod;
    let varianceSum = 0;
    for (let j = i - normalizedPeriod + 1; j <= i; j++) {
      const value = logReturns[j] as number;
      varianceSum += (value - mean) ** 2;
    }
    data[i][key] = Math.sqrt(varianceSum / normalizedPeriod) * Math.sqrt(annualizationFactor) * 100;
  }
}

export function calculateVortexIndicator(
  data: CandleData[],
  period = 14,
  positiveKey = 'vortex_positive',
  negativeKey = 'vortex_negative',
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const trueRange = calculateTrueRangeSeries(data);
  const positiveMovement = new Array<number>(data.length).fill(0);
  const negativeMovement = new Array<number>(data.length).fill(0);

  for (let index = 0; index < data.length; index++) {
    data[index][positiveKey] = undefined;
    data[index][negativeKey] = undefined;
    if (index === 0) continue;

    positiveMovement[index] = Math.abs(data[index].high - data[index - 1].low);
    negativeMovement[index] = Math.abs(data[index].low - data[index - 1].high);
  }

  for (let index = normalizedPeriod; index < data.length; index++) {
    let trSum = 0;
    let positiveSum = 0;
    let negativeSum = 0;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) {
      trSum += trueRange[lookback];
      positiveSum += positiveMovement[lookback];
      negativeSum += negativeMovement[lookback];
    }
    if (trSum === 0) continue;

    data[index][positiveKey] = positiveSum / trSum;
    data[index][negativeKey] = negativeSum / trSum;
  }
}

export function calculateChandelierExit(
  data: CandleData[],
  period = 22,
  atrPeriod = 22,
  multiplier = 3,
  longKey = 'chandelier_long',
  shortKey = 'chandelier_short',
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const normalizedAtrPeriod = Math.max(1, Math.floor(atrPeriod));
  const atr = calculateAtrSeries(data, normalizedAtrPeriod);
  const highestHigh = calculateRollingMaxSeries(data.map((candle) => candle.high), normalizedPeriod);
  const lowestLow = calculateRollingMinSeries(data.map((candle) => candle.low), normalizedPeriod);

  for (let index = 0; index < data.length; index++) {
    const highest = highestHigh[index];
    const lowest = lowestLow[index];
    const atrValue = atr[index];
    if (typeof highest !== 'number' || typeof lowest !== 'number' || typeof atrValue !== 'number') {
      data[index][longKey] = undefined;
      data[index][shortKey] = undefined;
      continue;
    }

    data[index][longKey] = highest - (Number(multiplier) * atrValue);
    data[index][shortKey] = lowest + (Number(multiplier) * atrValue);
  }
}

export function calculateChandeKrollStop(
  data: CandleData[],
  atrPeriod = 10,
  stopPeriod = 9,
  multiplier = 1,
  longKey = 'chande_kroll_long',
  shortKey = 'chande_kroll_short',
): void {
  const normalizedAtrPeriod = Math.max(1, Math.floor(atrPeriod));
  const normalizedStopPeriod = Math.max(1, Math.floor(stopPeriod));
  const atr = calculateAtrSeries(data, normalizedAtrPeriod);
  const highestHigh = calculateRollingMaxSeries(data.map((candle) => candle.high), normalizedStopPeriod);
  const lowestLow = calculateRollingMinSeries(data.map((candle) => candle.low), normalizedStopPeriod);
  const basicLong: Array<number | undefined> = new Array(data.length).fill(undefined);
  const basicShort: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const highest = highestHigh[index];
    const lowest = lowestLow[index];
    const atrValue = atr[index];
    if (typeof highest !== 'number' || typeof lowest !== 'number' || typeof atrValue !== 'number') continue;

    basicLong[index] = highest - (Number(multiplier) * atrValue);
    basicShort[index] = lowest + (Number(multiplier) * atrValue);
  }

  const finalLong = calculateRollingMaxSeries(basicLong, normalizedStopPeriod);
  const finalShort = calculateRollingMinSeries(basicShort, normalizedStopPeriod);
  for (let index = 0; index < data.length; index++) {
    data[index][longKey] = finalLong[index];
    data[index][shortKey] = finalShort[index];
  }
}

export function calculateVolatilityStop(
  data: CandleData[],
  atrPeriod = 20,
  multiplier = 2,
  upKey = 'volatility_stop_up',
  downKey = 'volatility_stop_down',
  directionKey = 'volatility_stop_direction',
): void {
  if (data.length < 2) return;

  const normalizedAtrPeriod = Math.max(1, Math.floor(atrPeriod));
  const atr = calculateAtrSeries(data, normalizedAtrPeriod);
  const multiplierValue = Number(multiplier);
  const startIndex = atr.findIndex((value) => typeof value === 'number' && Number.isFinite(value));
  if (startIndex === -1) return;

  for (let index = 0; index < data.length; index++) {
    data[index][upKey] = undefined;
    data[index][downKey] = undefined;
    data[index][directionKey] = undefined;
  }

  let isUpTrend = startIndex > 0 ? data[startIndex].close >= data[startIndex - 1].close : true;
  let currentStop = isUpTrend
    ? data[startIndex].close - (multiplierValue * (atr[startIndex] as number))
    : data[startIndex].close + (multiplierValue * (atr[startIndex] as number));

  for (let index = startIndex; index < data.length; index++) {
    const atrValue = atr[index];
    if (typeof atrValue !== 'number' || !Number.isFinite(atrValue)) continue;
    const distance = multiplierValue * atrValue;

    if (index !== startIndex) {
      if (isUpTrend) {
        currentStop = Math.max(currentStop, data[index].close - distance);
        if (data[index].close < currentStop) {
          isUpTrend = false;
          currentStop = data[index].close + distance;
        }
      } else {
        currentStop = Math.min(currentStop, data[index].close + distance);
        if (data[index].close > currentStop) {
          isUpTrend = true;
          currentStop = data[index].close - distance;
        }
      }
    }

    if (isUpTrend) {
      data[index][upKey] = currentStop;
      data[index][directionKey] = 1;
    } else {
      data[index][downKey] = currentStop;
      data[index][directionKey] = -1;
    }
  }
}

export function calculateMassIndex(
  data: CandleData[],
  emaPeriod = 9,
  sumPeriod = 25,
  key = 'mass_index',
): void {
  const normalizedEmaPeriod = Math.max(1, Math.floor(emaPeriod));
  const normalizedSumPeriod = Math.max(1, Math.floor(sumPeriod));
  const rangeValues = data.map((candle) => Math.max(candle.high - candle.low, 0));
  const emaOne = calculateEmaSeries(rangeValues, normalizedEmaPeriod);
  const emaTwo = calculateEmaSeriesNullable(emaOne, normalizedEmaPeriod);
  const ratioSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const numerator = emaOne[index];
    const denominator = emaTwo[index];
    ratioSeries[index] = typeof numerator === 'number' && typeof denominator === 'number' && denominator !== 0
      ? numerator / denominator
      : undefined;
  }

  for (let index = 0; index < data.length; index++) {
    if (index < normalizedSumPeriod - 1) {
      data[index][key] = undefined;
      continue;
    }

    let sum = 0;
    let valid = true;
    for (let lookback = index - normalizedSumPeriod + 1; lookback <= index; lookback++) {
      const value = ratioSeries[lookback];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      sum += value;
    }
    data[index][key] = valid ? sum : undefined;
  }
}

export function calculateSupertrend(
  data: CandleData[],
  atrPeriod = 10,
  multiplier = 3,
  upKey = 'supertrend_up',
  downKey = 'supertrend_down',
  directionKey = 'supertrend_direction',
): void {
  if (data.length < 2) return;

  const normalizedAtrPeriod = Math.max(1, Math.floor(atrPeriod));
  const normalizedMultiplier = Number(multiplier);
  const atr = calculateAtrSeries(data, normalizedAtrPeriod);
  const finalUpper: Array<number | undefined> = new Array(data.length).fill(undefined);
  const finalLower: Array<number | undefined> = new Array(data.length).fill(undefined);
  const trendValue: Array<number | undefined> = new Array(data.length).fill(undefined);
  let lastValidIndex = -1;

  for (let index = 0; index < data.length; index++) {
    data[index][upKey] = undefined;
    data[index][downKey] = undefined;
    data[index][directionKey] = undefined;

    const atrValue = atr[index];
    if (typeof atrValue !== 'number' || !Number.isFinite(atrValue)) continue;

    const hl2 = (data[index].high + data[index].low) / 2;
    const basicUpper = hl2 + (normalizedMultiplier * atrValue);
    const basicLower = hl2 - (normalizedMultiplier * atrValue);

    if (lastValidIndex === -1) {
      finalUpper[index] = basicUpper;
      finalLower[index] = basicLower;
      trendValue[index] = data[index].close >= basicLower ? basicLower : basicUpper;
    } else {
      const previousUpper = finalUpper[lastValidIndex] ?? basicUpper;
      const previousLower = finalLower[lastValidIndex] ?? basicLower;
      const previousClose = data[lastValidIndex].close;

      finalUpper[index] = basicUpper < previousUpper || previousClose > previousUpper
        ? basicUpper
        : previousUpper;
      finalLower[index] = basicLower > previousLower || previousClose < previousLower
        ? basicLower
        : previousLower;

      const previousTrend = trendValue[lastValidIndex];
      if (previousTrend === previousUpper) {
        trendValue[index] = data[index].close <= (finalUpper[index] as number)
          ? finalUpper[index]
          : finalLower[index];
      } else {
        trendValue[index] = data[index].close >= (finalLower[index] as number)
          ? finalLower[index]
          : finalUpper[index];
      }
    }

    if (trendValue[index] === finalLower[index]) {
      data[index][upKey] = trendValue[index];
      data[index][directionKey] = 1;
    } else {
      data[index][downKey] = trendValue[index];
      data[index][directionKey] = -1;
    }

    lastValidIndex = index;
  }
}

export function calculateParabolicSAR(
  data: CandleData[],
  step = 0.02,
  maxStep = 0.2,
  key = 'parabolic_sar',
): void {
  if (data.length < 2) return;

  const accelerationStep = Math.max(Number(step), 0.0001);
  const accelerationMax = Math.max(Number(maxStep), accelerationStep);

  for (let index = 0; index < data.length; index++) data[index][key] = undefined;

  let isUpTrend = data[1].close >= data[0].close;
  let extremePoint = isUpTrend
    ? Math.max(data[0].high, data[1].high)
    : Math.min(data[0].low, data[1].low);
  let sar = isUpTrend
    ? Math.min(data[0].low, data[1].low)
    : Math.max(data[0].high, data[1].high);
  let accelerationFactor = accelerationStep;
  data[1][key] = sar;

  for (let index = 2; index < data.length; index++) {
    sar += accelerationFactor * (extremePoint - sar);

    if (isUpTrend) {
      sar = Math.min(sar, data[index - 1].low, data[index - 2].low);
      if (data[index].low < sar) {
        isUpTrend = false;
        sar = extremePoint;
        extremePoint = data[index].low;
        accelerationFactor = accelerationStep;
      } else if (data[index].high > extremePoint) {
        extremePoint = data[index].high;
        accelerationFactor = Math.min(accelerationFactor + accelerationStep, accelerationMax);
      }
    } else {
      sar = Math.max(sar, data[index - 1].high, data[index - 2].high);
      if (data[index].high > sar) {
        isUpTrend = true;
        sar = extremePoint;
        extremePoint = data[index].high;
        accelerationFactor = accelerationStep;
      } else if (data[index].low < extremePoint) {
        extremePoint = data[index].low;
        accelerationFactor = Math.min(accelerationFactor + accelerationStep, accelerationMax);
      }
    }

    data[index][key] = sar;
  }
}

export function calculateLinearRegressionChannel(
  data: CandleData[],
  period = 100,
  source: PriceSource = 'close',
  deviations = 2,
  upperKey = 'linear_regression_upper',
  middleKey = 'linear_regression_middle',
  lowerKey = 'linear_regression_lower',
): void {
  const normalizedPeriod = Math.max(2, Math.floor(period));
  const normalizedDeviations = Number(deviations);
  const values = data.map((candle) => sourceValue(candle, source));

  for (let index = 0; index < data.length; index++) {
    data[index][upperKey] = undefined;
    data[index][middleKey] = undefined;
    data[index][lowerKey] = undefined;

    if (index < normalizedPeriod - 1) continue;
    const regression = calculateLinearRegressionWindow(values, index, normalizedPeriod);
    if (!regression) continue;

    data[index][middleKey] = regression.middle;
    data[index][upperKey] = regression.middle + (normalizedDeviations * regression.deviation);
    data[index][lowerKey] = regression.middle - (normalizedDeviations * regression.deviation);
  }
}

export function calculateChoppinessIndex(data: CandleData[], period = 14, key = 'choppiness_index'): void {
  if (data.length < period) return;

  const tr = calculateTrueRangeSeries(data);
  const normalizedPeriod = Math.max(2, Math.floor(period));
  const logDivisor = Math.log10(normalizedPeriod);

  for (let i = 0; i < data.length; i++) {
    if (i < normalizedPeriod - 1) {
      data[i][key] = undefined;
      continue;
    }

    let trSum = 0;
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - normalizedPeriod + 1; j <= i; j++) {
      trSum += tr[j];
      if (data[j].high > highestHigh) highestHigh = data[j].high;
      if (data[j].low < lowestLow) lowestLow = data[j].low;
    }

    const range = highestHigh - lowestLow;
    data[i][key] = range <= 0 || trSum <= 0 || logDivisor === 0
      ? undefined
      : (100 * Math.log10(trSum / range)) / logDivisor;
  }
}
