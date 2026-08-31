// nodes/indicators/StochasticNode.ts
// Version: 1.0.0 | Updated: 2026-04-10 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';
import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class StochasticNode extends BaseIndicatorNode {
  constructor(dataStore: any, kPeriod: number = 14, smoothK: number = 3, dPeriod: number = 3) {
    const config: IndicatorConfig = {
      id: 'stochastic', label: `Stoch ${kPeriod},${smoothK},${dPeriod}`,
      color: '#2196f3', lineWidth: 2, visible: true, pane: 'separate',
      params: { kPeriod, smoothK, dPeriod },
    };
    super(dataStore, config);
  }

  calculate(): void {
    this.dataStore.calculateStochastic(
      this.config.params.kPeriod,
      this.config.params.smoothK,
      this.config.params.dPeriod
    );
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    if (!this.config.visible) return;
    // Overbought/oversold zones (80/20)
    const y80 = priceScale.priceToY(80);
    const y20 = priceScale.priceToY(20);
    ctx.save();
    ctx.fillStyle = options.colors.candleDown + '10';
    ctx.fillRect(0, Math.min(y80, 0), priceScale.height * 10, Math.abs(y80));
    ctx.fillStyle = options.colors.candleUp + '10';
    const y20Top = Math.min(y20, priceScale.height);
    ctx.fillRect(0, y20Top, priceScale.height * 10, priceScale.height - y20Top);
    ctx.restore();
    // Reference lines
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = options.colors.candleDown + '44';
    ctx.beginPath(); ctx.moveTo(0, y80); ctx.lineTo(priceScale.height * 10, y80); ctx.stroke();
    ctx.strokeStyle = options.colors.candleUp + '44';
    ctx.beginPath(); ctx.moveTo(0, y20); ctx.lineTo(priceScale.height * 10, y20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // %K line (blue)
    this.drawLine(ctx, timeScale, priceScale, 'stoch_k', '#2196f3', this.config.lineWidth);
    // %D line (orange, dashed)
    ctx.save();
    ctx.setLineDash([4, 3]);
    this.drawLine(ctx, timeScale, priceScale, 'stoch_d', '#ff9800', 1.5);
    ctx.setLineDash([]);
    ctx.restore();
  }
}
