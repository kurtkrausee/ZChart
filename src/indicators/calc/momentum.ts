// indicators/calc/momentum.ts
// Version: 1.15.0 | Updated: 2026-04-25 | By: GitHub Copilot

import type { CandleData } from '../../data/DataStore';

type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';

export function calculateSmaSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
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
  if (values.length < period) return out;
  const alpha = 2 / (period + 1);
  let seedSum = 0;
  let seedCount = 0;
  let previous: number | undefined;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    if (previous === undefined) {
      seedSum += value;
      seedCount += 1;
      if (seedCount === period) {
        previous = seedSum / period;
        out[i] = previous;
      }
      continue;
    }

    previous = value * alpha + previous * (1 - alpha);
    out[i] = previous;
  }

  return out;
}

function calculateWilderSeriesNullable(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const normalizedPeriod = Math.max(1, Math.floor(period));
  let seedSum = 0;
  let seedCount = 0;
  let previous: number | undefined;

  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    if (previous === undefined) {
      seedSum += value;
      seedCount += 1;
      if (seedCount === normalizedPeriod) {
        previous = seedSum / normalizedPeriod;
        out[index] = previous;
      }
      continue;
    }

    previous = ((previous * (normalizedPeriod - 1)) + value) / normalizedPeriod;
    out[index] = previous;
  }

  return out;
}

function calculateSmaSeriesNullable(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    let valid = true;
    for (let j = i - period + 1; j <= i; j++) {
      const value = values[j];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      sum += value;
    }
    out[i] = valid ? sum / period : undefined;
  }
  return out;
}

function calculateWmaSeriesNullable(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const weightSum = (period * (period + 1)) / 2;

  for (let i = period - 1; i < values.length; i++) {
    let weighted = 0;
    let valid = true;
    for (let j = 0; j < period; j++) {
      const value = values[i - j];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      weighted += value * (period - j);
    }
    out[i] = valid ? weighted / weightSum : undefined;
  }

  return out;
}

function calculateWeightedSeries(values: Array<number | undefined>): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  for (let index = 3; index < values.length; index++) {
    const current = values[index];
    const previous1 = values[index - 1];
    const previous2 = values[index - 2];
    const previous3 = values[index - 3];
    if (
      typeof current !== 'number' || !Number.isFinite(current)
      || typeof previous1 !== 'number' || !Number.isFinite(previous1)
      || typeof previous2 !== 'number' || !Number.isFinite(previous2)
      || typeof previous3 !== 'number' || !Number.isFinite(previous3)
    ) {
      continue;
    }
    out[index] = (current + (2 * previous1) + (2 * previous2) + previous3) / 6;
  }
  return out;
}

function calculateStdDevSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const normalizedPeriod = Math.max(1, Math.floor(period));
  for (let index = normalizedPeriod - 1; index < values.length; index++) {
    let sum = 0;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) sum += values[lookback];
    const mean = sum / normalizedPeriod;
    let varianceSum = 0;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) {
      varianceSum += (values[lookback] - mean) ** 2;
    }
    out[index] = Math.sqrt(varianceSum / normalizedPeriod);
  }
  return out;
}

function calculatePercentRankSeries(values: Array<number | undefined>, period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  const normalizedPeriod = Math.max(1, Math.floor(period));
  for (let index = normalizedPeriod - 1; index < values.length; index++) {
    const current = values[index];
    if (typeof current !== 'number' || !Number.isFinite(current)) continue;
    let count = 0;
    let valid = true;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) {
      const value = values[lookback];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      if (value < current) count += 1;
    }
    out[index] = valid ? (count / normalizedPeriod) * 100 : undefined;
  }
  return out;
}

function calculateAverageRanks(values: number[]): number[] {
  const ranks = new Array<number>(values.length).fill(0);
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);

  let start = 0;
  while (start < sorted.length) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[start].value) end += 1;
    const averageRank = ((start + 1) + (end + 1)) / 2;
    for (let index = start; index <= end; index++) ranks[sorted[index].index] = averageRank;
    start = end + 1;
  }

  return ranks;
}

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

export function calculateRsiSeries(values: number[], period: number): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (values.length <= period) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
  }

  return out;
}

export function calculateRSI(data: CandleData[], period = 14, key = 'rsi'): void {
  const rsi = calculateRsiSeries(data.map((candle) => candle.close), Math.max(1, Math.floor(period)));
  for (let i = 0; i < data.length; i++) data[i][key] = rsi[i];
}

export function calculateStochastic(
  data: CandleData[],
  kPeriod = 14,
  smoothK = 3,
  dPeriod = 3,
  kKey = 'stoch_k',
  dKey = 'stoch_d',
): void {
  if (data.length < kPeriod) return;
  const rawK: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let i = kPeriod - 1; i < data.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (data[j].high > highest) highest = data[j].high;
      if (data[j].low < lowest) lowest = data[j].low;
    }
    rawK[i] = highest === lowest ? 50 : ((data[i].close - lowest) / (highest - lowest)) * 100;
  }

  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1 + smoothK - 1) {
      data[i][kKey] = undefined;
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = i - smoothK + 1; j <= i; j++) {
      if (rawK[j] !== undefined) {
        sum += rawK[j] as number;
        count++;
      }
    }
    data[i][kKey] = count > 0 ? sum / count : undefined;
  }

  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1 + smoothK - 1 + dPeriod - 1) {
      data[i][dKey] = undefined;
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      if (data[j][kKey] !== undefined) {
        sum += data[j][kKey] as number;
        count++;
      }
    }
    data[i][dKey] = count > 0 ? sum / count : undefined;
  }
}

