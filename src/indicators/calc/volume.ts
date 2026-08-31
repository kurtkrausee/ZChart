// indicators/calc/volume.ts
// Version: 1.11.0 | Updated: 2026-04-25 | By: GitHub Copilot

import type { CandleData } from '../../data/DataStore';

function moneyFlowMultiplier(candle: CandleData): number {
  const range = candle.high - candle.low;
  return range === 0
    ? 0
    : (((candle.close - candle.low) - (candle.high - candle.close)) / range);
}

function calculateAdlSeries(data: CandleData[]): number[] {
  const out = new Array<number>(data.length).fill(0);
  let cumulative = 0;
  for (let i = 0; i < data.length; i++) {
    cumulative += moneyFlowMultiplier(data[i]) * data[i].volume;
    out[i] = cumulative;
  }
  return out;
}

function timestampToUnixMs(timestamp: number): number {
  return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
}

function timestampToTimeBucket(timestamp: number): string {
  const date = new Date(timestampToUnixMs(timestamp));
  return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
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

export function calculateVWAP(data: CandleData[], key = 'vwap'): void {
  if (data.length < 2) return;
  let cumulativeVolume = 0;
  let cumulativeTypicalPrice = 0;
  let previousDayKey = '';

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    // Use a full UTC date string so the session reset is correct across
    // month/year boundaries (previously only used getUTCDate() which is 1-31
    // and could fail to reset on Monthly TF where consecutive bars share the
    // same day-of-month).
    const d = new Date(candle.timestamp * 1000);
    const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (dayKey !== previousDayKey) {
      cumulativeVolume = 0;
      cumulativeTypicalPrice = 0;
      previousDayKey = dayKey;
    }
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalPrice += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    candle[key] = cumulativeVolume > 0 ? cumulativeTypicalPrice / cumulativeVolume : typicalPrice;
  }
}

export function calculateTWAP(data: CandleData[], key = 'twap'): void {
  if (data.length < 2) return;

  let cumulativeTypicalPrice = 0;
  let sessionCount = 0;
  let previousDayKey = '';

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const sessionDate = new Date(candle.timestamp * 1000);
    const dayKey = `${sessionDate.getUTCFullYear()}-${sessionDate.getUTCMonth()}-${sessionDate.getUTCDate()}`;

    if (dayKey !== previousDayKey) {
      cumulativeTypicalPrice = 0;
      sessionCount = 0;
      previousDayKey = dayKey;
    }

    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalPrice += typicalPrice;
    sessionCount += 1;
    candle[key] = sessionCount > 0 ? cumulativeTypicalPrice / sessionCount : typicalPrice;
  }
}

export function calculateVolumeSMA(data: CandleData[], period = 20, key = 'volume_sma'): void {
  if (data.length < period) return;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].volume;
    if (i >= period) sum -= data[i - period].volume;
    data[i][key] = i >= period - 1 ? sum / period : undefined;
  }
}

export function calculateVolumeROC(data: CandleData[], period = 10, key = 'volume_roc'): void {
  if (data.length <= period) return;
  for (let i = 0; i < data.length; i++) {
    if (i < period || data[i - period].volume === 0) {
      data[i][key] = undefined;
      continue;
    }
    data[i][key] = ((data[i].volume - data[i - period].volume) / data[i - period].volume) * 100;
  }
}

export function calculateNetVolume(data: CandleData[], key = 'net_volume'): void {
  for (let index = 0; index < data.length; index++) {
    if (data[index].close > data[index].open) data[index][key] = data[index].volume;
    else if (data[index].close < data[index].open) data[index][key] = -data[index].volume;
    else data[index][key] = 0;
  }
}

export function calculateUpDownVolume(
  data: CandleData[],
  upKey = 'up_volume',
  downKey = 'down_volume',
): void {
  for (let index = 0; index < data.length; index++) {
    if (index === 0 || data[index].close === data[index - 1].close) {
      data[index][upKey] = 0;
      data[index][downKey] = 0;
      continue;
    }

    if (data[index].close > data[index - 1].close) {
      data[index][upKey] = data[index].volume;
      data[index][downKey] = 0;
    } else {
      data[index][upKey] = 0;
      data[index][downKey] = -data[index].volume;
    }
  }
}

