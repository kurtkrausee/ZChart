// nodes/indicators/RSINode.ts
// Version: 1.0.0 | Updated: 2026-04-09 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';
import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class RSINode extends BaseIndicatorNode {
  constructor(dataStore: any, period: number = 14, color: string = '#f39c12') {
    const config: IndicatorConfig = {
      id: 'rsi', label: `RSI ${period}`, color, lineWidth: 2,
      visible: true, pane: 'separate', params: { period },
    };
    super(dataStore, config);
  }

  calculate(): void {
    this.dataStore.calculateRSI(this.config.params.period);
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    if (!this.config.visible) return;
    // Overbought/oversold zones
    const y70 = priceScale.priceToY(70);
    const y30 = priceScale.priceToY(30);
    ctx.save();
    ctx.fillStyle = options.colors.candleDown + '10';
    ctx.fillRect(0, Math.min(y70, 0), priceScale.height * 10, Math.abs(y70));
    ctx.fillStyle = options.colors.candleUp + '10';
    const y30Top = Math.min(y30, priceScale.height);
    ctx.fillRect(0, y30Top, priceScale.height * 10, priceScale.height - y30Top);
    ctx.restore();
    // Reference lines
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = options.colors.candleDown + '44';
    ctx.beginPath(); ctx.moveTo(0, y70); ctx.lineTo(priceScale.height * 10, y70); ctx.stroke();
    ctx.strokeStyle = options.colors.candleUp + '44';
    ctx.beginPath(); ctx.moveTo(0, y30); ctx.lineTo(priceScale.height * 10, y30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // RSI line
    this.drawLine(ctx, timeScale, priceScale, 'rsi', this.config.color, this.config.lineWidth);
  }
}