export function calculateCciSeries(data: CandleData[], period: number): Array<number | undefined> {
  const output: Array<number | undefined> = new Array(data.length).fill(undefined);
  if (data.length < period) return output;
  const typicalPrice = data.map((c) => (c.high + c.low + c.close) / 3);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let tpSum = 0;
    for (let j = i - period + 1; j <= i; j++) tpSum += typicalPrice[j];
    const ma = tpSum / period;

    let meanDeviation = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDeviation += Math.abs(typicalPrice[j] - ma);
    }
    meanDeviation /= period;

    output[i] = meanDeviation === 0 ? undefined : (typicalPrice[i] - ma) / (0.015 * meanDeviation);
  }
  return output;
}

export function calculateCCI(data: CandleData[], period = 20, key = 'cci'): void {
  const cci = calculateCciSeries(data, Math.max(1, Math.floor(period)));
  for (let i = 0; i < data.length; i++) data[i][key] = cci[i];
}

export function calculateWoodiesCCI(
  data: CandleData[],
  trendPeriod = 14,
  turboPeriod = 6,
  trendKey = 'woodies_cci',
  turboKey = 'woodies_turbo_cci',
): void {
  const trend = calculateCciSeries(data, Math.max(1, Math.floor(trendPeriod)));
  const turbo = calculateCciSeries(data, Math.max(1, Math.floor(turboPeriod)));
  for (let index = 0; index < data.length; index++) {
    data[index][trendKey] = trend[index];
    data[index][turboKey] = turbo[index];
  }
}

export function calculateROC(data: CandleData[], period = 12, key = 'roc'): void {
  if (data.length <= period) return;
  for (let i = 0; i < data.length; i++) {
    if (i < period || data[i - period].close === 0) {
      data[i][key] = undefined;
      continue;
    }
    data[i][key] = ((data[i].close - data[i - period].close) / data[i - period].close) * 100;
  }
}

export function calculateWilliamsR(data: CandleData[], period = 14, key = 'williams_r'): void {
  if (data.length < period) return;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      data[i][key] = undefined;
      continue;
    }

    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > highestHigh) highestHigh = data[j].high;
      if (data[j].low < lowestLow) lowestLow = data[j].low;
    }

    const range = highestHigh - lowestLow;
    data[i][key] = range === 0 ? undefined : -100 * ((highestHigh - data[i].close) / range);
  }
}

export function calculateAroon(
  data: CandleData[],
  period = 14,
  upKey = 'aroon_up',
  downKey = 'aroon_down',
): void {
  if (data.length < period) return;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      data[i][upKey] = undefined;
      data[i][downKey] = undefined;
      continue;
    }

    let highest = -Infinity;
    let lowest = Infinity;
    let highIndex = i - period + 1;
    let lowIndex = i - period + 1;

    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high >= highest) {
        highest = data[j].high;
        highIndex = j;
      }
      if (data[j].low <= lowest) {
        lowest = data[j].low;
        lowIndex = j;
      }
    }

    data[i][upKey] = ((period - (i - highIndex)) / period) * 100;
    data[i][downKey] = ((period - (i - lowIndex)) / period) * 100;
  }
}

export function calculateAroonOscillator(data: CandleData[], period = 14, key = 'aroon_oscillator'): void {
  calculateAroon(data, period, 'aroon_up', 'aroon_down');
  for (let i = 0; i < data.length; i++) {
    const up = data[i].aroon_up;
    const down = data[i].aroon_down;
    data[i][key] = typeof up === 'number' && typeof down === 'number' ? up - down : undefined;
  }
}

export function calculateBalanceOfPower(data: CandleData[], key = 'balance_of_power'): void {
  for (let i = 0; i < data.length; i++) {
    const range = data[i].high - data[i].low;
    data[i][key] = range === 0 ? undefined : (data[i].close - data[i].open) / range;
  }
}

export function calculateMomentum(data: CandleData[], period = 10, key = 'momentum'): void {
  if (data.length <= period) return;
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      data[i][key] = undefined;
      continue;
    }
    data[i][key] = data[i].close - data[i - period].close;
  }
}

