// nodes/CandlestickNode.ts

import type { ChartConfig } from '../../core/ChartOptions';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import { DataStore } from '../../data/DataStore';

export class CandlestickNode extends SceneNode {
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
    
    // Kerzenbreite berechnen (z.B. 80% des Platzes zwischen zwei Kerzen)
    // Wenn Abstand zwischen Index 0 und 1 = 10px ist, wird die Kerze 8px breit
    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const bodyWidth = Math.max(1, candleSpacing * 0.8);
    const halfWidth = bodyWidth / 2;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const realIndex = start + i;
      
      const x = timeScale.indexToX(realIndex);
      
      const yOpen = priceScale.priceToY(candle.open);
      const yClose = priceScale.priceToY(candle.close);
      const yHigh = priceScale.priceToY(candle.high);
      const yLow = priceScale.priceToY(candle.low);

      const isUp = candle.close >= candle.open;
      const color = isUp ? candleUp : candleDown;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // 1. Docht (Wick) zeichnen
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // 2. Körper (Body) zeichnen
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen)); // Mind. 1px Höhe

      // x ist die Mitte, also "x - halfWidth" für die linke Kante
      ctx.fillRect(x - halfWidth, bodyTop, bodyWidth, bodyHeight);
    }
    
    ctx.restore();
  }
}