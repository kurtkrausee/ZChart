// react-app/src/zchart/math/AutoScaleEngine.test.ts
// Version: 1.2.0 | Updated: 2026-08-13 | By: Agent
// 1.2.0 (ZV10-P7b): Stubs führen priceScales-Map; Multi-Scale-Split-Tests
// 1.1.0 (ZV10-P2): fixedRange-Kontrakt ersetzt den hardcodierten rsi-paneId-Test
import { describe, it, expect } from "vitest";
import { AutoScaleEngine } from "./AutoScaleEngine";
import { LineSeriesNode } from "../nodes/series/LineSeriesNode";
import { StaticLineNode } from "../nodes/core/StaticLineNode";

// Minimal Pane-Stub mit eigener PriceScale-Stub-Implementierung. Die echte
// PriceScale ist groß; für scaleGeneric brauchen wir nur `setRange`.
interface CapturedRange {
  min: number;
  max: number;
}

function buildPane(nodes: any[]): { pane: any; captured: CapturedRange } {
  const captured: CapturedRange = { min: NaN, max: NaN };
  const priceScale = {
    setRange: (mn: number, mx: number) => {
      captured.min = mn;
      captured.max = mx;
    },
  };
  // ZV10-P7b: Engine iteriert pane.priceScales — Stub führt die Default-Scale.
  const pane = {
    id: "custom-pane-id",
    nodes,
    priceScale,
    priceScales: new Map([["right", priceScale]]),
  };
  return { pane, captured };
}

describe("AutoScaleEngine.scalePane (scaleGeneric path)", () => {
  it("fits to data range for a single LineSeriesNode", () => {
    const node = new LineSeriesNode({ getAllData: () => [] }, "rsi", "#fff", 1);
    const { pane, captured } = buildPane([node]);
    const visibleData = [{ rsi: 30 }, { rsi: 70 }, { rsi: 50 }];
    new AutoScaleEngine().scalePane(pane, visibleData);
    // 10% padding → min=30-4=26, max=70+4=74
    expect(captured.min).toBeCloseTo(26, 5);
    expect(captured.max).toBeCloseTo(74, 5);
  });

  it("ignores out-of-range static lines that would squash the data range (J-1 fix)", () => {
    const dataNode = new LineSeriesNode({ getAllData: () => [] }, "score", "#fff", 1);
    // RSI-style level lines at 30 / 70, but data lives in 0.4–0.6.
    const lvl30 = new StaticLineNode(30, "#888", [], 1);
    const lvl70 = new StaticLineNode(70, "#888", [], 1);
    const { pane, captured } = buildPane([dataNode, lvl30, lvl70]);
    const visibleData = [{ score: 0.4 }, { score: 0.5 }, { score: 0.6 }];
    new AutoScaleEngine().scalePane(pane, visibleData);
    // Without the fix, max would be ≥70 → data would collapse.
    expect(captured.max).toBeLessThan(1);
    expect(captured.min).toBeLessThan(0.5);
  });

  it("includes static lines that are within tolerance of data range", () => {
    const dataNode = new LineSeriesNode({ getAllData: () => [] }, "score", "#fff", 1);
    // Data 30..70, level 80 is within 50% of span (40 → tolerance 20).
    const lvl80 = new StaticLineNode(80, "#888", [], 1);
    const { pane, captured } = buildPane([dataNode, lvl80]);
    const visibleData = [{ score: 30 }, { score: 70 }];
    new AutoScaleEngine().scalePane(pane, visibleData);
    expect(captured.max).toBeGreaterThanOrEqual(80);
  });

  it("falls back to static-only scaling when no data series present", () => {
    const lvl = new StaticLineNode(100, "#888", [], 1);
    const { pane, captured } = buildPane([lvl]);
    new AutoScaleEngine().scalePane(pane, [{ x: 1 }, { x: 2 }]);
    // min === max === 100 path → ±10% epsilon
    expect(captured.min).toBeLessThan(100);
    expect(captured.max).toBeGreaterThan(100);
  });

  it("does nothing for empty visibleData", () => {
    const node = new LineSeriesNode({ getAllData: () => [] }, "rsi", "#fff", 1);
    const { pane, captured } = buildPane([node]);
    new AutoScaleEngine().scalePane(pane, []);
    expect(Number.isNaN(captured.min)).toBe(true);
    expect(Number.isNaN(captured.max)).toBe(true);
  });
});