export function calculateCorrelationCoefficient(
  data: CandleData[],
  period = 20,
  source: PriceSource = 'close',
  key = 'correlation_coefficient',
): void {
  const normalizedPeriod = Math.max(2, Math.floor(period));
  const values = data.map((candle) => sourceValue(candle, source));
  const yMean = (normalizedPeriod - 1) / 2;
  let yVarianceSum = 0;
  for (let index = 0; index < normalizedPeriod; index++) {
    yVarianceSum += (index - yMean) ** 2;
  }

  for (let index = 0; index < data.length; index++) {
    if (index < normalizedPeriod - 1) {
      data[index][key] = undefined;
      continue;
    }

    let xSum = 0;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) xSum += values[lookback];
    const xMean = xSum / normalizedPeriod;

    let covarianceSum = 0;
    let xVarianceSum = 0;
    for (let offset = 0; offset < normalizedPeriod; offset++) {
      const value = values[index - normalizedPeriod + 1 + offset];
      covarianceSum += (value - xMean) * (offset - yMean);
      xVarianceSum += (value - xMean) ** 2;
    }

    const denominator = Math.sqrt(xVarianceSum * yVarianceSum);
    data[index][key] = denominator === 0 ? undefined : covarianceSum / denominator;
  }
}

export function calculateRankCorrelationIndex(
  data: CandleData[],
  period = 9,
  source: PriceSource = 'close',
  key = 'rank_correlation_index',
): void {
  const normalizedPeriod = Math.max(2, Math.floor(period));
  const values = data.map((candle) => sourceValue(candle, source));

  for (let index = 0; index < data.length; index++) {
    if (index < normalizedPeriod - 1) {
      data[index][key] = undefined;
      continue;
    }

    const window = values.slice(index - normalizedPeriod + 1, index + 1);
    if (window.some((value) => !Number.isFinite(value))) {
      data[index][key] = undefined;
      continue;
    }

    const ranks = calculateAverageRanks(window);
    let squaredDiffSum = 0;
    for (let offset = 0; offset < normalizedPeriod; offset++) {
      squaredDiffSum += ((offset + 1) - ranks[offset]) ** 2;
    }

    data[index][key] = (1 - ((6 * squaredDiffSum) / (normalizedPeriod * ((normalizedPeriod ** 2) - 1)))) * 100;
  }
}

export function calculateRciRibbon(
  data: CandleData[],
  shortPeriod = 9,
  midPeriod = 26,
  longPeriod = 52,
  source: PriceSource = 'close',
  shortKey = 'rci_ribbon_short',
  midKey = 'rci_ribbon_mid',
  longKey = 'rci_ribbon_long',
): void {
  calculateRankCorrelationIndex(data, shortPeriod, source, shortKey);
  calculateRankCorrelationIndex(data, midPeriod, source, midKey);
  calculateRankCorrelationIndex(data, longPeriod, source, longKey);
}

export function calculateTrendStrengthIndex(
  data: CandleData[],
  period = 20,
  source: PriceSource = 'close',
  key = 'trend_strength_index',
): void {
  const tempKey = '__trend_strength_correlation';
  calculateCorrelationCoefficient(data, period, source, tempKey);
  for (let index = 0; index < data.length; index++) {
    const value = data[index][tempKey];
    data[index][key] = typeof value === 'number' && Number.isFinite(value) ? Math.abs(value) * 100 : undefined;
    delete data[index][tempKey];
  }
}

export function calculateConnorsRSI(
  data: CandleData[],
  rsiPeriod = 3,
  streakPeriod = 2,
  rankPeriod = 100,
  source: PriceSource = 'close',
  key = 'connors_rsi',
): void {
  const values = data.map((candle) => sourceValue(candle, source));
  const normalizedRsi = Math.max(1, Math.floor(rsiPeriod));
  const normalizedStreak = Math.max(1, Math.floor(streakPeriod));
  const normalizedRank = Math.max(2, Math.floor(rankPeriod));
  const priceRsi = calculateRsiSeries(values, normalizedRsi);
  const streaks = new Array<number>(data.length).fill(0);
  const oneDayRoc: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 1; index < data.length; index++) {
    if (values[index] > values[index - 1]) {
      streaks[index] = streaks[index - 1] > 0 ? streaks[index - 1] + 1 : 1;
    } else if (values[index] < values[index - 1]) {
      streaks[index] = streaks[index - 1] < 0 ? streaks[index - 1] - 1 : -1;
    }
    oneDayRoc[index] = values[index - 1] !== 0 ? ((values[index] - values[index - 1]) / values[index - 1]) * 100 : 0;
  }

  const streakRsi = calculateRsiSeries(streaks, normalizedStreak);
  const percentRank = calculatePercentRankSeries(oneDayRoc, normalizedRank);
  for (let index = 0; index < data.length; index++) {
    const parts = [priceRsi[index], streakRsi[index], percentRank[index]];
    data[index][key] = parts.every((value) => typeof value === 'number' && Number.isFinite(value))
      ? (Number(parts[0]) + Number(parts[1]) + Number(parts[2])) / 3
      : undefined;
  }
}

export function calculatePerformance(
  data: CandleData[],
  source: PriceSource = 'close',
  key = 'performance',
): void {
  let base: number | undefined;
  for (let index = 0; index < data.length; index++) {
    const value = sourceValue(data[index], source);
    if (base === undefined) {
      base = value;
      data[index][key] = base === 0 ? undefined : 0;
      continue;
    }
    data[index][key] = base === 0 ? undefined : ((value / base) - 1) * 100;
  }
}