export function calculateVolumeDelta(data: CandleData[], key = 'volume_delta'): void {
  for (let index = 0; index < data.length; index++) {
    const candle = data[index];
    if (candle.close > candle.open) candle[key] = candle.volume;
    else if (candle.close < candle.open) candle[key] = -candle.volume;
    else candle[key] = 0;
  }
}

export function calculateCumulativeVolumeDelta(data: CandleData[], key = 'cumulative_volume_delta'): void {
  let cumulative = 0;
  for (let index = 0; index < data.length; index++) {
    const candle = data[index];
    const delta = candle.close > candle.open ? candle.volume : candle.close < candle.open ? -candle.volume : 0;
    cumulative += Number.isFinite(delta) ? delta : 0;
    candle[key] = cumulative;
  }
}

export function calculateCumulativeVolumeIndex(data: CandleData[], key = 'cumulative_volume_index'): void {
  let cumulative = 0;
  for (let index = 0; index < data.length; index++) {
    cumulative += Number(data[index].volume ?? 0);
    data[index][key] = cumulative;
  }
}

export function calculateVolume24h(data: CandleData[], key = 'volume_24h'): void {
  const windowMs = 24 * 60 * 60 * 1000;
  let rollingVolume = 0;
  let start = 0;
  for (let index = 0; index < data.length; index++) {
    const currentMs = timestampToUnixMs(data[index].timestamp);
    rollingVolume += Number(data[index].volume ?? 0);
    while (start <= index && timestampToUnixMs(data[start].timestamp) < currentMs - windowMs) {
      rollingVolume -= Number(data[start].volume ?? 0);
      start += 1;
    }
    data[index][key] = rollingVolume;
  }
}

export function calculateRelativeVolumeAtTime(data: CandleData[], lookback = 20, key = 'relative_volume_at_time'): void {
  const normalizedLookback = Math.max(1, Math.floor(lookback));
  const bucketHistory = new Map<string, number[]>();

  for (let index = 0; index < data.length; index++) {
    const candle = data[index];
    const bucket = timestampToTimeBucket(candle.timestamp);
    const history = bucketHistory.get(bucket) ?? [];
    const sample = history.slice(-normalizedLookback);
    if (sample.length > 0) {
      const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
      candle[key] = average > 0 ? (Number(candle.volume ?? 0) / average) * 100 : undefined;
    } else {
      candle[key] = undefined;
    }
    history.push(Number(candle.volume ?? 0));
    bucketHistory.set(bucket, history);
  }
}

export function calculatePercentageVolumeOscillator(
  data: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  lineKey = 'pvo_line',
  signalKey = 'pvo_signal',
  histKey = 'pvo_hist',
): void {
  const normalizedFast = Math.max(1, Math.floor(fastPeriod));
  const normalizedSlow = Math.max(normalizedFast + 1, Math.floor(slowPeriod));
  const normalizedSignal = Math.max(1, Math.floor(signalPeriod));
  const volume = data.map((candle) => Number(candle.volume ?? 0));
  const emaFast = calculateEmaSeries(volume, normalizedFast);
  const emaSlow = calculateEmaSeries(volume, normalizedSlow);
  const pvoSeries: Array<number | undefined> = new Array(data.length).fill(undefined);

  for (let index = 0; index < data.length; index++) {
    const fast = emaFast[index];
    const slow = emaSlow[index];
    pvoSeries[index] = typeof fast === 'number' && typeof slow === 'number' && slow !== 0
      ? ((fast - slow) / slow) * 100
      : undefined;
  }

  const signalSeries = calculateEmaSeriesNullable(pvoSeries, normalizedSignal);
  for (let index = 0; index < data.length; index++) {
    const line = pvoSeries[index];
    const signal = signalSeries[index];
    data[index][lineKey] = line;
    data[index][signalKey] = signal;
    data[index][histKey] = typeof line === 'number' && typeof signal === 'number' ? line - signal : undefined;
  }
}

