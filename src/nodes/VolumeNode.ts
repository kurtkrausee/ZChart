// nodes/VolumeNode.ts

import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import { SceneNode } from './SceneNode';
import { DataStore } from '../data/DataStore';
import type { ChartConfig } from '../core/ChartOptions';

export class VolumeNode extends SceneNode {
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const barWidth = Math.max(1, candleSpacing * 0.8);

    ctx.save();

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const x = timeScale.indexToX(start + i);
      
      // Volumen-Höhe berechnen
      const yVolume = priceScale.priceToY(candle.volume || 0);
      const zeroY = priceScale.height; // Unterkante der Pane
      const barHeight = zeroY - yVolume;

      // Farbe basierend auf Preisbewegung (grün wenn Close > Open)
      const isUp = candle.close >= candle.open;
      ctx.fillStyle = isUp ? options.colors.candleUp : options.colors.candleDown;
      ctx.globalAlpha = 0.5; // Volumen oft leicht transparent

      ctx.fillRect(x - barWidth / 2, yVolume, barWidth, barHeight);
    }

    ctx.restore();
  }
}