export function calculateAwesomeOscillator(
  data: CandleData[],
  shortPeriod = 5,
  longPeriod = 34,
  key = 'awesome_oscillator',
): void {
  const medianPrice = data.map((candle) => (candle.high + candle.low) / 2);
  const fast = calculateSmaSeries(medianPrice, shortPeriod);
  const slow = calculateSmaSeries(medianPrice, longPeriod);
  for (let i = 0; i < data.length; i++) {
    const fastValue = fast[i];
    const slowValue = slow[i];
    data[i][key] = typeof fastValue === 'number' && typeof slowValue === 'number'
      ? fastValue - slowValue
      : undefined;
  }
}

export function calculateBullBearPower(
  data: CandleData[],
  period = 13,
  bullKey = 'bull_power',
  bearKey = 'bear_power',
): void {
  const ema = calculateEmaSeries(data.map((candle) => candle.close), period);
  for (let i = 0; i < data.length; i++) {
    const emaValue = ema[i];
    if (typeof emaValue !== 'number') {
      data[i][bullKey] = undefined;
      data[i][bearKey] = undefined;
      continue;
    }
    data[i][bullKey] = data[i].high - emaValue;
    data[i][bearKey] = data[i].low - emaValue;
  }
}

export function calculateTRIX(
  data: CandleData[],
  period = 15,
  key = 'trix',
  source: PriceSource = 'close',
  shift = 0,
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const normalizedShift = Math.trunc(shift);
  const values = data.map((candle) => sourceValue(candle, source));
  const ema1 = calculateEmaSeries(values, normalizedPeriod);
  const ema2 = calculateEmaSeriesNullable(ema1, normalizedPeriod);
  const ema3 = calculateEmaSeriesNullable(ema2, normalizedPeriod);
  const out: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let i = 1; i < data.length; i++) {
    const current = ema3[i];
    const previous = ema3[i - 1];
    out[i] = typeof current === 'number' && typeof previous === 'number' && previous !== 0
      ? ((current - previous) / previous) * 100
      : undefined;
  }

  for (let i = 0; i < data.length; i++) {
    const srcIdx = i - normalizedShift;
    data[i][key] = srcIdx >= 0 && srcIdx < out.length ? out[srcIdx] : undefined;
  }
}

export function calculateCoppockCurve(
  data: CandleData[],
  longPeriod = 14,
  shortPeriod = 11,
  wmaPeriod = 10,
  key = 'coppock_curve',
  source: PriceSource = 'close',
): void {
  const values = data.map((candle) => sourceValue(candle, source));
  const longRoc: Array<number | undefined> = new Array(data.length).fill(undefined);
  const shortRoc: Array<number | undefined> = new Array(data.length).fill(undefined);
  const rocSum: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let i = 0; i < data.length; i++) {
    if (i >= longPeriod && values[i - longPeriod] !== 0) {
      longRoc[i] = ((values[i] - values[i - longPeriod]) / values[i - longPeriod]) * 100;
    }
    if (i >= shortPeriod && values[i - shortPeriod] !== 0) {
      shortRoc[i] = ((values[i] - values[i - shortPeriod]) / values[i - shortPeriod]) * 100;
    }
    const longValue = longRoc[i];
    const shortValue = shortRoc[i];
    rocSum[i] = typeof longValue === 'number' && typeof shortValue === 'number'
      ? longValue + shortValue
      : undefined;
  }

  const coppock = calculateWmaSeriesNullable(rocSum, Math.max(1, Math.floor(wmaPeriod)));
  for (let i = 0; i < data.length; i++) data[i][key] = coppock[i];
}

export function calculateUltimateOscillator(
  data: CandleData[],
  shortPeriod = 7,
  midPeriod = 14,
  longPeriod = 28,
  key = 'ultimate_oscillator',
): void {
  if (!data.length) return;

  const buyingPressure = new Array<number>(data.length).fill(0);
  const trueRange = new Array<number>(data.length).fill(0);

  for (let i = 0; i < data.length; i++) {
    const previousClose = i > 0 ? data[i - 1].close : data[i].close;
    const minLow = Math.min(data[i].low, previousClose);
    const maxHigh = Math.max(data[i].high, previousClose);
    buyingPressure[i] = data[i].close - minLow;
    trueRange[i] = maxHigh - minLow;
  }

  const sumWindow = (values: number[], endIndex: number, period: number): number => {
    let sum = 0;
    for (let index = endIndex - period + 1; index <= endIndex; index++) sum += values[index];
    return sum;
  };

  for (let i = 0; i < data.length; i++) {
    if (i < longPeriod - 1) {
      data[i][key] = undefined;
      continue;
    }

    const shortRange = sumWindow(trueRange, i, shortPeriod);
    const midRange = sumWindow(trueRange, i, midPeriod);
    const longRange = sumWindow(trueRange, i, longPeriod);
    if (shortRange === 0 || midRange === 0 || longRange === 0) {
      data[i][key] = undefined;
      continue;
    }

    const avgShort = sumWindow(buyingPressure, i, shortPeriod) / shortRange;
    const avgMid = sumWindow(buyingPressure, i, midPeriod) / midRange;
    const avgLong = sumWindow(buyingPressure, i, longPeriod) / longRange;
    data[i][key] = 100 * ((4 * avgShort) + (2 * avgMid) + avgLong) / 7;
  }
}

