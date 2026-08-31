// nodes/indicators/ATRNode.ts
// Version: 1.2.0 | Updated: 2026-04-24 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';
import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class ATRNode extends BaseIndicatorNode {
  constructor(dataStore: any, period: number = 14, color: string = '#e91e63', lineWidth: number = 2, lineDash: number[] = []) {
    const config: IndicatorConfig = {
      id: 'atr', label: `ATR ${period}`,
      color, lineWidth, lineDash, visible: true, pane: 'separate',
      params: { period },
    };
    super(dataStore, config);
  }

  calculate(): void {
    this.dataStore.calculateATR(this.config.params.period);
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig): void {
    if (!this.config.visible) return;
    this.drawLine(ctx, timeScale, priceScale, 'atr', this.config.color, this.config.lineWidth, this.config.lineDash);
  }
}