describe("AutoScaleEngine fixedRange (ZV10-P2)", () => {
  function paneWithFixedRange(id: string, fixedRange: any, nodes: any[] = []) {
    const captured: CapturedRange = { min: NaN, max: NaN };
    const priceScale = {
      fixedRange,
      setRange: (a: number, b: number) => Object.assign(captured, { min: a, max: b }),
    };
    const pane: any = { id, nodes, priceScale, priceScales: new Map([["right", priceScale]]) };
    return { pane, captured };
  }

  it("fixedRange gewinnt gegen jeden Daten-Fit (RSI-Pane -5..105)", () => {
    const { pane, captured } = paneWithFixedRange("rsi", { min: -5, max: 105 });
    new AutoScaleEngine().scalePane(pane, [{ rsi: 50 }]);
    expect(captured.min).toBe(-5);
    expect(captured.max).toBe(105);
  });

  it("fixedRange greift auch bei leerem visibleData", () => {
    const { pane, captured } = paneWithFixedRange("stochastic", { min: -5, max: 105 });
    new AutoScaleEngine().scalePane(pane, []);
    expect(captured.min).toBe(-5);
    expect(captured.max).toBe(105);
  });

  it("ungültige fixedRange (min>=max, NaN) wird ignoriert → Daten-Fit", () => {
    const node = new LineSeriesNode({ getAllData: () => [] }, "x", "#fff", 1);
    const bad = paneWithFixedRange("custom", { min: 10, max: 10 }, [node]);
    new AutoScaleEngine().scalePane(bad.pane, [{ x: 1 }, { x: 3 }]);
    expect(bad.captured.min).toBeCloseTo(0.8, 5); // 1 - 10% von Range 2
    expect(bad.captured.max).toBeCloseTo(3.2, 5);

    const nan = paneWithFixedRange("custom", { min: NaN, max: 105 }, [node]);
    new AutoScaleEngine().scalePane(nan.pane, [{ x: 1 }, { x: 3 }]);
    expect(nan.captured.min).toBeCloseTo(0.8, 5);
  });

  it("rsi-paneId OHNE fixedRange fällt jetzt auf generischen Daten-Fit zurück", () => {
    const node = new LineSeriesNode({ getAllData: () => [] }, "rsi", "#fff", 1);
    const { pane, captured } = paneWithFixedRange("rsi", null, [node]);
    new AutoScaleEngine().scalePane(pane, [{ rsi: 30 }, { rsi: 70 }]);
    expect(captured.min).toBeCloseTo(26, 5);
    expect(captured.max).toBeCloseTo(74, 5);
  });
});

describe("AutoScaleEngine Multi-Scale-Split (ZV10-P7b)", () => {
  function capturingScale(extra: Record<string, unknown> = {}) {
    const captured: CapturedRange = { min: NaN, max: NaN };
    const scale = {
      ...extra,
      setRange: (a: number, b: number) => Object.assign(captured, { min: a, max: b }),
    };
    return { scale, captured };
  }

  it("skaliert jede Scale nur mit ihren gebundenen Nodes", () => {
    const rsiNode = new LineSeriesNode({ getAllData: () => [] }, "rsi", "#fff", 1);
    const cmpNode = new LineSeriesNode({ getAllData: () => [] }, "cmp", "#fff", 1);
    (cmpNode as any).yAxisId = "compare";
    const def = capturingScale();
    const cmp = capturingScale();
    const pane: any = {
      id: "custom",
      nodes: [rsiNode, cmpNode],
      priceScale: def.scale,
      priceScales: new Map([["right", def.scale], ["compare", cmp.scale]]),
    };
    new AutoScaleEngine().scalePane(pane, [
      { rsi: 30, cmp: 5000 },
      { rsi: 70, cmp: 6000 },
    ]);
    // Default-Scale: nur rsi (30..70 + 10% padding) — cmp verzerrt sie nicht
    expect(def.captured.min).toBeCloseTo(26, 5);
    expect(def.captured.max).toBeCloseTo(74, 5);
    // compare-Scale: nur cmp (5000..6000 + 10% padding)
    expect(cmp.captured.min).toBeCloseTo(4900, 5);
    expect(cmp.captured.max).toBeCloseTo(6100, 5);
  });

  it("fixedRange gilt pro Scale unabhängig", () => {
    const node = new LineSeriesNode({ getAllData: () => [] }, "x", "#fff", 1);
    const def = capturingScale();
    const fix = capturingScale({ fixedRange: { min: 0, max: 100 } });
    const pane: any = {
      id: "custom",
      nodes: [node],
      priceScale: def.scale,
      priceScales: new Map([["right", def.scale], ["fixed", fix.scale]]),
    };
    new AutoScaleEngine().scalePane(pane, [{ x: 1 }, { x: 3 }]);
    expect(def.captured.min).toBeCloseTo(0.8, 5);
    expect(fix.captured.min).toBe(0);
    expect(fix.captured.max).toBe(100);
  });

  it("main-Pane: Candle-Fit nur auf der Default-Scale, Zusatz-Scale generisch", () => {
    const cmpNode = new LineSeriesNode({ getAllData: () => [] }, "cmp", "#fff", 1);
    (cmpNode as any).yAxisId = "compare";
    const def = capturingScale();
    const cmp = capturingScale();
    const pane: any = {
      id: "main",
      nodes: [cmpNode],
      priceScale: def.scale,
      priceScales: new Map([["right", def.scale], ["compare", cmp.scale]]),
    };
    new AutoScaleEngine().scalePane(pane, [
      { high: 110, low: 90, cmp: 5 },
      { high: 120, low: 100, cmp: 7 },
    ]);
    // Default: Candle-Fit 90..120 + 10% Margin
    expect(def.captured.min).toBeCloseTo(87, 5);
    expect(def.captured.max).toBeCloseTo(123, 5);
    // compare: generischer Fit 5..7 + 10% padding — Candles egal
    expect(cmp.captured.min).toBeCloseTo(4.8, 5);
    expect(cmp.captured.max).toBeCloseTo(7.2, 5);
  });
});