export function calculateUlcerIndex(
  data: CandleData[],
  period = 14,
  key = 'ulcer_index',
  source: PriceSource = 'close',
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((candle) => sourceValue(candle, source));
  const rollingHigh: Array<number | undefined> = new Array(data.length).fill(undefined);
  const squaredDrawdowns: Array<number | undefined> = new Array(data.length).fill(undefined);
  let squaredSum = 0;

  for (let i = 0; i < data.length; i++) {
    if (i >= normalizedPeriod - 1) {
      let highest = -Infinity;
      for (let j = i - normalizedPeriod + 1; j <= i; j++) {
        if (values[j] > highest) highest = values[j];
      }
      rollingHigh[i] = Number.isFinite(highest) && highest > 0 ? highest : undefined;
    }

    const high = rollingHigh[i];
    squaredDrawdowns[i] = typeof high === 'number'
      ? ((((values[i] / high) - 1) * 100) ** 2)
      : undefined;

    const squared = squaredDrawdowns[i];
    if (typeof squared === 'number') squaredSum += squared;
    if (i >= normalizedPeriod) {
      const expired = squaredDrawdowns[i - normalizedPeriod];
      if (typeof expired === 'number') squaredSum -= expired;
    }

    data[i][key] = i >= (normalizedPeriod * 2) - 2
      ? Math.sqrt(squaredSum / normalizedPeriod)
      : undefined;
  }
}

export function calculateFisherTransform(
  data: CandleData[],
  period = 9,
  key = 'fisher_transform',
  source: PriceSource = 'hl2',
): void {
  if (data.length < period) return;

  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((candle) => sourceValue(candle, source));
  let previousValue = 0;
  let previousFisher = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < normalizedPeriod - 1) {
      data[i][key] = undefined;
      continue;
    }

    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - normalizedPeriod + 1; j <= i; j++) {
      if (values[j] > highest) highest = values[j];
      if (values[j] < lowest) lowest = values[j];
    }

    const range = highest - lowest;
    let normalizedValue = range === 0
      ? previousValue
      : (0.33 * 2 * (((values[i] - lowest) / range) - 0.5)) + (0.67 * previousValue);
    normalizedValue = Math.max(-0.999, Math.min(0.999, normalizedValue));
    const fisher = (0.5 * Math.log((1 + normalizedValue) / (1 - normalizedValue))) + (0.5 * previousFisher);
    data[i][key] = fisher;
    previousValue = normalizedValue;
    previousFisher = fisher;
  }
}

export function calculateStochasticRSI(
  data: CandleData[],
  rsiPeriod = 14,
  stochPeriod = 14,
  smoothK = 3,
  dPeriod = 3,
  source: PriceSource = 'close',
  kKey = 'stoch_rsi_k',
  dKey = 'stoch_rsi_d',
): void {
  const normalizedRsiPeriod = Math.max(1, Math.floor(rsiPeriod));
  const normalizedStochPeriod = Math.max(1, Math.floor(stochPeriod));
  const normalizedSmoothK = Math.max(1, Math.floor(smoothK));
  const normalizedDPeriod = Math.max(1, Math.floor(dPeriod));
  const sourceValues = data.map((candle) => sourceValue(candle, source));
  const rsiValues = calculateRsiSeries(sourceValues, normalizedRsiPeriod);
  const rawStoch: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    if (index < normalizedStochPeriod - 1) continue;

    let highest = -Infinity;
    let lowest = Infinity;
    let valid = true;
    for (let lookback = index - normalizedStochPeriod + 1; lookback <= index; lookback++) {
      const value = rsiValues[lookback];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      if (value > highest) highest = value;
      if (value < lowest) lowest = value;
    }
    if (!valid) continue;

    const current = rsiValues[index] as number;
    rawStoch[index] = highest === lowest ? 50 : ((current - lowest) / (highest - lowest)) * 100;
  }

  const smoothKSeries = calculateSmaSeriesNullable(rawStoch, normalizedSmoothK);
  const dSeries = calculateSmaSeriesNullable(smoothKSeries, normalizedDPeriod);

  for (let index = 0; index < data.length; index++) {
    data[index][kKey] = smoothKSeries[index];
    data[index][dKey] = dSeries[index];
  }
}

export function calculatePPO(
  data: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  source: PriceSource = 'close',
  lineKey = 'ppo_line',
  signalKey = 'ppo_signal',
  histKey = 'ppo_hist',
): void {
  const normalizedFast = Math.max(1, Math.floor(fastPeriod));
  const normalizedSlow = Math.max(normalizedFast + 1, Math.floor(slowPeriod));
  const normalizedSignal = Math.max(1, Math.floor(signalPeriod));
  const values = data.map((candle) => sourceValue(candle, source));
  const emaFast = calculateEmaSeries(values, normalizedFast);
  const emaSlow = calculateEmaSeries(values, normalizedSlow);
  const ppoSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const fast = emaFast[index];
    const slow = emaSlow[index];
    ppoSeries[index] = typeof fast === 'number' && typeof slow === 'number' && slow !== 0
      ? ((fast - slow) / slow) * 100
      : undefined;
  }

  const signalSeries = calculateEmaSeriesNullable(ppoSeries, normalizedSignal);
  for (let index = 0; index < data.length; index++) {
    const line = ppoSeries[index];
    const signal = signalSeries[index];
    data[index][lineKey] = line;
    data[index][signalKey] = signal;
    data[index][histKey] = typeof line === 'number' && typeof signal === 'number' ? line - signal : undefined;
  }
}

