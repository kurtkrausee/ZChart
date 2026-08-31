// nodes/indicators/MACDNode.ts
// Version: 1.2.0 | Updated: 2026-04-27 | By: GitHub Copilot

import { BaseIndicatorNode, type IndicatorConfig } from '../BaseIndicatorNode';
import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class MACDNode extends BaseIndicatorNode {
  constructor(dataStore: any, fast: number = 12, slow: number = 26, signal: number = 9) {
    const config: IndicatorConfig = {
      id: 'macd', label: `MACD(${fast},${slow},${signal})`, color: '#2962ff',
      lineWidth: 1.5, visible: true, pane: 'separate', params: { fast, slow, signal },
    };
    super(dataStore, config);
  }

  /** MACD writes three series – scale the pane across all of them incl. 0. */
  public getAutoScaleKeys(): string[] {
    return ['macd_line', 'macd_signal', 'macd_hist'];
  }

  calculate(): void {
    const fast = Number(this.config.params.fast);
    const slow = Number(this.config.params.slow);
    const signal = Number(this.config.params.signal);
    const data = this.dataStore.getAllData();

    // EMA calculations
    const emaFast = `_macd_ema${fast}`;
    const emaSlow = `_macd_ema${slow}`;
    this.dataStore.calculateEMA(fast, emaFast);
    this.dataStore.calculateEMA(slow, emaSlow);

    // MACD line = fast EMA - slow EMA
    for (let i = 0; i < data.length; i++) {
      const f = (data[i] as any)[emaFast];
      const s = (data[i] as any)[emaSlow];
      if (f !== undefined && s !== undefined) {
        (data[i] as any).macd_line = f - s;
      }
    }

    // Signal line = EMA of MACD line, seeded with SMA over the first `signal`
    // valid MACD values (TV/standard behavior). Using a single-value seed would
    // bias the signal line for the first ~`signal` bars after the slow EMA warm-up.
    const k = 2 / (signal + 1);
    let prev: number | undefined;
    let seedSum = 0;
    let seedCount = 0;
    for (let i = 0; i < data.length; i++) {
      const ml = (data[i] as any).macd_line;
      if (ml === undefined) continue;
      if (prev === undefined) {
        seedSum += ml;
        seedCount += 1;
        if (seedCount < signal) continue;
        prev = seedSum / signal;
      } else {
        prev = ml * k + prev * (1 - k);
      }
      (data[i] as any).macd_signal = prev;
      (data[i] as any).macd_hist = ml - prev;
    }
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    if (!this.config.visible) return;
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visible = this.dataStore.getVisibleData(start, end);

    // Histogram bars
    const spacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const barW = Math.max(1, spacing * 0.6);
    const zeroY = priceScale.priceToY(0);

    ctx.save();
    for (let i = 0; i < visible.length; i++) {
      const h = (visible[i] as any).macd_hist;
      if (h === undefined) continue;
      const x = timeScale.indexToX(start + i);
      const y = priceScale.priceToY(h);
      ctx.fillStyle = h >= 0 ? options.colors.candleUp + '80' : options.colors.candleDown + '80';
      ctx.fillRect(x - barW / 2, Math.min(y, zeroY), barW, Math.abs(y - zeroY));
    }
    ctx.restore();

    // MACD line + Signal line
    this.drawLine(ctx, timeScale, priceScale, 'macd_line', '#2962ff', 1.5);
    this.drawLine(ctx, timeScale, priceScale, 'macd_signal', '#ff6d00', 1.5);
  }
}
