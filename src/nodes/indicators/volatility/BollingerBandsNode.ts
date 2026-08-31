// nodes/indicators/BollingerBandsNode.ts
// Version: 1.0.0 | Updated: 2026-04-09 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';
import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class BollingerBandsNode extends BaseIndicatorNode {
  constructor(dataStore: any, period: number = 20, stdDev: number = 2, color: string = '#9c27b0') {
    const config: IndicatorConfig = {
      id: `bb${period}`, label: `BB(${period},${stdDev})`, color, lineWidth: 1,
      visible: true, pane: 'overlay', params: { period, stdDev },
    };
    super(dataStore, config);
  }

  calculate(): void {
    const period = Number(this.config.params.period);
    const stdDev = Number(this.config.params.stdDev);
    const data = this.dataStore.getAllData();
    const upper = `${this.config.id}_upper`;
    const middle = `${this.config.id}_middle`;
    const lower = `${this.config.id}_lower`;

    // Calculate SMA as middle band
    this.dataStore.calculateSMA(period, middle);

    for (let i = period - 1; i < data.length; i++) {
      const sma = (data[i] as any)[middle];
      if (sma === undefined) continue;
      let sumSqDiff = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSqDiff += (data[j].close - sma) ** 2;
      }
      const sd = Math.sqrt(sumSqDiff / period);
      (data[i] as any)[upper] = sma + stdDev * sd;
      (data[i] as any)[lower] = sma - stdDev * sd;
    }
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig): void {
    if (!this.config.visible) return;
    const id = this.config.id;
    const color = this.config.color;
    // Fill between bands
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visible = this.dataStore.getVisibleData(start, end);

    ctx.save();
    ctx.fillStyle = color + '15';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < visible.length; i++) {
      const u = (visible[i] as any)[`${id}_upper`];
      if (u === undefined) continue;
      const x = timeScale.indexToX(start + i);
      const y = priceScale.priceToY(u);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const l = (visible[i] as any)[`${id}_lower`];
      if (l === undefined) continue;
      ctx.lineTo(timeScale.indexToX(start + i), priceScale.priceToY(l));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw lines
    this.drawLine(ctx, timeScale, priceScale, `${id}_upper`, color + '88', 1);
    this.drawLine(ctx, timeScale, priceScale, `${id}_middle`, color, 1.5);
    this.drawLine(ctx, timeScale, priceScale, `${id}_lower`, color + '88', 1);
  }
}
