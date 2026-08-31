// math/AutoScaleEngine.ts
// Version: 2.0.0 | Updated: 2026-08-13 | By: Agent
// v2.0.0 (ZV10-P7b): Multi-Y-Achse — skaliert JEDE Scale der Pane separat;
//   je Scale zählen nur die gebundenen Nodes (node.yAxisId, Default 'right').
//   main/volume-Sonderfälle gelten nur für die Default-Scale; Zusatz-Scales
//   laufen immer über fixedRange bzw. den generischen Fit.
// v1.8.0 (ZV10-P2): priceScale.fixedRange ersetzt den paneId-Switch für
//   rsi/stochastic — Panes deklarieren ihre feste Range selbst (Registry/
//   Pane-Erzeugung). fixedRange greift auch bei leerem visibleData.
// v1.7.0 (UXB-P2): scaleMainChart nimmt sichtbare Overlay-Serien (EMA/BB …)
//   in die Y-Range auf (Cap: 50 % über Candle-Spanne) + Finite-Guards —
//   Bänder clippen nicht mehr am Rand, NaN-Kerzen kippen die Skala nicht.
// v1.6.0 (SU-P5b): scaleGeneric fragt Nodes zusätzlich per Duck-Typing nach
//   `getAutoScaleRange(): {min,max}|null` — für Nodes, deren Serien NICHT im
//   DataStore liegen (CustomScriptIndicatorNode hält seine Plot-Daten selbst).
// P4.8: scalePane accepts ChartConfig, uses options.layout.marginTop/Bottom
// v1.4.0: scaleGeneric überspringt unsichtbare Nodes (isVisible === false),
//   damit ein ausgeblendeter Layer die Y-Achse nicht mehr mitbestimmt.
// v1.5.0: scaleGeneric respektiert `getAutoScaleKeys()` auch auf Nicht-
//   Indicator-Nodes (z.B. ExcursionBarsNode mit runup/ddown).

import { Pane } from '../core/Pane';
import { BaseIndicatorNode } from '../nodes/indicators/BaseIndicatorNode';
import { StaticLineNode } from '../nodes/core/StaticLineNode';
import type { ChartConfig } from '../core/ChartOptions';

export class AutoScaleEngine {
  
  /**
   * Berechnet die Min/Max Werte der PriceScale basierend auf den sichtbaren Daten.
   * P4.8: options.layout.marginTop/Bottom steuern den Padding-Anteil.
   */
  public scalePane(pane: Pane, visibleData: any[], options?: ChartConfig) {
    // ZV10-P7b: jede Scale der Pane separat skalieren (gebundene Nodes je Scale).
    for (const [scaleId, scale] of pane.priceScales) {
      this.scaleOne(pane, scaleId, scale, visibleData, options);
    }
  }

  private scaleOne(
    pane: Pane,
    scaleId: string,
    scale: import('./PriceScale').PriceScale,
    visibleData: any[],
    options?: ChartConfig
  ) {
    // ZV10-P2: Deklarierte feste Range (RSI/Stoch -5..105, …) hat Vorrang vor
    // jedem Daten-Fit und gilt auch ohne sichtbare Daten.
    const fixed = scale.fixedRange;
    if (fixed && isFinite(fixed.min) && isFinite(fixed.max) && fixed.max > fixed.min) {
      scale.setRange(fixed.min, fixed.max);
      return;
    }

    if (visibleData.length === 0) return;

    // ZV10-P7b: nur die an diese Scale gebundenen Nodes zählen.
    const nodes = pane.nodes.filter(n => (n.yAxisId ?? Pane.DEFAULT_SCALE_ID) === scaleId);
    const isDefault = scaleId === Pane.DEFAULT_SCALE_ID;

    if (isDefault && pane.id === 'main') {
      this.scaleMainChart(scale, nodes, visibleData, options);
    } else if (isDefault && pane.id === 'volume') {
      this.scaleVolume(scale, visibleData);
    } else {
      // Generic fit: scan every bound node, collect min/max of its dataKey(s).
      this.scaleGeneric(scale, nodes, visibleData);
    }
  }

  private scaleMainChart(
    scale: import('./PriceScale').PriceScale,
    nodes: Pane['nodes'],
    visibleData: any[],
    options?: ChartConfig
  ) {
    let min = Infinity;
    let max = -Infinity;
    for (const candle of visibleData) {
      if (isFinite(candle.high) && candle.high > max) max = candle.high;
      if (isFinite(candle.low)  && candle.low  < min) min = candle.low;
    }
    if (!isFinite(min) || !isFinite(max)) return;

    // v1.7.0 (UXB-P2): Sichtbare Overlay-Serien (EMA/Bollinger/Keltner …) in
    // die Skala einbeziehen, damit Bänder nicht am oberen/unteren Rand clippen.
    // Begrenzung wie bei Static-Lines in scaleGeneric: max. 50 % über die
    // Candle-Spanne hinaus, damit ein Ausreißer-Overlay die Kerzen nicht
    // zusammenstaucht.
    const candleSpan = Math.max(max - min, Math.abs(max) * 0.01, 1e-9);
    const lowerBound = min - candleSpan * 0.5;
    const upperBound = max + candleSpan * 0.5;
    const overlayKeys: string[] = [];
    for (const node of nodes) {
      if (node.isVisible === false) continue;
      if (node instanceof BaseIndicatorNode) {
        overlayKeys.push(...(node.getAutoScaleKeys?.() ?? [node.config.id]));
      }
    }
    if (overlayKeys.length > 0) {
      for (const candle of visibleData) {
        for (const k of overlayKeys) {
          const v = (candle as any)[k];
          if (typeof v !== 'number' || !isFinite(v)) continue;
          if (v < min && v >= lowerBound) min = v;
          if (v > max && v <= upperBound) max = v;
        }
      }
    }

    const marginTop    = options?.layout.marginTop    ?? 0.1;
    const marginBottom = options?.layout.marginBottom ?? 0.1;
    const range = max - min;
    scale.setRange(min - range * marginBottom, max + range * marginTop);
  }

