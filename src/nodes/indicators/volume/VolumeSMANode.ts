// nodes/indicators/volume/VolumeSMANode.ts
// Version: 1.2.0 | Updated: 2026-04-24 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';

export class VolumeSMANode extends BaseIndicatorNode {
  constructor(dataStore: any, period: number = 20, color: string = '#f59e0b', lineWidth: number = 1.5, lineDash: number[] = []) {
    const config: IndicatorConfig = {
      id: 'volume_sma',
      label: `Volume SMA ${period}`,
      color,
      lineWidth,
      lineDash,
      visible: true,
      pane: 'separate',
      params: { period },
    };
    super(dataStore, config);
  }

  calculate(): void {
    this.dataStore.calculateVolumeSMA(this.config.params.period);
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: any, priceScale: any, _options: any): void {
    if (!this.config.visible) return;
    this.drawLine(ctx, timeScale, priceScale, 'volume_sma', this.config.color, this.config.lineWidth, this.config.lineDash);
  }
}