export function calculateKlingerOscillator(
  data: CandleData[],
  fastPeriod = 34,
  slowPeriod = 55,
  signalPeriod = 13,
  lineKey = 'klinger_oscillator',
  signalKey = 'klinger_signal',
): void {
  if (!data.length) return;

  const normalizedFast = Math.max(1, Math.floor(fastPeriod));
  const normalizedSlow = Math.max(normalizedFast + 1, Math.floor(slowPeriod));
  const normalizedSignal = Math.max(1, Math.floor(signalPeriod));
  const volumeForce = new Array<number>(data.length).fill(0);
  let previousTrend = 0;
  let previousDm = data[0].high - data[0].low;
  let cumulativeMeasurement = previousDm;

  for (let index = 1; index < data.length; index++) {
    const currentTrendBase = data[index].high + data[index].low + data[index].close;
    const previousTrendBase = data[index - 1].high + data[index - 1].low + data[index - 1].close;
    const trend = currentTrendBase > previousTrendBase ? 1 : currentTrendBase < previousTrendBase ? -1 : (previousTrend || 1);
    const dm = data[index].high - data[index].low;

    if (index === 1 || trend !== previousTrend) cumulativeMeasurement = previousDm + dm;
    else cumulativeMeasurement += dm;

    const ratio = cumulativeMeasurement !== 0 ? Math.abs(2 * ((dm / cumulativeMeasurement) - 1)) : 0;
    volumeForce[index] = Number(data[index].volume ?? 0) * trend * ratio * 100;
    previousTrend = trend;
    previousDm = dm;
  }

  const fastEma = calculateEmaSeries(volumeForce, normalizedFast);
  const slowEma = calculateEmaSeries(volumeForce, normalizedSlow);
  const klingerSeries: Array<number | undefined> = new Array(data.length).fill(undefined);
  for (let index = 0; index < data.length; index++) {
    const fast = fastEma[index];
    const slow = slowEma[index];
    klingerSeries[index] = typeof fast === 'number' && typeof slow === 'number' ? fast - slow : undefined;
  }

  const signalSeries = calculateEmaSeriesNullable(klingerSeries, normalizedSignal);
  for (let index = 0; index < data.length; index++) {
    data[index][lineKey] = klingerSeries[index];
    data[index][signalKey] = signalSeries[index];
  }
}

export function calculateVolumeSpike(
  data: CandleData[],
  period = 20,
  multiplier = 1.5,
  valueKey = 'volume_spike_value',
  typeKey = 'volume_spike_type',
  labelKey = 'volume_spike_label',
  ratioKey = 'volume_spike_ratio',
): void {
  let rollingSum = 0;

  for (let i = 0; i < data.length; i++) {
    data[i][valueKey] = undefined;
    data[i][typeKey] = undefined;
    data[i][labelKey] = undefined;
    data[i][ratioKey] = undefined;

    rollingSum += data[i].volume;
    if (i >= period) rollingSum -= data[i - period].volume;
    if (i < period - 1) continue;

    const volumeAverage = rollingSum / period;
    if (!Number.isFinite(volumeAverage) || volumeAverage <= 0) continue;

    const ratio = data[i].volume / volumeAverage;
    if (ratio > multiplier) {
      data[i][valueKey] = data[i].high;
      data[i][typeKey] = data[i].close >= data[i].open ? 'up' : 'down';
      data[i][labelKey] = 'VS';
      data[i][ratioKey] = Math.round(ratio * 100) / 100;
    }
  }
}

export function calculateOBV(data: CandleData[], key = 'obv'): void {
  if (!data.length) return;

  data[0][key] = 0;
  for (let i = 1; i < data.length; i++) {
    const previous = Number(data[i - 1][key] ?? 0);
    if (data[i].close > data[i - 1].close) {
      data[i][key] = previous + data[i].volume;
    } else if (data[i].close < data[i - 1].close) {
      data[i][key] = previous - data[i].volume;
    } else {
      data[i][key] = previous;
    }
  }
}

export function calculateNegativeVolumeIndex(data: CandleData[], key = 'negative_volume_index'): void {
  if (!data.length) return;

  data[0][key] = 1000;
  for (let i = 1; i < data.length; i++) {
    const previous = Number(data[i - 1][key] ?? 1000);
    const previousClose = data[i - 1].close;
    const volumeDeclined = data[i].volume < data[i - 1].volume;
    if (volumeDeclined && previousClose !== 0) {
      data[i][key] = previous * (1 + ((data[i].close - previousClose) / previousClose));
    } else {
      data[i][key] = previous;
    }
  }
}

