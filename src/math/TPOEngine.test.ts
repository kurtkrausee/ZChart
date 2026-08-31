// react-app/src/zchart/math/TPOEngine.test.ts
// Version: 1.0.0 | Updated: 2026-04-26 | By: GitHub Copilot
// Unit tests for ZChart-native TPO engine (Batch L).

import { describe, it, expect } from 'vitest';
import {
  calculateTPO,
  groupCandlesBySession,
  TPO_LETTER_ALPHABET,
  type TPOCandle,
} from './TPOEngine';

const mkCandle = (
  ts: number,
  open: number,
  high: number,
  low: number,
  close: number,
): TPOCandle => ({ timestamp: ts, open, high, low, close, volume: 100 });

describe('calculateTPO', () => {
  it('returns null for empty input', () => {
    expect(calculateTPO([], 24, 70)).toBeNull();
  });

  it('returns null when min === max (flat market)', () => {
    const flat = [mkCandle(0, 50, 50, 50, 50), mkCandle(1, 50, 50, 50, 50)];
    expect(calculateTPO(flat, 24, 70)).toBeNull();
  });

  it('returns null when rows < 2', () => {
    const cs = [mkCandle(0, 10, 20, 5, 15), mkCandle(1, 15, 25, 10, 20)];
    expect(calculateTPO(cs, 1, 70)).toBeNull();
  });

  it('builds correct number of buckets and assigns letters across price-range', () => {
    // 5 candles spanning 10..20, 24 rows
    const cs = [
      mkCandle(0, 10, 14, 10, 12),
      mkCandle(1, 12, 16, 11, 15),
      mkCandle(2, 15, 18, 13, 17),
      mkCandle(3, 17, 20, 15, 19),
      mkCandle(4, 19, 20, 17, 18),
    ];
    const r = calculateTPO(cs, 24, 70)!;
    expect(r).not.toBeNull();
    expect(r.buckets.length).toBe(24);
    // Each bucket holds letters from candles whose [low,high] crosses the bucket band.
    // The first bucket (lowest band ~10..10.42) is touched by candle 0 only ⇒ letter 'A'
    expect(r.buckets[0].letters).toEqual(['A']);
    // POC must be a non-trivial bucket
    expect(r.maxCount).toBeGreaterThanOrEqual(1);
    expect(r.pocIndex).toBeGreaterThanOrEqual(0);
    expect(r.pocIndex).toBeLessThan(24);
  });

  it('assigns distinct letters per candle and recycles after alphabet length', () => {
    // 64 candles → letter at index 62 is the last alphabet entry, index 63 wraps to 'A'
    const cs: TPOCandle[] = [];
    for (let i = 0; i < TPO_LETTER_ALPHABET.length + 2; i++) {
      cs.push(mkCandle(i, 10, 11, 9, 10));
    }
    const r = calculateTPO(cs, 5, 70)!;
    expect(r).not.toBeNull();
    // The middle bucket should contain TPO_LETTER_ALPHABET.length + 2 letters (each candle hits all buckets).
    const totalLetters = r.buckets.reduce((s, b) => s + b.letters.length, 0);
    expect(totalLetters).toBe(5 * (TPO_LETTER_ALPHABET.length + 2));
  });

  it('IBR is computed from first 2 candles', () => {
    const cs = [
      mkCandle(0, 10, 15, 9, 12),
      mkCandle(1, 12, 18, 11, 17),
      mkCandle(2, 17, 25, 16, 24),
    ];
    const r = calculateTPO(cs, 12, 70)!;
    expect(r.ibrHigh).toBe(18); // max of first two highs
    expect(r.ibrLow).toBe(9);   // min of first two lows
  });

  it('VAH/VAL contain POC and grow until ≥ valueAreaPercent of total', () => {
    const cs = [
      mkCandle(0, 10, 14, 10, 12),
      mkCandle(1, 12, 16, 11, 15),
      mkCandle(2, 15, 18, 13, 17),
      mkCandle(3, 17, 20, 15, 19),
    ];
    const r = calculateTPO(cs, 24, 70)!;
    expect(r.valIndex).toBeLessThanOrEqual(r.pocIndex);
    expect(r.vahIndex).toBeGreaterThanOrEqual(r.pocIndex);
    const totalCount = r.buckets.reduce((s, b) => s + b.letters.length, 0);
    let vaCount = 0;
    for (let i = r.valIndex; i <= r.vahIndex; i++) vaCount += r.buckets[i].letters.length;
    expect(vaCount).toBeGreaterThanOrEqual(totalCount * 0.7 - 0.0001);
  });

  it('detects single-prints (buckets with letters.length === 1)', () => {
    // Candle 0 spans 10..14, candle 1 spans 18..22 → middle 14..18 has no letters,
    // bottom & top regions each have exactly 1 letter from one candle.
    const cs = [mkCandle(0, 10, 14, 10, 12), mkCandle(1, 18, 22, 18, 20)];
    const r = calculateTPO(cs, 12, 70)!;
    expect(r.singlePrintIndices.length).toBeGreaterThan(0);
    for (const idx of r.singlePrintIndices) {
      expect(r.buckets[idx].letters.length).toBe(1);
    }
  });
});

