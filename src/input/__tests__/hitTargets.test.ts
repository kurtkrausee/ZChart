// input/__tests__/hitTargets.test.ts
// Version: 1.0.0 | Updated: 2026-07-29 | By: Agent
//
// ZT-P3: Tests für coarse-pointer-abhängige Hit-Targets. Wie beim
// Interceptor-Chain-Test wird der InputManager ohne Konstruktor (kein DOM)
// via Object.create instanziiert — getestet werden nur DOM-freie Helper.

import { describe, it, expect } from 'vitest';
import { InputManager } from '../InputManager';

type Harness = {
  manager: { getDividerPositions(): { y: number; aboveIdx: number; belowIdx: number }[] };
  timeScale: unknown;
  findDividerAt(y: number, tolerance?: number): number | null;
  probeOffsets(coarse: boolean): ReadonlyArray<readonly [number, number]>;
  hitTestAnchorProbed(shape: unknown, x: number, y: number, ps: unknown, coarse: boolean): number | null;
};

function makeHarness(): Harness {
  const im = Object.create(InputManager.prototype) as unknown as Harness;
  im.manager = { getDividerPositions: () => [{ y: 100, aboveIdx: 0, belowIdx: 1 }] };
  return im;
}

describe('ZT-P3 Hit-Targets', () => {
  it('findDividerAt: Maus-Toleranz ±4px (Default), Touch ±12px', () => {
    const im = makeHarness();
    expect(im.findDividerAt(104)).toBe(0);
    expect(im.findDividerAt(105)).toBe(null);
    expect(im.findDividerAt(110)).toBe(null);       // Maus: außerhalb
    expect(im.findDividerAt(110, 12)).toBe(0);      // Touch: innerhalb
    expect(im.findDividerAt(113, 12)).toBe(null);
  });

  it('probeOffsets: präzise Pointer nur Zentrum, Touch = Zentrum + 2 Ringe (max 12px)', () => {
    const im = makeHarness();
    expect(im.probeOffsets(false)).toEqual([[0, 0]]);
    const ring = im.probeOffsets(true);
    expect(ring.length).toBe(17); // 1 + 8 + 8
    expect(ring[0]).toEqual([0, 0]); // Zentrum wird ZUERST getestet (exakter Hit gewinnt)
    const maxR = Math.max(...ring.map(([dx, dy]) => Math.hypot(dx, dy)));
    expect(maxR).toBeCloseTo(12, 1);
  });

  it('hitTestAnchorProbed: Touch trifft Anker außerhalb des präzisen Radius', () => {
    const im = makeHarness();
    // Fake-Shape: Anker bei (100,100), präziser Radius 6 (wie ANCHOR_RADIUS der Nodes)
    const shape = {
      hitTestAnchor: (px: number, py: number) =>
        Math.hypot(px - 100, py - 100) <= 6 ? 1 : null,
    };
    // Tap 14px daneben: Maus verfehlt, Touch (Probe-Ring 12px + Radius 6) trifft
    expect(im.hitTestAnchorProbed(shape, 114, 100, null, false)).toBe(null);
    expect(im.hitTestAnchorProbed(shape, 114, 100, null, true)).toBe(1);
    // Weit daneben: auch Touch verfehlt
    expect(im.hitTestAnchorProbed(shape, 130, 100, null, true)).toBe(null);
  });
});
