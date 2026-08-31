// react-app/src/zchart/math/TPOEngine.ts
// Version: 1.0.0 | Updated: 2026-04-26 | By: GitHub Copilot
// ZChart-native TPO (Time Price Opportunity / Market Profile) calculation engine.
// Pure functions only — no DOM/Canvas access. Drawing lives in TPOProfileNode.
// Algorithm parity with components/charts/volumeProfileEngine.ts (calcMode: tpo, sessionTPO).
// ============================================================================

export interface TPOCandle {
  timestamp: number; // ms (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TPOBucket {
  priceFrom: number;
  priceTo: number;
  priceMid: number;
  letters: string[];
}

export interface TPOResult {
  buckets: TPOBucket[];
  pocIndex: number;
  vahIndex: number;
  valIndex: number;
  maxCount: number;
  ibrHigh: number;
  ibrLow: number;
  /** Indices of buckets with exactly one letter (single-prints / poor highs/lows) */
  singlePrintIndices: number[];
}

export interface TPOSessionGroup {
  candles: TPOCandle[];
  /** First candle data-index in the source array (used for x-positioning) */
  startIndex: number;
  /** Last candle data-index (inclusive) */
  endIndex: number;
}

export type TPOSessionFilter = 'all' | 'premarket' | 'market' | 'postmarket';

const LETTER_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Build TPO buckets from a candle range.
 * Each candle contributes ONE letter (cycled through LETTER_ALPHABET) to every
 * bucket whose [priceFrom, priceTo] intersects the candle's [low, high].
 *
 * POC = bucket with the most letters.
 * VA  = expand from POC alternately upward/downward (greedy: pick larger neighbour)
 *       until ≥ valueAreaPercent of total letter count is reached.
 * IBR = high/low of the first 2 candles (initial balance range, ≈ first hour for 30m blocks).
 */
export function calculateTPO(
  candles: TPOCandle[],
  rows: number,
  valueAreaPercent: number,
): TPOResult | null {
  if (!candles.length || rows < 2) return null;

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }
  if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) return null;

  const bucketSize = (maxPrice - minPrice) / rows;
  const buckets: TPOBucket[] = [];
  for (let i = 0; i < rows; i++) {
    buckets.push({
      priceFrom: minPrice + i * bucketSize,
      priceTo: minPrice + (i + 1) * bucketSize,
      priceMid: minPrice + (i + 0.5) * bucketSize,
      letters: [],
    });
  }

  for (let ci = 0; ci < candles.length; ci++) {
    const c = candles[ci];
    const letter = LETTER_ALPHABET[ci % LETTER_ALPHABET.length];
    for (let bi = 0; bi < rows; bi++) {
      if (c.low <= buckets[bi].priceTo && c.high >= buckets[bi].priceFrom) {
        buckets[bi].letters.push(letter);
      }
    }
  }

  let pocIndex = 0;
  let maxCount = 0;
  for (let i = 0; i < rows; i++) {
    if (buckets[i].letters.length > maxCount) {
      maxCount = buckets[i].letters.length;
      pocIndex = i;
    }
  }
  if (maxCount === 0) return null;

  const totalCount = buckets.reduce((s, b) => s + b.letters.length, 0);
  const target = totalCount * (Math.max(1, Math.min(100, valueAreaPercent)) / 100);
  let vaCount = buckets[pocIndex].letters.length;
  let vahIdx = pocIndex;
  let valIdx = pocIndex;
  while (vaCount < target && (vahIdx < rows - 1 || valIdx > 0)) {
    const upC = vahIdx < rows - 1 ? buckets[vahIdx + 1].letters.length : -1;
    const dnC = valIdx > 0 ? buckets[valIdx - 1].letters.length : -1;
    if (upC < 0 && dnC < 0) break;
    if (upC >= dnC) {
      vahIdx++;
      vaCount += buckets[vahIdx].letters.length;
    } else {
      valIdx--;
      vaCount += buckets[valIdx].letters.length;
    }
  }

  const ibrSlice = candles.slice(0, Math.min(2, candles.length));
  const ibrHigh = Math.max(...ibrSlice.map((c) => c.high));
  const ibrLow = Math.min(...ibrSlice.map((c) => c.low));

  const singlePrintIndices: number[] = [];
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].letters.length === 1) singlePrintIndices.push(i);
  }

  return {
    buckets,
    pocIndex,
    vahIndex: vahIdx,
    valIndex: valIdx,
    maxCount,
    ibrHigh,
    ibrLow,
    singlePrintIndices,
  };
}

