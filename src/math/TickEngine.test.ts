// TickEngine.test.ts
// Version: 1.1.0 | Updated: 2026-08-11 | By: Agent
// ZV10-P1: Tests für die Nice-Tick-Berechnung der Y-Achse.
// ZV10-P2: tickProvider-Tests (deklarierte Ticks ersetzen Nice-Ticks).

import { describe, it, expect } from 'vitest';
import { PriceScale } from './PriceScale';
import { niceStep, computeNiceTicks } from './TickEngine';

function makeScale(min: number, max: number, height = 500): PriceScale {
  const ps = new PriceScale();
  ps.height = height;
  ps.setRange(min, max);
  return ps;
}

/** Prüft, dass ein Wert ein (float-tolerantes) Vielfaches von step ist. */
function isMultipleOf(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

describe('niceStep', () => {
  it('rundet auf 1/2/2.5/5 × 10^n auf', () => {
    expect(niceStep(0.9)).toBeCloseTo(1);
    expect(niceStep(1.5)).toBeCloseTo(2);
    expect(niceStep(2.2)).toBeCloseTo(2.5);
    expect(niceStep(3)).toBeCloseTo(5);
    expect(niceStep(7)).toBeCloseTo(10);
    expect(niceStep(12)).toBeCloseTo(20);
    expect(niceStep(0.00007)).toBeCloseTo(0.0001, 10);
    expect(niceStep(3750)).toBeCloseTo(5000);
  });

  it('exakte Stufen bleiben erhalten', () => {
    expect(niceStep(1)).toBeCloseTo(1);
    expect(niceStep(2.5)).toBeCloseTo(2.5);
    expect(niceStep(50)).toBeCloseTo(50);
  });

  it('ungültige Eingaben → Fallback 1', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
    expect(niceStep(NaN)).toBe(1);
    expect(niceStep(Infinity)).toBe(1);
  });
});

describe('computeNiceTicks — linear', () => {
  it('Range 100..200 auf 500px → 10er-Schritte, deckungsgleich mit priceToY', () => {
    const ps = makeScale(100, 200);
    const ticks = computeNiceTicks(ps, 500);
    expect(ticks.length).toBe(11);
    expect(ticks[0].price).toBeCloseTo(100);
    expect(ticks[ticks.length - 1].price).toBeCloseTo(200);
    for (const t of ticks) {
      expect(isMultipleOf(t.price, 10)).toBe(true);
      expect(t.y).toBeCloseTo(ps.priceToY(t.price));
      expect(t.y).toBeGreaterThanOrEqual(-0.5);
      expect(t.y).toBeLessThanOrEqual(500.5);
    }
  });

  it('sehr kleine Range (Forex, 5 Dezimalen) → saubere Sub-Pip-Schritte ohne Float-Rauschen', () => {
    const ps = makeScale(1.0842, 1.0848, 400);
    const ticks = computeNiceTicks(ps, 400);
    // Range 0.0006 über 8 Intervalle → rawStep 7.5e-5 → nice 1e-4
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    for (const t of ticks) {
      expect(isMultipleOf(t.price, 0.0001)).toBe(true);
      // Kein Float-Rauschen: toFixed(5) muss den Wert exakt darstellen
      expect(Number(t.price.toFixed(5))).toBe(t.price);
    }
  });

  it('sehr große Range (BTC) → runde Tausender-Schritte', () => {
    const ps = makeScale(20000, 65000, 600);
    const ticks = computeNiceTicks(ps, 600);
    // Range 45000 über 12 Intervalle → rawStep 3750 → nice 5000
    expect(ticks.map((t) => t.price)).toEqual([
      20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000,
    ]);
  });

  it('Ticks sind streng steigend im Preis und streng fallend in y', () => {
    const ps = makeScale(37.3, 412.9, 800);
    const ticks = computeNiceTicks(ps, 800);
    expect(ticks.length).toBeGreaterThan(3);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].price).toBeGreaterThan(ticks[i - 1].price);
      expect(ticks[i].y).toBeLessThan(ticks[i - 1].y);
    }
  });

  it('negative Ranges (Oszillator um 0) enthalten runde Werte inkl. 0', () => {
    const ps = makeScale(-5, 105, 150);
    const ticks = computeNiceTicks(ps, 150);
    const prices = ticks.map((t) => t.price);
    expect(prices).toContain(0);
    expect(prices).toContain(100);
  });
});

describe('computeNiceTicks — Prozent-Modus', () => {
  it('Ticks liegen auf runden PROZENT-Werten, nicht runden Preisen', () => {
    const ps = makeScale(90, 115);
    ps.isPercent = true;
    ps.basePrice = 100;
    const ticks = computeNiceTicks(ps, 500);
    // pct-Range -10..+15 über 10 Intervalle → rawStep 2.5 → step 2.5
    expect(ticks.length).toBeGreaterThanOrEqual(9);
    for (const t of ticks) {
      const pct = ((t.price - 100) / 100) * 100;
      expect(isMultipleOf(pct, 2.5)).toBe(true);
      expect(t.y).toBeCloseTo(ps.priceToY(t.price));
    }
  });

  it('basePrice 0 → Fallback auf lineare Preis-Ticks (kein Div/0)', () => {
    const ps = makeScale(100, 200);
    ps.isPercent = true;
    ps.basePrice = 0;
    const ticks = computeNiceTicks(ps, 500);
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) expect(isMultipleOf(t.price, 10)).toBe(true);
  });
});

