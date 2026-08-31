// nodes/LineSeriesNode.ts
// Version: 1.3.0 | Updated: 2026-04-24 | By: GitHub Copilot

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class LineSeriesNode extends SceneNode {
  public role = 'series';
  // Explizit deklarieren
  private dataStore: any;
  public dataKey: string;
  private color: string;
  private lineWidth: number;
  private lineDash: number[];

  constructor(
    dataStore: any,
    dataKey: string,
    color: string = '#2196F3',
    lineWidth: number = 2,
    lineDash: number[] = []
  ) {
    super();
    // Manuell zuweisen
    this.dataStore = dataStore;
    this.dataKey = dataKey;
    this.color = color;
    this.lineWidth = lineWidth;
    this.lineDash = lineDash;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig): void {
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.setLineDash(this.lineDash);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();

    let firstPoint = true;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const val = (candle as any)[this.dataKey]; // Type-Cast auf any, um dynamisch zuzugreifen

      if (typeof val !== 'number' || !Number.isFinite(val)) continue;

      const x = timeScale.indexToX(start + i);
      const y = priceScale.priceToY(val);

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }
}