export function calculatePositiveVolumeIndex(data: CandleData[], key = 'positive_volume_index'): void {
  if (!data.length) return;

  data[0][key] = 1000;
  for (let i = 1; i < data.length; i++) {
    const previous = Number(data[i - 1][key] ?? 1000);
    const previousClose = data[i - 1].close;
    const volumeIncreased = data[i].volume > data[i - 1].volume;
    if (volumeIncreased && previousClose !== 0) {
      data[i][key] = previous * (1 + ((data[i].close - previousClose) / previousClose));
    } else {
      data[i][key] = previous;
    }
  }
}

export function calculatePriceVolumeTrend(data: CandleData[], key = 'price_volume_trend'): void {
  if (!data.length) return;

  data[0][key] = 0;
  for (let i = 1; i < data.length; i++) {
    const previous = Number(data[i - 1][key] ?? 0);
    const previousClose = data[i - 1].close;
    if (!Number.isFinite(previousClose) || previousClose === 0) {
      data[i][key] = previous;
      continue;
    }
    const priceChangeRatio = (data[i].close - previousClose) / previousClose;
    data[i][key] = previous + ((data[i].volume ?? 0) * priceChangeRatio);
  }
}

export function calculateAccumulationDistribution(data: CandleData[], key = 'accumulation_distribution'): void {
  const series = calculateAdlSeries(data);
  for (let i = 0; i < data.length; i++) data[i][key] = series[i];
}

export function calculateChaikinMoneyFlow(data: CandleData[], period = 20, key = 'chaikin_money_flow'): void {
  if (!data.length) return;

  const moneyFlowVolume = new Array<number>(data.length).fill(0);
  let mfvSum = 0;
  let volumeSum = 0;

  for (let i = 0; i < data.length; i++) {
    moneyFlowVolume[i] = moneyFlowMultiplier(data[i]) * data[i].volume;
    mfvSum += moneyFlowVolume[i];
    volumeSum += data[i].volume;

    if (i >= period) {
      mfvSum -= moneyFlowVolume[i - period];
      volumeSum -= data[i - period].volume;
    }

    data[i][key] = i >= period - 1 && volumeSum !== 0 ? mfvSum / volumeSum : undefined;
  }
}

export function calculateChaikinOscillator(
  data: CandleData[],
  fastPeriod = 3,
  slowPeriod = 10,
  key = 'chaikin_oscillator',
): void {
  const adl = calculateAdlSeries(data);
  const fast = calculateEmaSeries(adl, fastPeriod);
  const slow = calculateEmaSeries(adl, slowPeriod);

  for (let i = 0; i < data.length; i++) {
    const fastValue = fast[i];
    const slowValue = slow[i];
    data[i][key] = typeof fastValue === 'number' && typeof slowValue === 'number'
      ? fastValue - slowValue
      : undefined;
  }
}

export function calculateMoneyFlowIndex(data: CandleData[], period = 14, key = 'money_flow_index'): void {
  if (!data.length) return;

  const positiveFlow = new Array<number>(data.length).fill(0);
  const negativeFlow = new Array<number>(data.length).fill(0);
  let positiveSum = 0;
  let negativeSum = 0;

  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    const rawMoneyFlow = typicalPrice * data[i].volume;

    if (i > 0) {
      const prevTypicalPrice = (data[i - 1].high + data[i - 1].low + data[i - 1].close) / 3;
      if (typicalPrice > prevTypicalPrice) positiveFlow[i] = rawMoneyFlow;
      else if (typicalPrice < prevTypicalPrice) negativeFlow[i] = rawMoneyFlow;
    }

    positiveSum += positiveFlow[i];
    negativeSum += negativeFlow[i];

    if (i >= period) {
      positiveSum -= positiveFlow[i - period];
      negativeSum -= negativeFlow[i - period];
    }

    if (i < period - 1) {
      data[i][key] = undefined;
      continue;
    }

    if (negativeSum === 0 && positiveSum === 0) {
      data[i][key] = 50;
      continue;
    }

    if (negativeSum === 0) {
      data[i][key] = 100;
      continue;
    }

    const moneyRatio = positiveSum / negativeSum;
    data[i][key] = 100 - (100 / (1 + moneyRatio));
  }
}
