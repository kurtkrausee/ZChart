// nodes/series/OhlcBarNode.ts

import type { ChartConfig } from '../../core/ChartOptions';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import { DataStore } from '../../data/DataStore';

export class OhlcBarNode extends SceneNode {
    public role = 'series';
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void {
    const totalCandles = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalCandles);
    const visibleData = this.dataStore.getVisibleData(start, end);

    ctx.save();
    const { candleUp, candleDown } = options.colors;

    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const tickWidth = Math.max(1, candleSpacing * 0.35);

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const x = timeScale.indexToX(start + i);

      const yOpen = priceScale.priceToY(candle.open);
      const yClose = priceScale.priceToY(candle.close);
      const yHigh = priceScale.priceToY(candle.high);
      const yLow = priceScale.priceToY(candle.low);

      const isUp = candle.close >= candle.open;
      ctx.strokeStyle = isUp ? candleUp : candleDown;
      ctx.lineWidth = Math.max(1, candleSpacing * 0.12);

      // Vertical wick (high → low)
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Left tick (open)
      ctx.beginPath();
      ctx.moveTo(x - tickWidth, yOpen);
      ctx.lineTo(x, yOpen);
      ctx.stroke();

      // Right tick (close)
      ctx.beginPath();
      ctx.moveTo(x, yClose);
      ctx.lineTo(x + tickWidth, yClose);
      ctx.stroke();
    }

    ctx.restore();
  }
}
