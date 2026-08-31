// nodes/indicators/BaseIndicatorNode.ts
// Version: 1.6.0 | Updated: 2026-08-07 | By: Agent
// 1.6.0 (IAS-P5): drawLine kann Luecken brechen (breakOnGaps) — Segmente statt
//   Verbindungslinien ueber Kerzen ohne Wert (Outside/Inside Span "Nur Serien").
// Base class for all indicator overlay nodes

import { SceneNode } from '../core/SceneNode';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';

export interface IndicatorConfig {
  id: string;
  label: string;
  color: string;
  lineWidth: number;
  lineDash?: number[];
  visible: boolean;
  pane: 'overlay' | 'separate';
  params: Record<string, number | string>;
}

export abstract class BaseIndicatorNode extends SceneNode {
  public config: IndicatorConfig;
  protected dataStore: any;

  constructor(dataStore: any, config: IndicatorConfig) {
    super();
    this.dataStore = dataStore;
    this.config = config;
    this.role = `indicator-${config.id}`;
  }

  abstract calculate(): void;

  /**
   * Keys in DataStore that should contribute to auto Y-scaling of this pane.
   * Default: `[config.id]` – works for simple indicators that store their
   * single output series under the same name as the node id (e.g. ATR, ADX).
   * Multi-series indicators (MACD, BBands, Stochastic) must override this
   * and return every data key they emit so the pane scales correctly.
   */
  public getAutoScaleKeys(): string[] {
    return [this.config.id];
  }

  protected drawLine(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    dataKey: string,
    color: string,
    lineWidth: number,
    lineDash: number[] = [],
    /** IAS-P5: true = bei Kerzen ohne Wert neues Segment beginnen statt
     *  durchzuverbinden (Serien-Indikatoren wie Outside/Inside Span). */
    breakOnGaps: boolean = false
  ): void {
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(lineDash);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    let firstPoint = true;
    let lastIdx = -1; // IAS-P5: Index des letzten gezeichneten Punkts
    for (let i = 0; i < visibleData.length; i++) {
      const val = (visibleData[i] as any)[dataKey];
      if (typeof val !== 'number' || !Number.isFinite(val)) continue;
      const x = timeScale.indexToX(start + i);
      const y = priceScale.priceToY(val);
      // IAS-P5: Luecke (>=1 Kerze ohne Wert) -> Segment brechen, nicht verbinden.
      const gap = breakOnGaps && lastIdx >= 0 && i - lastIdx > 1;
      if (firstPoint || gap) { ctx.moveTo(x, y); firstPoint = false; }
      else ctx.lineTo(x, y);
      lastIdx = i;
    }
    ctx.stroke();
    ctx.restore();
  }
}