/**
 * Group candles into TPO sessions. Currently splits by calendar day (UTC).
 * sessionFilter narrows each day to pre-market / RTH / post-market windows
 * using rough US hours (UTC-based). For 'all' the whole day is returned.
 *
 * Returns groups with absolute startIndex / endIndex relative to the input array,
 * so callers can map back to time-scale x-coordinates.
 */
export function groupCandlesBySession(
  candles: TPOCandle[],
  sessionFilter: TPOSessionFilter = 'all',
): TPOSessionGroup[] {
  if (!candles.length) return [];

  const groups: TPOSessionGroup[] = [];
  let currentKey = '';
  let groupStart = 0;

  const pushGroup = (start: number, end: number) => {
    const slice = candles.slice(start, end + 1);
    const filtered = applySessionFilter(slice, start, sessionFilter);
    if (filtered.candles.length > 0) {
      groups.push(filtered);
    }
  };

  for (let i = 0; i < candles.length; i++) {
    const ts = candles[i].timestamp;
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (i === 0) {
      currentKey = key;
      groupStart = 0;
      continue;
    }
    if (key !== currentKey) {
      pushGroup(groupStart, i - 1);
      currentKey = key;
      groupStart = i;
    }
  }
  pushGroup(groupStart, candles.length - 1);

  return groups;
}

/**
 * Filter a single-day slice to the requested session window.
 * Hours (UTC, approximate US RTH):
 *   premarket  : 09:00 – 13:30 UTC  (= 04:00 – 09:30 ET)
 *   market     : 13:30 – 20:00 UTC  (= 09:30 – 16:00 ET)
 *   postmarket : 20:00 – 24:00 UTC  (= 16:00 – 20:00 ET)
 *   all        : whole day
 */
function applySessionFilter(
  daySlice: TPOCandle[],
  absoluteStart: number,
  sessionFilter: TPOSessionFilter,
): TPOSessionGroup {
  if (sessionFilter === 'all' || daySlice.length === 0) {
    return {
      candles: daySlice,
      startIndex: absoluteStart,
      endIndex: absoluteStart + daySlice.length - 1,
    };
  }

  const inWindow = (ts: number): boolean => {
    const d = new Date(ts);
    const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
    const PRE_START = 9 * 60;       // 09:00
    const MKT_START = 13 * 60 + 30; // 13:30
    const POST_START = 20 * 60;     // 20:00
    const POST_END = 24 * 60;
    if (sessionFilter === 'premarket') return minutes >= PRE_START && minutes < MKT_START;
    if (sessionFilter === 'market') return minutes >= MKT_START && minutes < POST_START;
    if (sessionFilter === 'postmarket') return minutes >= POST_START && minutes < POST_END;
    return true;
  };

  let firstHit = -1;
  let lastHit = -1;
  const filtered: TPOCandle[] = [];
  for (let i = 0; i < daySlice.length; i++) {
    if (inWindow(daySlice[i].timestamp)) {
      if (firstHit < 0) firstHit = i;
      lastHit = i;
      filtered.push(daySlice[i]);
    }
  }
  if (firstHit < 0) {
    return { candles: [], startIndex: absoluteStart, endIndex: absoluteStart };
  }
  return {
    candles: filtered,
    startIndex: absoluteStart + firstHit,
    endIndex: absoluteStart + lastHit,
  };
}

export const TPO_LETTER_ALPHABET = LETTER_ALPHABET;
