// nodes/HistogramNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class HistogramNode extends SceneNode {
  public role = 'series'; 
  private dataStore: any;
  private dataKey: string;
  private colorUp: string;
  private colorDown: string;
  private opacity: number;

  constructor(
    dataStore: any,
    dataKey: string,
    colorUp: string = '#26a69a',
    colorDown: string = '#ef5350',
    opacity: number = 0.5
  ) {
    super();
    this.dataStore = dataStore;
    this.dataKey = dataKey;
    this.colorUp = colorUp;
    this.colorDown = colorDown;
    this.opacity = opacity;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const barWidth = Math.max(1, candleSpacing * 0.8);

    ctx.save();
    ctx.globalAlpha = this.opacity;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const value = (candle as any)[this.dataKey];
      
      if (value === undefined || value === null) continue;

      const x = timeScale.indexToX(start + i);
      const yValue = priceScale.priceToY(value);
      const yZero = priceScale.priceToY(0); // Die Nulllinie der Skala
      
      const height = yZero - yValue;

      // Farbe basierend auf Preisbewegung (oder Wert selbst bei MACD)
      const isUp = candle.close >= candle.open;
      ctx.fillStyle = isUp ? this.colorUp : this.colorDown;

      // Wir zeichnen vom "Nullpunkt" aus nach oben
      ctx.fillRect(x - barWidth / 2, yValue, barWidth, height);
    }

    ctx.restore();
  }
}