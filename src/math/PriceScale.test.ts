// PriceScale.test.ts
// Version: 1.0.0 | Updated: 2026-07-29 | By: Agent
// ZT-P2: Tests für den faktor-basierten Anker-Zoom (vertikaler Pinch).

import { describe, it, expect } from 'vitest';
import { PriceScale } from './PriceScale';

function makeScale(min = 100, max = 200, height = 500): PriceScale {
  const ps = new PriceScale();
  ps.height = height;
  ps.setRange(min, max);
  return ps;
}

describe('PriceScale.zoomFactorAnchored', () => {
  it('skaliert die Range um den Faktor und hält den Anker-Preis fixiert', () => {
    const ps = makeScale(100, 200);
    const anchor = 150;
    const yBefore = ps.priceToY(anchor);
    ps.zoomFactorAnchored(2, anchor);
    expect(ps.maxPrice - ps.minPrice).toBeCloseTo(200);
    expect(ps.priceToY(anchor)).toBeCloseTo(yBefore);
  });

  it('Anker außerhalb der Mitte: Preis bleibt auf gleichem Pixel', () => {
    const ps = makeScale(100, 200);
    const anchor = 120; // unteres Viertel
    const yBefore = ps.priceToY(anchor);
    ps.zoomFactorAnchored(0.5, anchor);
    expect(ps.maxPrice - ps.minPrice).toBeCloseTo(50);
    expect(ps.priceToY(anchor)).toBeCloseTo(yBefore);
  });

  it('klemmt auf 2%..5000% der aktuellen Range pro Aufruf', () => {
    const zoomIn = makeScale(100, 200);
    zoomIn.zoomFactorAnchored(0.001, 150);
    expect(zoomIn.maxPrice - zoomIn.minPrice).toBeCloseTo(100 * 0.02);

    const zoomOut = makeScale(100, 200);
    zoomOut.zoomFactorAnchored(1000, 150);
    expect(zoomOut.maxPrice - zoomOut.minPrice).toBeCloseTo(100 * 50);
  });

  it('ignoriert ungültige Faktoren und leere Ranges', () => {
    const ps = makeScale(100, 200);
    ps.zoomFactorAnchored(0, 150);
    ps.zoomFactorAnchored(-1, 150);
    ps.zoomFactorAnchored(NaN, 150);
    expect(ps.minPrice).toBe(100);
    expect(ps.maxPrice).toBe(200);

    const empty = makeScale(100, 100);
    empty.zoomFactorAnchored(2, 100);
    expect(empty.minPrice).toBe(100);
    expect(empty.maxPrice).toBe(100);
  });

  it('ohne Anker: Range-Mitte bleibt fix', () => {
    const ps = makeScale(100, 200);
    ps.zoomFactorAnchored(2);
    expect((ps.minPrice + ps.maxPrice) / 2).toBeCloseTo(150);
  });
});
