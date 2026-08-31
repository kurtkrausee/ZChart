// nodes/core/DayHighLowNode.ts
// Version: 1.0.0 | Updated: 2026-05-06 | By: Agent
// P7.3: Draws dotted day-high / day-low horizontal lines for the current session.
// Only renders when options.priceLabels.highLowLines === true.

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from './SceneNode';
import { DataStore } from '../../data/DataStore';
import type { ChartConfig } from '../../core/ChartOptions';
import { autoFormatPrice } from '../../utils/Formatters';

export class DayHighLowNode extends SceneNode {
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    _timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig,
  ): void {
    if (!options.priceLabels.highLowLines) return;

    const allData = this.dataStore.getAllData();
    if (allData.length === 0) return;

    // Use all visible data for session high/low
    const dpr = window.devicePixelRatio || 1;
    const canvasW = ctx.canvas.width / dpr;
    const axisWidth = options.layout.axisWidth;
    const chartWidth = canvasW - axisWidth;

    // Compute day high/low from last trading session (last 390 bars max or all data)
    const sessionLen = Math.min(allData.length, 390);
    const sessionData = allData.slice(-sessionLen);
    const dayHigh = Math.max(...sessionData.map(b => b.high));
    const dayLow = Math.min(...sessionData.map(b => b.low));

    const yHigh = priceScale.priceToY(dayHigh);
    const yLow = priceScale.priceToY(dayLow);

    ctx.save();

    const highColor = 'rgba(8, 153, 129, 0.7)';   // TV-green tinted
    const lowColor = 'rgba(242, 54, 69, 0.7)';     // TV-red tinted

    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.font = `${options.layout.fontSize - 1}px ${options.layout.fontFamily}`;
    ctx.textBaseline = 'bottom';

    // Day High line
    ctx.strokeStyle = highColor;
    ctx.beginPath();
    ctx.moveTo(0, yHigh);
    ctx.lineTo(chartWidth, yHigh);
    ctx.stroke();

    // Day High label (small, in chart area)
    ctx.fillStyle = highColor;
    ctx.textAlign = 'right';
    ctx.fillText('H ' + autoFormatPrice(dayHigh), chartWidth - 4, yHigh - 2);

    // Day Low line
    ctx.strokeStyle = lowColor;
    ctx.beginPath();
    ctx.moveTo(0, yLow);
    ctx.lineTo(chartWidth, yLow);
    ctx.stroke();

    // Day Low label
    ctx.fillStyle = lowColor;
    ctx.textBaseline = 'top';
    ctx.fillText('L ' + autoFormatPrice(dayLow), chartWidth - 4, yLow + 2);

    ctx.restore();
  }
}