describe('computeNiceTicks — Log-Modus', () => {
  it('Ticks liegen auf runden PREISEN (max. 3 signifikante Stellen)', () => {
    const ps = makeScale(100, 10000, 600);
    ps.isLog = true;
    const ticks = computeNiceTicks(ps, 600);
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    for (const t of ticks) {
      // "Rund" = Vielfaches von 10^(Größenordnung-2), z.B. 125, 2500, 750
      const mag = Math.floor(Math.log10(Math.abs(t.price)));
      const unit = Math.pow(10, mag - 2);
      expect(isMultipleOf(t.price, unit)).toBe(true);
      expect(t.price).toBeGreaterThan(0);
      expect(t.y).toBeCloseTo(ps.priceToY(t.price), 6);
    }
  });

  it('Pixelabstände bleiben in der Nähe des Zielabstands, streng monoton', () => {
    const ps = makeScale(50, 60000, 800);
    ps.isLog = true;
    const ticks = computeNiceTicks(ps, 800, 50);
    expect(ticks.length).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].price).toBeLessThan(ticks[i - 1].price); // von oben nach unten
      const gap = ticks[i].y - ticks[i - 1].y;
      expect(gap).toBeGreaterThanOrEqual(25); // >= 0.5 × spacing
      expect(gap).toBeLessThanOrEqual(150);
    }
  });

  it('Forex-Range im Log-Modus → keine Endlosschleife, runde Sub-1-Preise', () => {
    const ps = makeScale(1.05, 1.12, 400);
    ps.isLog = true;
    const ticks = computeNiceTicks(ps, 400);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const t of ticks) {
      expect(t.price).toBeGreaterThanOrEqual(1.05 - 1e-9);
      expect(t.price).toBeLessThanOrEqual(1.12 + 1e-9);
    }
  });
});

describe('computeNiceTicks — tickProvider (ZV10-P2)', () => {
  it('deklarierte Ticks ersetzen die Nice-Tick-Berechnung komplett', () => {
    const ps = makeScale(-5, 105, 200);
    ps.tickProvider = () => [0, 20, 50, 80, 100];
    const ticks = computeNiceTicks(ps, 200);
    expect(ticks.map((t) => t.price)).toEqual([0, 20, 50, 80, 100]);
    for (const t of ticks) expect(t.y).toBeCloseTo(ps.priceToY(t.price));
  });

  it('filtert Werte außerhalb der sichtbaren Range (User hat gezoomt)', () => {
    const ps = makeScale(40, 90, 200); // nur 50 und 80 sichtbar
    ps.tickProvider = () => [0, 20, 50, 80, 100];
    const prices = computeNiceTicks(ps, 200).map((t) => t.price);
    expect(prices).toEqual([50, 80]);
  });

  it('sortiert unsortierte Provider-Werte und wirft nicht-finite raus', () => {
    const ps = makeScale(0, 100, 300);
    ps.tickProvider = () => [80, NaN, 20, Infinity, 50];
    expect(computeNiceTicks(ps, 300).map((t) => t.price)).toEqual([20, 50, 80]);
  });

  it('leerer Provider → keine Ticks (kein Fallback auf Nice-Ticks)', () => {
    const ps = makeScale(0, 100, 300);
    ps.tickProvider = () => [];
    expect(computeNiceTicks(ps, 300)).toEqual([]);
  });
});

describe('computeNiceTicks — degenerierte Eingaben', () => {
  it('min == max → leeres Array', () => {
    expect(computeNiceTicks(makeScale(100, 100), 500)).toEqual([]);
  });

  it('min > max → leeres Array', () => {
    expect(computeNiceTicks(makeScale(200, 100), 500)).toEqual([]);
  });

  it('nicht-finite Range oder Höhe 0 → leeres Array', () => {
    expect(computeNiceTicks(makeScale(NaN, 100), 500)).toEqual([]);
    expect(computeNiceTicks(makeScale(0, Infinity), 500)).toEqual([]);
    expect(computeNiceTicks(makeScale(100, 200), 0)).toEqual([]);
    expect(computeNiceTicks(makeScale(100, 200), NaN)).toEqual([]);
  });

  it('Log-Modus mit min <= 0 → kein Crash, keine nicht-finiten Ticks', () => {
    const ps = makeScale(0, 100, 400);
    ps.isLog = true;
    const ticks = computeNiceTicks(ps, 400);
    for (const t of ticks) {
      expect(Number.isFinite(t.price)).toBe(true);
      expect(Number.isFinite(t.y)).toBe(true);
    }
  });
});
