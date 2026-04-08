// nodes/LineSeriesNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class LineSeriesNode extends SceneNode {
  // Explizit deklarieren
  private dataStore: any;
  private dataKey: string;
  private color: string;
  private lineWidth: number;

  constructor(
    dataStore: any,
    dataKey: string,
    color: string = '#2196F3',
    lineWidth: number = 2
  ) {
    super();
    // Manuell zuweisen
    this.dataStore = dataStore;
    this.dataKey = dataKey;
    this.color = color;
    this.lineWidth = lineWidth;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();

    let firstPoint = true;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const val = (candle as any)[this.dataKey]; // Type-Cast auf any, um dynamisch zuzugreifen

      if (val === undefined || val === null) continue;

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