// TimeScale.test.ts
// Version: 1.0.0 | Updated: 2026-07-29 | By: Agent
// ZT-P2: Tests für den Fokuspunkt-Anker-Zoom (Wheel + Pinch teilen sich zoomAroundX).

import { describe, it, expect } from 'vitest';
import { TimeScale } from './TimeScale';

function makeScale(candleWidth = 10, scrollOffset = 0): TimeScale {
  const ts = new TimeScale();
  ts.width = 800;
  ts.candleWidth = candleWidth;
  ts.scrollOffset = scrollOffset;
  return ts;
}

describe('TimeScale.zoomAroundX', () => {
  it('hält den Index unter dem Fokuspunkt pixelgenau fixiert', () => {
    const ts = makeScale(10, -500);
    const focalX = 300;
    const indexBefore = ts.xToIndex(focalX);
    ts.zoomAroundX(focalX, 1.1);
    expect(ts.candleWidth).toBeCloseTo(11);
    expect(ts.xToIndex(focalX)).toBeCloseTo(indexBefore);
  });

  it('klemmt candleWidth auf [1, 100] (Wheel-Zoom-Grenzen)', () => {
    const zoomIn = makeScale(95);
    zoomIn.zoomAroundX(100, 1.5);
    expect(zoomIn.candleWidth).toBe(100);

    const zoomOut = makeScale(1.2);
    zoomOut.zoomAroundX(100, 0.5);
    expect(zoomOut.candleWidth).toBe(1);
  });

  it('ist identisch zur bisherigen Wheel-Zoom-Mathematik', () => {
    // Referenz: alte Inline-Rechnung aus onWheel (ZT-P1-Stand)
    const ref = makeScale(10, -250);
    const mouseX = 420;
    const indexUnderMouse = ref.xToIndex(mouseX);
    ref.candleWidth = Math.max(1, Math.min(ref.candleWidth * 0.9, 100));
    ref.scrollOffset = mouseX - indexUnderMouse * ref.candleWidth;

    const ts = makeScale(10, -250);
    ts.zoomAroundX(mouseX, 0.9);
    expect(ts.candleWidth).toBeCloseTo(ref.candleWidth);
    expect(ts.scrollOffset).toBeCloseTo(ref.scrollOffset);
  });

  it('ignoriert ungültige Faktoren (0, negativ, NaN)', () => {
    const ts = makeScale(10, -100);
    ts.zoomAroundX(200, 0);
    ts.zoomAroundX(200, -2);
    ts.zoomAroundX(200, NaN);
    expect(ts.candleWidth).toBe(10);
    expect(ts.scrollOffset).toBe(-100);
  });
});