export function calculatePriceMomentumOscillator(
  data: CandleData[],
  firstPeriod = 35,
  secondPeriod = 20,
  signalPeriod = 10,
  source: PriceSource = 'close',
  pmoKey = 'pmo',
  signalKey = 'pmo_signal',
): void {
  const normalizedFirst = Math.max(1, Math.floor(firstPeriod));
  const normalizedSecond = Math.max(1, Math.floor(secondPeriod));
  const normalizedSignal = Math.max(1, Math.floor(signalPeriod));
  const values = data.map((candle) => sourceValue(candle, source));
  const rocSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 1; index < data.length; index++) {
    const previous = values[index - 1];
    rocSeries[index] = previous !== 0 ? (((values[index] - previous) / previous) * 100 * 10) : undefined;
  }

  const firstSmooth = calculateEmaSeriesNullable(rocSeries, normalizedFirst);
  const pmoSeries = calculateEmaSeriesNullable(firstSmooth, normalizedSecond);
  const signalSeries = calculateEmaSeriesNullable(pmoSeries, normalizedSignal);
  for (let index = 0; index < data.length; index++) {
    data[index][pmoKey] = pmoSeries[index];
    data[index][signalKey] = signalSeries[index];
  }
}

export function calculateKnowSureThing(
  data: CandleData[],
  roc1 = 10,
  roc2 = 15,
  roc3 = 20,
  roc4 = 30,
  sma1 = 10,
  sma2 = 10,
  sma3 = 10,
  sma4 = 15,
  signalPeriod = 9,
  source: PriceSource = 'close',
  kstKey = 'kst',
  signalKey = 'kst_signal',
): void {
  const values = data.map((candle) => sourceValue(candle, source));
  const rocPeriods = [roc1, roc2, roc3, roc4].map((value) => Math.max(1, Math.floor(value)));
  const smaPeriods = [sma1, sma2, sma3, sma4].map((value) => Math.max(1, Math.floor(value)));
  const weights = [1, 2, 3, 4];

  const smoothedRocs = rocPeriods.map((rocPeriod, idx) => {
    const raw: Array<number | undefined> = new Array(data.length).fill(undefined);
    for (let index = rocPeriod; index < data.length; index++) {
      const previous = values[index - rocPeriod];
      raw[index] = previous !== 0 ? ((values[index] - previous) / previous) * 100 : undefined;
    }
    return calculateSmaSeriesNullable(raw, smaPeriods[idx]);
  });

  const kstSeries: Array<number | undefined> = new Array(data.length).fill(undefined);
  for (let index = 0; index < data.length; index++) {
    let weightedSum = 0;
    let valid = true;
    for (let seriesIndex = 0; seriesIndex < smoothedRocs.length; seriesIndex++) {
      const value = smoothedRocs[seriesIndex][index];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      weightedSum += value * weights[seriesIndex];
    }
    kstSeries[index] = valid ? weightedSum : undefined;
  }

  const signalSeries = calculateSmaSeriesNullable(kstSeries, Math.max(1, Math.floor(signalPeriod)));
  for (let index = 0; index < data.length; index++) {
    data[index][kstKey] = kstSeries[index];
    data[index][signalKey] = signalSeries[index];
  }
}

function calculateSmoothedRoc(
  values: number[],
  rocPeriod: number,
  smoothPeriod: number,
): Array<number | undefined> {
  const normalizedRoc = Math.max(1, Math.floor(rocPeriod));
  const normalizedSmooth = Math.max(1, Math.floor(smoothPeriod));
  const raw: Array<number | undefined> = new Array(values.length).fill(undefined);
  for (let index = normalizedRoc; index < values.length; index++) {
    const previous = values[index - normalizedRoc];
    raw[index] = previous !== 0 ? ((values[index] - previous) / previous) * 100 : undefined;
  }
  return calculateSmaSeriesNullable(raw, normalizedSmooth);
}

export function calculatePringSpecialK(
  data: CandleData[],
  source: PriceSource = 'close',
  key = 'pring_special_k',
): void {
  const values = data.map((candle) => sourceValue(candle, source));
  const specs: Array<[number, number, number]> = [
    [10, 10, 1], [15, 10, 2], [20, 10, 3], [30, 15, 4],
    [40, 50, 1], [65, 65, 2], [75, 75, 3], [100, 100, 4],
    [195, 130, 1], [265, 130, 2], [390, 130, 3], [530, 195, 4],
  ];
  const components = specs.map(([rocPeriod, smoothPeriod]) => calculateSmoothedRoc(values, rocPeriod, smoothPeriod));

  for (let index = 0; index < data.length; index++) {
    let weightedSum = 0;
    let weightSum = 0;
    for (let componentIndex = 0; componentIndex < components.length; componentIndex++) {
      const value = components[componentIndex][index];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const weight = specs[componentIndex][2];
      weightedSum += value * weight;
      weightSum += weight;
    }
    data[index][key] = weightSum > 0 ? weightedSum / weightSum : undefined;
  }
}