  private scaleVolume(scale: import('./PriceScale').PriceScale, visibleData: any[]) {
    let maxVol = 0;
    for (const c of visibleData) {
      if (c.volume > maxVol) maxVol = c.volume;
    }
    scale.setRange(0, maxVol * 1.1); // 10% Platz nach oben
  }

  /**
   * Generic pane scaling: inspects every LineSeriesNode + BaseIndicatorNode
   * in the pane and fits min/max to the union of their visible values.
   * Used for ATR, ADX, MACD … and every server-side indicator that adds its
   * own LineSeriesNode.
   */
  private scaleGeneric(
    scale: import('./PriceScale').PriceScale,
    nodes: Pane['nodes'],
    visibleData: any[]
  ) {
    // v1.2.0: Separate data-keys from static-line values so that out-of-range
    // static lines (e.g. RSI-Levels at 30/70 placed in a sub-pane whose data
    // oscillates between 0.4 and 0.6) don't blow up the y-axis and squash
    // the actual indicator curve into a flat line.
    const dataKeys: string[] = [];
    const staticValues: number[] = [];
    // v1.6.0: Node-eigene Ranges (Serien außerhalb des DataStore).
    const nodeRanges: Array<{ min: number; max: number }> = [];
    let hasZeroCenteredIndicator = false;
    for (const node of nodes) {
      // Ausgeblendete Layer dürfen die Y-Achse nicht mitbestimmen.
      if (node.isVisible === false) continue;
      const rangeFn = (node as any).getAutoScaleRange;
      if (typeof rangeFn === 'function') {
        const r = rangeFn.call(node);
        if (r && isFinite(r.min) && isFinite(r.max)) nodeRanges.push(r);
      }
      if (node instanceof StaticLineNode) {
        if (isFinite(node.value)) staticValues.push(node.value);
      } else if (node instanceof BaseIndicatorNode) {
        // Prefer explicit auto-scale keys (multi-series indicators like MACD).
        const nodeKeys = node.getAutoScaleKeys?.() ?? [node.config.id];
        dataKeys.push(...nodeKeys);
        // Indicators that oscillate around zero (MACD) should keep their
        // y-axis symmetric so zoom/pan feels natural.
        if (node.config.id === 'macd') hasZeroCenteredIndicator = true;
      } else {
        // Duck-typed: ein Node kann seine Y-Skalierungs-Keys auf zwei Wegen
        // melden — `getAutoScaleKeys()` (mehrere Keys, z.B. ExcursionBarsNode
        // mit runup/ddown) ODER ein einzelnes string-`dataKey` (LineSeriesNode,
        // SplitLineNode …).
        const keysFn = (node as any).getAutoScaleKeys;
        if (typeof keysFn === 'function') {
          const ks = keysFn.call(node);
          if (Array.isArray(ks)) dataKeys.push(...ks.filter((k: unknown) => typeof k === 'string'));
        } else {
          const dk = (node as any).dataKey;
          if (typeof dk === 'string' && dk) dataKeys.push(dk);
        }
      }
    }
    if (dataKeys.length === 0 && staticValues.length === 0 && nodeRanges.length === 0) return;

    // 1) Compute data range first (highest priority - what the user wants to see).
    let dataMin = Infinity;
    let dataMax = -Infinity;
    for (const candle of visibleData) {
      for (const k of dataKeys) {
        const v = (candle as any)[k];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        if (v < dataMin) dataMin = v;
        if (v > dataMax) dataMax = v;
      }
    }
    // v1.6.0: Node-eigene Ranges zählen wie Daten (höchste Priorität).
    for (const r of nodeRanges) {
      if (r.min < dataMin) dataMin = r.min;
      if (r.max > dataMax) dataMax = r.max;
    }

    let min: number;
    let max: number;
    const dataValid = isFinite(dataMin) && isFinite(dataMax);

    if (dataValid) {
      min = dataMin;
      max = dataMax;
      // 2) Include static lines ONLY when they're "close enough" to the data
      // range. Threshold: extend at most 50% beyond current data span.
      const dataSpan = Math.max(dataMax - dataMin, Math.abs(dataMax) * 0.01, 1e-6);
      const tolerance = dataSpan * 0.5;
      const lowerBound = dataMin - tolerance;
      const upperBound = dataMax + tolerance;
      for (const v of staticValues) {
        if (v >= lowerBound && v <= upperBound) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
        // else: silently skip out-of-range static line so it won't squash the data.
      }
    } else if (staticValues.length > 0) {
      // No data series — fall back to static lines only.
      min = Math.min(...staticValues);
      max = Math.max(...staticValues);
    } else {
      return;
    }

    if (!isFinite(min) || !isFinite(max)) return;
    if (min === max) {
      // Single constant line — give a small symmetric range so the line
      // doesn't collapse onto one pixel row.
      const eps = Math.max(Math.abs(min) * 0.1, 1e-6);
      min -= eps;
      max += eps;
    }
    if (hasZeroCenteredIndicator) {
      // Symmetric around zero so the histogram baseline sits in the middle.
      const absMax = Math.max(Math.abs(min), Math.abs(max));
      min = -absMax;
      max = absMax;
    }
    const padding = (max - min) * 0.1;
    scale.setRange(min - padding, max + padding);
  }
}