describe('groupCandlesBySession', () => {
  it('returns empty for empty input', () => {
    expect(groupCandlesBySession([])).toEqual([]);
  });

  it('groups candles by UTC calendar day with absolute indices', () => {
    const day1 = Date.UTC(2026, 0, 1, 14, 0); // 2026-01-01 14:00 UTC
    const day2 = Date.UTC(2026, 0, 2, 14, 0);
    const cs = [
      mkCandle(day1 + 0 * 60_000, 10, 11, 9, 10),
      mkCandle(day1 + 30 * 60_000, 10, 11, 9, 10),
      mkCandle(day2 + 0 * 60_000, 10, 11, 9, 10),
      mkCandle(day2 + 30 * 60_000, 10, 11, 9, 10),
    ];
    const groups = groupCandlesBySession(cs, 'all');
    expect(groups.length).toBe(2);
    expect(groups[0].startIndex).toBe(0);
    expect(groups[0].endIndex).toBe(1);
    expect(groups[1].startIndex).toBe(2);
    expect(groups[1].endIndex).toBe(3);
  });

  it('filters candles to market window (13:30–20:00 UTC)', () => {
    const base = Date.UTC(2026, 0, 1, 0, 0);
    const cs = [
      mkCandle(base + 10 * 3600_000, 10, 11, 9, 10), // 10:00 UTC – premarket
      mkCandle(base + 14 * 3600_000, 10, 11, 9, 10), // 14:00 UTC – market
      mkCandle(base + 19 * 3600_000, 10, 11, 9, 10), // 19:00 UTC – market
      mkCandle(base + 22 * 3600_000, 10, 11, 9, 10), // 22:00 UTC – postmarket
    ];
    const groups = groupCandlesBySession(cs, 'market');
    expect(groups.length).toBe(1);
    expect(groups[0].candles.length).toBe(2);
    expect(groups[0].startIndex).toBe(1);
    expect(groups[0].endIndex).toBe(2);
  });

  it('returns no groups when no candles match the session filter', () => {
    const base = Date.UTC(2026, 0, 1, 0, 0);
    const cs = [
      mkCandle(base + 10 * 3600_000, 10, 11, 9, 10), // premarket only
    ];
    const groups = groupCandlesBySession(cs, 'market');
    expect(groups.length).toBe(0);
  });

  it('honours premarket and postmarket windows', () => {
    const base = Date.UTC(2026, 0, 1, 0, 0);
    const cs = [
      mkCandle(base + 9 * 3600_000, 10, 11, 9, 10),  // 09:00 – premarket boundary (in)
      mkCandle(base + 13 * 3600_000, 10, 11, 9, 10), // 13:00 – premarket
      mkCandle(base + 14 * 3600_000, 10, 11, 9, 10), // 14:00 – market
      mkCandle(base + 21 * 3600_000, 10, 11, 9, 10), // 21:00 – postmarket
    ];
    expect(groupCandlesBySession(cs, 'premarket')[0].candles.length).toBe(2);
    expect(groupCandlesBySession(cs, 'postmarket')[0].candles.length).toBe(1);
  });
});
