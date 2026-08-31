// input/__tests__/axisHitTest.test.ts
// Version: 1.0.0 | Updated: 2026-08-13 | By: Agent
// ZV10-P7c: Tests für das Spalten-Hit-Testing der Y-Achsen.

import { describe, it, expect } from 'vitest';
import { findAxisScaleAt } from '../handlers/axisHitTest';
import type { AxisColumn } from '../../core/axisLayout';

// Geometrie wie computeAxisColumns(['compare','vol'], 1000, 60):
// Content 0..820 | vol 820..880 | compare 880..940 | Default 940..1000
const COLS: AxisColumn[] = [
  { scaleId: 'compare', x: 880, width: 60 },
  { scaleId: 'vol', x: 820, width: 60 },
];

describe('findAxisScaleAt', () => {
  it('ohne Zusatz-Spalten: Bestands-Verhalten (rechte Kante = Default)', () => {
    expect(findAxisScaleAt(970, 1000, 60, [])).toBe('right');
    expect(findAxisScaleAt(939, 1000, 60, [])).toBeNull();
  });

  it('trifft die richtige Spalte', () => {
    expect(findAxisScaleAt(970, 1000, 60, COLS)).toBe('right');
    expect(findAxisScaleAt(910, 1000, 60, COLS)).toBe('compare');
    expect(findAxisScaleAt(850, 1000, 60, COLS)).toBe('vol');
  });

  it('Content-Bereich → null', () => {
    expect(findAxisScaleAt(500, 1000, 60, COLS)).toBeNull();
    expect(findAxisScaleAt(819, 1000, 60, COLS)).toBeNull();
  });

  it('Spaltengrenzen: linke Kante gehört zur linken Nachbarzone', () => {
    expect(findAxisScaleAt(880, 1000, 60, COLS)).toBe('vol');     // Kante vol/compare
    expect(findAxisScaleAt(881, 1000, 60, COLS)).toBe('compare');
    expect(findAxisScaleAt(940, 1000, 60, COLS)).toBe('compare'); // Kante compare/default
    expect(findAxisScaleAt(941, 1000, 60, COLS)).toBe('right');
  });

  it('Coarse-Bonus (Touch): Zone vor der Content-Kante trifft die innerste Spalte', () => {
    expect(findAxisScaleAt(812, 1000, 60, COLS, 12)).toBe('vol');
    expect(findAxisScaleAt(807, 1000, 60, COLS, 12)).toBeNull();
    // ohne Zusatz-Spalten → Default
    expect(findAxisScaleAt(932, 1000, 60, [], 12)).toBe('right');
  });
});
