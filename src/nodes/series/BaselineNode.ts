// nodes/series/BaselineNode.ts
// Version: 1.0.0 | Updated: 2026-04-17 | By: GitHub Copilot
// Baseline chart – dual-color area fill above/below a configurable baseline price

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import { DataStore } from '../../data/DataStore';
import type { ChartConfig } from '../../core/ChartOptions';

export class BaselineNode extends SceneNode {
  public role = 'series';
  private dataStore: DataStore;

  /** Baseline price – defaults to first visible close */
  public baselinePrice: number | null = null;
  public colorAbove = '#089981';
  public colorBelow = '#f23645';
  public gradientAboveStart = 'rgba(8, 153, 129, 0.28)';
  public gradientAboveEnd = 'rgba(8, 153, 129, 0.0)';
  public gradientBelowStart = 'rgba(242, 54, 69, 0.0)';
  public gradientBelowEnd = 'rgba(242, 54, 69, 0.28)';
  public lineWidth = 2;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig): void {
    const totalCandles = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalCandles);
    const visibleData = this.dataStore.getVisibleData(start, end);
    if (visibleData.length === 0) return;

    const baseline = this.baselinePrice ?? visibleData[0].close;
    const baseY = priceScale.priceToY(baseline);

    // Build x/y arrays
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < visibleData.length; i++) {
      xs.push(timeScale.indexToX(start + i));
      ys.push(priceScale.priceToY(visibleData[i].close));
    }

    ctx.save();

    // --- Draw filled areas using clipping ---
    const firstX = xs[0];
    const lastX = xs[xs.length - 1];
    const topY = priceScale.priceToY(priceScale.visibleMax);
    const bottomY = priceScale.priceToY(priceScale.visibleMin);

    // Helper: build the line path
    const buildLinePath = () => {
      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
    };

    // ABOVE baseline: clip to region above baseline, fill down to baseline
    ctx.save();
    ctx.beginPath();
    ctx.rect(firstX - 10, topY, lastX - firstX + 20, baseY - topY);
    ctx.clip();
    buildLinePath();
    ctx.lineTo(lastX, baseY);
    ctx.lineTo(firstX, baseY);
    ctx.closePath();
    const gradAbove = ctx.createLinearGradient(0, topY, 0, baseY);
    gradAbove.addColorStop(0, this.gradientAboveStart);
    gradAbove.addColorStop(1, this.gradientAboveEnd);
    ctx.fillStyle = gradAbove;
    ctx.fill();
    ctx.restore();

    // BELOW baseline: clip to region below baseline, fill up to baseline
    ctx.save();
    ctx.beginPath();
    ctx.rect(firstX - 10, baseY, lastX - firstX + 20, bottomY - baseY);
    ctx.clip();
    buildLinePath();
    ctx.lineTo(lastX, baseY);
    ctx.lineTo(firstX, baseY);
    ctx.closePath();
    const gradBelow = ctx.createLinearGradient(0, baseY, 0, bottomY);
    gradBelow.addColorStop(0, this.gradientBelowStart);
    gradBelow.addColorStop(1, this.gradientBelowEnd);
    ctx.fillStyle = gradBelow;
    ctx.fill();
    ctx.restore();

    // --- Draw the line with color segments ---
    for (let i = 1; i < xs.length; i++) {
      const prevAbove = ys[i - 1] <= baseY;
      const currAbove = ys[i] <= baseY;

      if (prevAbove !== currAbove) {
        // Line crosses baseline – split into two segments
        const t = (baseY - ys[i - 1]) / (ys[i] - ys[i - 1]);
        const crossX = xs[i - 1] + t * (xs[i] - xs[i - 1]);

        ctx.beginPath();
        ctx.moveTo(xs[i - 1], ys[i - 1]);
        ctx.lineTo(crossX, baseY);
        ctx.strokeStyle = prevAbove ? this.colorAbove : this.colorBelow;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(crossX, baseY);
        ctx.lineTo(xs[i], ys[i]);
        ctx.strokeStyle = currAbove ? this.colorAbove : this.colorBelow;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(xs[i - 1], ys[i - 1]);
        ctx.lineTo(xs[i], ys[i]);
        ctx.strokeStyle = currAbove ? this.colorAbove : this.colorBelow;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
      }
    }

    // --- Draw baseline dashed line ---
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(firstX, baseY);
    ctx.lineTo(lastX, baseY);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}