export function calculateRelativeVigorIndex(
  data: CandleData[],
  period = 10,
  rviKey = 'rvi',
  signalKey = 'rvi_signal',
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const numerator = data.map((candle) => candle.close - candle.open);
  const denominator = data.map((candle) => candle.high - candle.low);
  const weightedNumerator = calculateWeightedSeries(numerator);
  const weightedDenominator = calculateWeightedSeries(denominator);
  const numeratorSeries = calculateSmaSeriesNullable(weightedNumerator, normalizedPeriod);
  const denominatorSeries = calculateSmaSeriesNullable(weightedDenominator, normalizedPeriod);
  const rviSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const top = numeratorSeries[index];
    const bottom = denominatorSeries[index];
    rviSeries[index] = typeof top === 'number' && typeof bottom === 'number' && bottom !== 0
      ? top / bottom
      : undefined;
  }

  const signalSeries = calculateWeightedSeries(rviSeries);
  for (let index = 0; index < data.length; index++) {
    data[index][rviKey] = rviSeries[index];
    data[index][signalKey] = signalSeries[index];
  }
}

export function calculateRelativeVolatilityIndex(
  data: CandleData[],
  period = 10,
  source: PriceSource = 'close',
  key = 'relative_volatility_index',
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((candle) => sourceValue(candle, source));
  const stdSeries = calculateStdDevSeries(values, normalizedPeriod);
  const upVolatility: Array<number | undefined> = new Array(data.length).fill(undefined);
  const downVolatility: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 1; index < data.length; index++) {
    const std = stdSeries[index];
    if (typeof std !== 'number' || !Number.isFinite(std)) continue;
    const diff = values[index] - values[index - 1];
    upVolatility[index] = diff > 0 ? std : 0;
    downVolatility[index] = diff < 0 ? std : 0;
  }

  const smoothUp = calculateWilderSeriesNullable(upVolatility, normalizedPeriod);
  const smoothDown = calculateWilderSeriesNullable(downVolatility, normalizedPeriod);
  for (let index = 0; index < data.length; index++) {
    const up = smoothUp[index];
    const down = smoothDown[index];
    if (typeof up !== 'number' || typeof down !== 'number') {
      data[index][key] = undefined;
      continue;
    }
    const denominator = up + down;
    data[index][key] = denominator === 0 ? 50 : (100 * up) / denominator;
  }
}

export function calculateStochasticMomentumIndex(
  data: CandleData[],
  period = 14,
  smoothPeriod = 3,
  doubleSmoothPeriod = 3,
  signalPeriod = 3,
  smiKey = 'smi',
  signalKey = 'smi_signal',
): void {
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const normalizedSmooth = Math.max(1, Math.floor(smoothPeriod));
  const normalizedDoubleSmooth = Math.max(1, Math.floor(doubleSmoothPeriod));
  const normalizedSignal = Math.max(1, Math.floor(signalPeriod));
  const diffSeries: Array<number | undefined> = new Array(data.length).fill(undefined);
  const rangeSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = normalizedPeriod - 1; index < data.length; index++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let lookback = index - normalizedPeriod + 1; lookback <= index; lookback++) {
      if (data[lookback].high > highest) highest = data[lookback].high;
      if (data[lookback].low < lowest) lowest = data[lookback].low;
    }

    const midpoint = (highest + lowest) / 2;
    diffSeries[index] = data[index].close - midpoint;
    rangeSeries[index] = highest - lowest;
  }

  const smoothDiff = calculateEmaSeriesNullable(
    calculateEmaSeriesNullable(diffSeries, normalizedSmooth),
    normalizedDoubleSmooth,
  );
  const smoothRange = calculateEmaSeriesNullable(
    calculateEmaSeriesNullable(rangeSeries, normalizedSmooth),
    normalizedDoubleSmooth,
  );
  const smiSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const diff = smoothDiff[index];
    const range = smoothRange[index];
    smiSeries[index] = typeof diff === 'number' && typeof range === 'number' && range !== 0
      ? (200 * diff) / range
      : undefined;
  }

  const signalSeries = calculateEmaSeriesNullable(smiSeries, normalizedSignal);
  for (let index = 0; index < data.length; index++) {
    data[index][smiKey] = smiSeries[index];
    data[index][signalKey] = signalSeries[index];
  }
}

