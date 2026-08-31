// nodes/indicators/EMANode.ts
// Version: 1.0.0 | Updated: 2026-04-09 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';
import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class EMANode extends BaseIndicatorNode {
  constructor(dataStore: any, period: number = 20, color: string = '#ff9800') {
    const config: IndicatorConfig = {
      id: `ema${period}`, label: `EMA ${period}`, color, lineWidth: 1.5,
      visible: true, pane: 'overlay', params: { period },
    };
    super(dataStore, config);
  }

  calculate(): void {
    this.dataStore.calculateEMA(this.config.params.period, this.config.id);
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig): void {
    if (!this.config.visible) return;
    this.drawLine(ctx, timeScale, priceScale, this.config.id, this.config.color, this.config.lineWidth);
  }
}
