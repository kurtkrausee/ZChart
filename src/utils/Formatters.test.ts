// Formatters.test.ts
// Version: 1.0.0 | Updated: 2026-08-11 | By: Agent
// ZV10-P4: Tests für formatAxisPrice (Tausendertrenner + Zero-Trimming).

import { describe, it, expect } from 'vitest';
import { formatAxisPrice } from './Formatters';

describe('formatAxisPrice — Tausendertrenner', () => {
  it('none: kein Trenner (bisheriges Verhalten)', () => {
    expect(formatAxisPrice(1234567.891, 2, { thousandSep: 'none' })).toBe('1234567.89');
  });

  it('apostrophe (de-CH): Trenner, Dezimalpunkt', () => {
    expect(formatAxisPrice(1234567.891, 2, { thousandSep: 'apostrophe' })).toBe("1'234'567.89");
    expect(formatAxisPrice(65000, 0, { thousandSep: 'apostrophe' })).toBe("65'000");
  });

  it('dot (de-DE): Punkt-Trenner mit Dezimal-KOMMA', () => {
    expect(formatAxisPrice(1234567.891, 2, { thousandSep: 'dot' })).toBe('1.234.567,89');
  });

  it('comma (en-US): Komma-Trenner, Dezimalpunkt', () => {
    expect(formatAxisPrice(1234567.891, 2, { thousandSep: 'comma' })).toBe('1,234,567.89');
  });

  it('space: Leerzeichen-Trenner', () => {
    expect(formatAxisPrice(1234567.891, 2, { thousandSep: 'space' })).toBe('1 234 567.89');
  });

  it('<= 3 Vorkomma-Stellen: kein Trenner', () => {
    expect(formatAxisPrice(123.45, 2, { thousandSep: 'apostrophe' })).toBe('123.45');
    expect(formatAxisPrice(999, 0, { thousandSep: 'dot' })).toBe('999');
  });

  it('ohne Optionen: Default none + smartDecimals (decimals=null)', () => {
    expect(formatAxisPrice(1234.5678, null)).toBe('1234.57'); // abs>=10 → 2 Dez.
    expect(formatAxisPrice(1.08475, null)).toBe('1.0848');    // 1..10 → 4 Dez.
    expect(formatAxisPrice(0.12345678, null)).toBe('0.12346'); // <1 → 5 Dez.
  });

  it('negative Werte: Vorzeichen vor dem gruppierten Betrag', () => {
    expect(formatAxisPrice(-1234567.5, 1, { thousandSep: 'apostrophe' })).toBe("-1'234'567.5");
    expect(formatAxisPrice(-1234567.5, 1, { thousandSep: 'dot' })).toBe('-1.234.567,5');
  });
});

describe('formatAxisPrice — trimZeros', () => {
  it('kürzt Null-Dezimalen und hängenden Dezimaltrenner', () => {
    expect(formatAxisPrice(1.5, 4, { trimZeros: true })).toBe('1.5');
    expect(formatAxisPrice(42, 2, { trimZeros: true })).toBe('42');
    expect(formatAxisPrice(1.0847, 5, { trimZeros: true })).toBe('1.0847');
  });

  it('trimZeros=false behält feste Dezimalstellen', () => {
    expect(formatAxisPrice(1.5, 4)).toBe('1.5000');
    expect(formatAxisPrice(42, 2)).toBe('42.00');
  });

  it('kombiniert mit dot-Stil (Dezimal-Komma wird mitgekürzt)', () => {
    expect(formatAxisPrice(65000, 2, { thousandSep: 'dot', trimZeros: true })).toBe('65.000');
    expect(formatAxisPrice(65000.5, 2, { thousandSep: 'dot', trimZeros: true })).toBe('65.000,5');
  });
});

describe('formatAxisPrice — Ränder', () => {
  it('nicht-finite Werte → leerer String', () => {
    expect(formatAxisPrice(NaN, 2)).toBe('');
    expect(formatAxisPrice(Infinity, 2)).toBe('');
    expect(formatAxisPrice(-Infinity, 2)).toBe('');
  });

  it('negative Null / Rundung auf 0 ohne Minuszeichen', () => {
    expect(formatAxisPrice(-0.0001, 2, { thousandSep: 'apostrophe' })).toBe('0.00');
    expect(formatAxisPrice(-0, 2)).toBe('0.00');
  });

  it('0 Dezimalstellen', () => {
    expect(formatAxisPrice(1234.9, 0, { thousandSep: 'comma' })).toBe('1,235');
  });
});
