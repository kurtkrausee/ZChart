// core/Pane.test.ts
// Version: 1.0.0 | Updated: 2026-08-13 | By: Agent
// ZV10-P7b: Tests für die Multi-Scale-Pane (priceScales-Map, Binding, Kompat).

import { describe, it, expect } from 'vitest';
import { Pane } from './Pane';
import { SceneNode } from '../nodes/core/SceneNode';
import { PriceScale } from '../math/PriceScale';
import { TimeScale } from '../math/TimeScale';

class ProbeNode extends SceneNode {
  public receivedScale: PriceScale | null = null;
  draw(_ctx: any, _ts: any, priceScale: PriceScale): void {
    this.receivedScale = priceScale;
  }
}

describe('Pane — priceScales (ZV10-P7b)', () => {
  it('Kompat: priceScale liefert die Default-Scale aus der Map', () => {
    const pane = new Pane('main', 1);
    expect(pane.priceScale).toBe(pane.priceScales.get(Pane.DEFAULT_SCALE_ID));
    expect(pane.priceScales.size).toBe(1);
  });

  it('ensurePriceScale ist idempotent und übernimmt die Pane-Höhe', () => {
    const pane = new Pane('main', 1);
    pane.priceScale.height = 400;
    const a = pane.ensurePriceScale('compare');
    const b = pane.ensurePriceScale('compare');
    expect(a).toBe(b);
    expect(a.height).toBe(400);
    expect(pane.priceScales.size).toBe(2);
  });

  it('resolveScale: bekannte ID → Scale, unbekannte/fehlende → Default', () => {
    const pane = new Pane('main', 1);
    const cmp = pane.ensurePriceScale('compare');
    expect(pane.resolveScale('compare')).toBe(cmp);
    expect(pane.resolveScale(undefined)).toBe(pane.priceScale);
    expect(pane.resolveScale('nope')).toBe(pane.priceScale);
  });

  it('removePriceScale: Default nicht entfernbar, gebundene Nodes fallen zurück', () => {
    const pane = new Pane('main', 1);
    pane.ensurePriceScale('compare');
    const node = new ProbeNode();
    node.yAxisId = 'compare';
    pane.addNode(node);

    expect(pane.removePriceScale(Pane.DEFAULT_SCALE_ID)).toBe(false);
    expect(pane.removePriceScale('compare')).toBe(true);
    expect(node.yAxisId).toBeUndefined();
    expect(pane.removePriceScale('compare')).toBe(false); // schon weg
  });

  it('draw bindet jeden Node an seine Scale (yAxisId, Default right)', () => {
    const pane = new Pane('main', 1);
    const cmp = pane.ensurePriceScale('compare');
    const defNode = new ProbeNode();
    const cmpNode = new ProbeNode();
    cmpNode.yAxisId = 'compare';
    pane.addNode(defNode);
    pane.addNode(cmpNode);

    pane.draw({} as CanvasRenderingContext2D, new TimeScale(), {} as any);

    expect(defNode.receivedScale).toBe(pane.priceScale);
    expect(cmpNode.receivedScale).toBe(cmp);
  });
});
