// indicators/calc/movingAverages.ts
// Version: 1.9.0 | Updated: 2026-04-25 | By: GitHub Copilot

import type { CandleData } from '../../data/DataStore';

export type MAMethod = 'sma' | 'ema' | 'smma' | 'lwma' | 'hma';
export type MASource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';

function sourceValue(candle: CandleData, source: MASource): number {
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

function applySeries(data: CandleData[], key: string, series: Array<number | undefined>, shift = 0): void {
  for (let i = 0; i < data.length; i++) {
    const srcIdx = i - shift;
    data[i][key] = srcIdx >= 0 && srcIdx < series.length ? series[srcIdx] : undefined;
  }
}

export function calcSmaSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function calcEmaSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  out[period - 1] = seed / period;
  for (let i = period; i < values.length; i++) {
    out[i] = values[i] * k + (out[i - 1] as number) * (1 - k);
  }
  return out;
}

function calcEmaSeriesNullable(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let seedSum = 0;
  let seedCount = 0;
  let previous: number | undefined;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value !== 'number' || !isFinite(value)) continue;

    if (previous === undefined) {
      seedSum += value;
      seedCount += 1;
      if (seedCount === period) {
        previous = seedSum / period;
        out[i] = previous;
      }
      continue;
    }

    previous = value * k + previous * (1 - k);
    out[i] = previous;
  }

  return out;
}

export function calcSmmaSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  out[period - 1] = seed / period;
  for (let i = period; i < values.length; i++) {
    out[i] = ((out[i - 1] as number) * (period - 1) + values[i]) / period;
  }
  return out;
}

function calcWmaSeries(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const weightSum = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let acc = 0;
    let valid = true;
    for (let j = 0; j < period; j++) {
      const val = values[i - j];
      if (typeof val !== 'number' || !isFinite(val)) {
        valid = false;
        break;
      }
      acc += val * (period - j);
    }
    out[i] = valid ? acc / weightSum : undefined;
  }
  return out;
}

export function calcAlmaSeries(values: number[], period: number, offset: number, sigma: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;

  const m = offset * (period - 1);
  const s = sigma === 0 ? 1e-9 : period / sigma;
  const weights = new Array<number>(period).fill(0).map((_, index) => Math.exp(-((index - m) ** 2) / (2 * (s ** 2))));
  const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;

  for (let i = period - 1; i < values.length; i++) {
    let acc = 0;
    for (let j = 0; j < period; j++) {
      acc += values[i - period + 1 + j] * weights[j];
    }
    out[i] = acc / weightSum;
  }

  return out;
}

export function calcDemaSeries(values: number[], period: number): Array<number | undefined> {
  const ema1 = calcEmaSeries(values, period);
  const ema2 = calcEmaSeriesNullable(ema1, period);
  return ema1.map((value, index) => {
    const smooth = ema2[index];
    return typeof value === 'number' && typeof smooth === 'number' ? (2 * value) - smooth : undefined;
  });
}

export function calcTemaSeries(values: number[], period: number): Array<number | undefined> {
  const ema1 = calcEmaSeries(values, period);
  const ema2 = calcEmaSeriesNullable(ema1, period);
  const ema3 = calcEmaSeriesNullable(ema2, period);
  return ema1.map((value, index) => {
    const smooth2 = ema2[index];
    const smooth3 = ema3[index];
    return typeof value === 'number' && typeof smooth2 === 'number' && typeof smooth3 === 'number'
      ? (3 * value) - (3 * smooth2) + smooth3
      : undefined;
  });
}

export function calcKamaSeries(values: number[], period: number, fastPeriod: number, slowPeriod: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;

  const fastest = 2 / (Math.max(1, fastPeriod) + 1);
  const slowest = 2 / (Math.max(1, slowPeriod) + 1);
  let previous = values[period - 1];
  out[period - 1] = previous;

  for (let i = period; i < values.length; i++) {
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(values[j] - values[j - 1]);
    }
    const change = Math.abs(values[i] - values[i - period]);
    const efficiencyRatio = volatility === 0 ? 0 : change / volatility;
    const smoothingConstant = (efficiencyRatio * (fastest - slowest) + slowest) ** 2;
    previous = previous + smoothingConstant * (values[i] - previous);
    out[i] = previous;
  }

  return out;
}

export function calcMcGinleyDynamicSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;

  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let previous = seed / period;
  out[period - 1] = previous;

  for (let i = period; i < values.length; i++) {
    const current = values[i];
    const ratio = previous === 0 ? 1 : current / previous;
    const denominator = Math.max(1, period * (ratio ** 4));
    previous = previous + ((current - previous) / denominator);
    out[i] = previous;
  }

  return out;
}

export function calcVwmaSeries(values: number[], volumes: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  let weightedSum = 0;
  let volumeSum = 0;

  for (let i = 0; i < values.length; i++) {
    const weightedValue = values[i] * volumes[i];
    weightedSum += weightedValue;
    volumeSum += volumes[i];

    if (i >= period) {
      weightedSum -= values[i - period] * volumes[i - period];
      volumeSum -= volumes[i - period];
    }

    if (i >= period - 1) out[i] = volumeSum === 0 ? undefined : weightedSum / volumeSum;
  }

  return out;
}

export function calcLeastSquaresMovingAverageSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (period <= 1) return values.map((value) => value);

  const xMean = (period - 1) / 2;
  const denominator = (period * (period - 1) * (period + 1)) / 12;

  for (let i = period - 1; i < values.length; i++) {
    let ySum = 0;
    let covariance = 0;
    for (let j = 0; j < period; j++) {
      const value = values[i - period + 1 + j];
      ySum += value;
      covariance += (j - xMean) * value;
    }
    const yMean = ySum / period;
    const slope = denominator === 0 ? 0 : covariance / denominator;
    const intercept = yMean - slope * xMean;
    out[i] = intercept + slope * (period - 1);
  }

  return out;
}

export function calculateSMA(data: CandleData[], period: number, key = `sma${period}`, source: MASource = 'close'): void {
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcSmaSeries(values, period), 0);
}

export function calculateEMA(data: CandleData[], period: number, key = `ema${period}`, source: MASource = 'close'): void {
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcEmaSeries(values, period), 0);
}

export function calculateALMA(
  data: CandleData[],
  period = 9,
  key = 'alma',
  source: MASource = 'close',
  shift = 0,
  offset = 0.85,
  sigma = 6,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcAlmaSeries(values, normalizedPeriod, offset, sigma), shift);
}

export function calculateDEMA(
  data: CandleData[],
  period = 20,
  key = 'dema',
  source: MASource = 'close',
  shift = 0,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcDemaSeries(values, normalizedPeriod), shift);
}

export function calculateTEMA(
  data: CandleData[],
  period = 20,
  key = 'tema',
  source: MASource = 'close',
  shift = 0,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcTemaSeries(values, normalizedPeriod), shift);
}

export function calculateKAMA(
  data: CandleData[],
  period = 10,
  key = 'kama',
  source: MASource = 'close',
  shift = 0,
  fastPeriod = 2,
  slowPeriod = 30,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcKamaSeries(values, normalizedPeriod, fastPeriod, slowPeriod), shift);
}

export function calculateMcGinleyDynamic(
  data: CandleData[],
  period = 14,
  key = 'mcginley_dynamic',
  source: MASource = 'close',
  shift = 0,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcMcGinleyDynamicSeries(values, normalizedPeriod), shift);
}

export function calculateVWMA(
  data: CandleData[],
  period = 20,
  key = 'vwma',
  source: MASource = 'close',
  shift = 0,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  const volumes = data.map((c) => c.volume ?? 0);
  applySeries(data, key, calcVwmaSeries(values, volumes, normalizedPeriod), shift);
}

export function calculateLeastSquaresMovingAverage(
  data: CandleData[],
  period = 25,
  key = 'least_squares_moving_average',
  source: MASource = 'close',
  shift = 0,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, key, calcLeastSquaresMovingAverageSeries(values, normalizedPeriod), shift);
}

export function calculateWilliamsAlligator(
  data: CandleData[],
  jawPeriod = 13,
  jawShift = 8,
  teethPeriod = 8,
  teethShift = 5,
  lipsPeriod = 5,
  lipsShift = 3,
  source: MASource = 'hl2',
  jawKey = 'alligator_jaw',
  teethKey = 'alligator_teeth',
  lipsKey = 'alligator_lips',
): void {
  const values = data.map((c) => sourceValue(c, source));
  applySeries(data, jawKey, calcSmmaSeries(values, Math.max(1, Math.floor(jawPeriod))), Math.trunc(jawShift));
  applySeries(data, teethKey, calcSmmaSeries(values, Math.max(1, Math.floor(teethPeriod))), Math.trunc(teethShift));
  applySeries(data, lipsKey, calcSmmaSeries(values, Math.max(1, Math.floor(lipsPeriod))), Math.trunc(lipsShift));
}

export function calculateMovingAverageRibbon(
  data: CandleData[],
  periods: number[] = [20, 30, 40, 50, 60, 70],
  method: MAMethod = 'sma',
  source: MASource = 'close',
  shift = 0,
  keyPrefix = 'ma_ribbon_',
): void {
  const normalizedPeriods = periods.slice(0, 8).map((period) => Math.max(1, Math.floor(period)));
  for (let index = 0; index < normalizedPeriods.length; index++) {
    calculateMA(data, normalizedPeriods[index], method, source, shift, `${keyPrefix}${index + 1}`);
  }
}

export function calculateMedian(data: CandleData[], key = 'median'): void {
  for (let index = 0; index < data.length; index++) {
    data[index][key] = (data[index].high + data[index].low) / 2;
  }
}

export function calculateMA(
  data: CandleData[],
  period: number,
  method: MAMethod,
  source: MASource,
  shift: number,
  key: string,
): void {
  const values = data.map((c) => sourceValue(c, source));
  let raw: Array<number | undefined>;

  if (method === 'sma') raw = calcSmaSeries(values, period);
  else if (method === 'ema') raw = calcEmaSeries(values, period);
  else if (method === 'smma') raw = calcSmmaSeries(values, period);
  else if (method === 'lwma') raw = calcWmaSeries(values, period);
  else {
    const half = Math.max(1, Math.floor(period / 2));
    const sqrt = Math.max(1, Math.floor(Math.sqrt(period)));
    const halfWma = calcWmaSeries(values, half);
    const fullWma = calcWmaSeries(values, period);
    const diff: Array<number | undefined> = values.map((_, idx) => {
      const a = halfWma[idx];
      const b = fullWma[idx];
      return typeof a === 'number' && typeof b === 'number' ? (2 * a) - b : undefined;
    });
    raw = calcWmaSeries(diff, sqrt);
  }

  applySeries(data, key, raw, shift);
}
