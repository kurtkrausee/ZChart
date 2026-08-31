// core/axisLayout.test.ts
// Version: 1.0.0 | Updated: 2026-08-13 | By: Agent
// ZV10-P7b: Tests für das Achsen-Spalten-Layout.

import { describe, it, expect } from 'vitest';
import { Pane } from './Pane';
import { collectExtraScaleIds, computeAxisColumns } from './axisLayout';

describe('collectExtraScaleIds', () => {
  it('sammelt Zusatz-Scales sichtbarer Panes, dedupliziert, ohne Default', () => {
    const main = new Pane('main', 0.8);
    main.ensurePriceScale('compare');
    const sub = new Pane('rsi', 0.2);
    sub.ensurePriceScale('compare'); // Duplikat
    sub.ensurePriceScale('volume2');
    expect(collectExtraScaleIds([main, sub])).toEqual(['compare', 'volume2']);
  });

  it('ignoriert unsichtbare Panes und hideAxis-Scales', () => {
    const hiddenPane = new Pane('x', 0);
    hiddenPane.ensurePriceScale('a');
    const main = new Pane('main', 1);
    main.ensurePriceScale('b').hideAxis = true;
    expect(collectExtraScaleIds([hiddenPane, main])).toEqual([]);
  });

  it('nur Default-Scale → keine Spalten', () => {
    expect(collectExtraScaleIds([new Pane('main', 1)])).toEqual([]);
  });
});

describe('computeAxisColumns', () => {
  it('ohne Zusatz-Scales: Bestands-Verhalten (contentWidth = width − axisWidth)', () => {
    const { columns, contentWidth } = computeAxisColumns([], 1000, 60);
    expect(columns).toEqual([]);
    expect(contentWidth).toBe(940);
  });

  it('stapelt Zusatz-Spalten von der Default-Spalte nach innen', () => {
    const { columns, contentWidth } = computeAxisColumns(['compare', 'vol'], 1000, 60);
    expect(columns).toEqual([
      { scaleId: 'compare', x: 880, width: 60 }, // direkt neben Default (940)
      { scaleId: 'vol', x: 820, width: 60 },
    ]);
    expect(contentWidth).toBe(820); // innerste Spalte = Content-Kante
  });
});