export function calculateTrueStrengthIndex(
  data: CandleData[],
  longPeriod = 25,
  shortPeriod = 13,
  signalPeriod = 13,
  source: PriceSource = 'close',
  tsiKey = 'tsi',
  signalKey = 'tsi_signal',
): void {
  const normalizedLong = Math.max(1, Math.floor(longPeriod));
  const normalizedShort = Math.max(1, Math.floor(shortPeriod));
  const normalizedSignal = Math.max(1, Math.floor(signalPeriod));
  const values = data.map((candle) => sourceValue(candle, source));
  const momentum: Array<number | undefined> = new Array(data.length).fill(undefined);
  const absoluteMomentum: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 1; index < data.length; index++) {
    const diff = values[index] - values[index - 1];
    momentum[index] = diff;
    absoluteMomentum[index] = Math.abs(diff);
  }

  const smoothMomentum = calculateEmaSeriesNullable(
    calculateEmaSeriesNullable(momentum, normalizedLong),
    normalizedShort,
  );
  const smoothAbsoluteMomentum = calculateEmaSeriesNullable(
    calculateEmaSeriesNullable(absoluteMomentum, normalizedLong),
    normalizedShort,
  );
  const tsiSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const numerator = smoothMomentum[index];
    const denominator = smoothAbsoluteMomentum[index];
    tsiSeries[index] = typeof numerator === 'number' && typeof denominator === 'number' && denominator !== 0
      ? (numerator / denominator) * 100
      : undefined;
  }

  const signalSeries = calculateEmaSeriesNullable(tsiSeries, normalizedSignal);
  for (let index = 0; index < data.length; index++) {
    data[index][tsiKey] = tsiSeries[index];
    data[index][signalKey] = signalSeries[index];
  }
}

export function calculateSmiErgodicIndicator(
  data: CandleData[],
  longPeriod = 20,
  shortPeriod = 5,
  signalPeriod = 5,
  source: PriceSource = 'close',
  smiKey = 'smi_ergodic',
  signalKey = 'smi_ergodic_signal',
): void {
  calculateTrueStrengthIndex(data, longPeriod, shortPeriod, signalPeriod, source, smiKey, signalKey);
}

export function calculateSmiErgodicOscillator(
  data: CandleData[],
  longPeriod = 20,
  shortPeriod = 5,
  signalPeriod = 5,
  source: PriceSource = 'close',
  key = 'smi_ergodic_oscillator',
): void {
  const smiKey = '__smi_ergodic_line';
  const signalKey = '__smi_ergodic_signal';
  calculateSmiErgodicIndicator(data, longPeriod, shortPeriod, signalPeriod, source, smiKey, signalKey);
  for (let index = 0; index < data.length; index++) {
    const smi = data[index][smiKey];
    const signal = data[index][signalKey];
    data[index][key] = typeof smi === 'number' && typeof signal === 'number' ? smi - signal : undefined;
    delete data[index][smiKey];
    delete data[index][signalKey];
  }
}

export function calculateElderForceIndex(data: CandleData[], period = 13, key = 'elder_force_index'): void {
  if (!data.length) return;

  const raw = new Array<number>(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    raw[i] = (data[i].close - data[i - 1].close) * data[i].volume;
  }

  if (period <= 1) {
    for (let i = 0; i < data.length; i++) {
      data[i][key] = i === 0 ? undefined : raw[i];
    }
    return;
  }

  const smoothed = calculateEmaSeries(raw, Math.max(1, Math.floor(period)));
  for (let i = 0; i < data.length; i++) {
    data[i][key] = i === 0 ? undefined : smoothed[i];
  }
}

export function calculateEaseOfMovement(
  data: CandleData[],
  period = 14,
  divisor = 100000000,
  key = 'ease_of_movement',
): void {
  if (!data.length) return;

  const safeDivisor = divisor === 0 ? 1 : divisor;
  const raw: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let i = 1; i < data.length; i++) {
    const midpointMove = ((data[i].high + data[i].low) / 2) - ((data[i - 1].high + data[i - 1].low) / 2);
    const range = data[i].high - data[i].low;
    const boxRatio = range === 0 ? undefined : (data[i].volume / safeDivisor) / range;
    raw[i] = typeof boxRatio === 'number' && boxRatio !== 0 ? midpointMove / boxRatio : undefined;
  }

  const smoothed = period <= 1 ? raw : calculateSmaSeriesNullable(raw, Math.max(1, Math.floor(period)));
  for (let i = 0; i < data.length; i++) {
    data[i][key] = smoothed[i];
  }
}

export function calculateChandeMomentumOscillator(
  data: CandleData[],
  period = 14,
  key = 'chande_momentum_oscillator',
  source: PriceSource = 'close',
): void {
  if (data.length <= period) return;
  const values = data.map((candle) => sourceValue(candle, source));

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      data[i][key] = undefined;
      continue;
    }

    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - values[j - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    const denominator = gains + losses;
    data[i][key] = denominator === 0 ? 0 : ((gains - losses) / denominator) * 100;
  }
}

export function calculateDetrendedPriceOscillator(
  data: CandleData[],
  period = 20,
  key = 'detrended_price_oscillator',
  source: PriceSource = 'close',
): void {
  if (data.length < period) return;
  const normalizedPeriod = Math.max(1, Math.floor(period));
  const values = data.map((candle) => sourceValue(candle, source));
  const sma = calculateSmaSeries(values, normalizedPeriod);
  const offset = Math.floor(normalizedPeriod / 2) + 1;

  for (let i = 0; i < data.length; i++) {
    const smaValue = sma[i];
    const displacedIndex = i - offset;
    data[i][key] = typeof smaValue === 'number' && displacedIndex >= 0
      ? values[displacedIndex] - smaValue
      : undefined;
  }
}
