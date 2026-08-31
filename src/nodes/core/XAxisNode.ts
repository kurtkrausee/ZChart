// nodes/XAxisNode.ts
// Version: 1.8.0 | Updated: 2026-08-01 | By: Agent
// ZV10-P3: Zukunfts-Labels — Label-Loop läuft über totalCount hinaus bis zum
//   rechten Viewport-Rand; Timestamps via TimeScale.indexToTime-Extrapolation
//   (Intervall der letzten 2 Kerzen), Zukunfts-Labels gedimmt (alpha 0.55).
// P4.9: reads fontSize/fontFamily from options.layout, axisLine from options.colors
// P7.4: passes timeScale format options (dateFormat, timeFormat, dayOfWeekOnLabels) to chartAxisLabel

import type { ChartConfig } from '../../core/ChartOptions';
import { TimeScale } from '../../math/TimeScale';
import type { DataStore } from '../../data/DataStore';
import { dateParts, chartAxisLabel, type AxisFormatOptions } from '../../utils/timeFormat';

export class XAxisNode {

  constructor(private dataStore: DataStore) {}

  public draw(
    ctx: CanvasRenderingContext2D,
    chartContentWidth: number,
    fullHeight: number,
    timeScale: TimeScale,
    options: ChartConfig
  ) {
    ctx.save();
    
    const axisHeight = options.layout.axisHeight;
    const axisY = fullHeight - axisHeight;

    // 1. Background
    ctx.fillStyle = options.colors.background;
    ctx.fillRect(0, axisY, chartContentWidth, axisHeight);
    
    // 2. Separator line
    ctx.strokeStyle = options.colors.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(chartContentWidth, axisY);
    ctx.stroke();

    // 3. Labels
    const allData = this.dataStore.getAllData();
    const totalCount = allData.length;
    if (totalCount === 0) { ctx.restore(); return; }

    const { start, end } = timeScale.getVisibleRange(totalCount);

    // Pixel-based step: target label every ~70px
    const pxPerCandle = timeScale.candleWidth;
    const minGapPx = 65;
    const step = Math.max(1, Math.round(minGapPx / pxPerCandle));
    const tz = options.timezone || 'UTC';

    // P7.4: format options from options.timeScale
    const fmt: AxisFormatOptions = {
      timeFormat: options.timeScale?.timeFormat ?? '24h',
      dateFormat: options.timeScale?.dateFormat ?? 'dd.MM.yyyy',
      dayOfWeekOnLabels: options.timeScale?.dayOfWeekOnLabels ?? false,
    };

    // Initialize prev from candle before visible range
    let prev: { year: number; month: number; day: number } | null = null;
    const initIdx = Math.max(0, start - 1);
    if (initIdx < totalCount) {
      const p = dateParts(allData[initIdx].timestamp, tz);
      prev = { year: p.year, month: p.month, day: p.day };
    }

    const labelY = axisY + (axisHeight / 2);
    const normalFont = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
    const boldFont = `bold ${options.layout.fontSize}px ${options.layout.fontFamily}`;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let lastLabelX = -Infinity;

    // ZV10-P3: Loop bis zum rechten Viewport-Rand statt totalCount — der
    // Zukunftsbereich (Right-Offset/Überscrollen) bekommt extrapolierte,
    // gedimmte Labels. Extrapolation braucht >= 2 Kerzen (Intervall).
    const viewportEnd = Math.ceil(timeScale.xToIndex(chartContentWidth));
    const lastLabelIdx = totalCount >= 2 ? Math.max(end, viewportEnd) : end;

    for (let i = start; i <= lastLabelIdx; i++) {
      if (i < 0) continue;
      const isFuture = i >= totalCount;
      if (isFuture && totalCount < 2) break;
      if ((i - start) % step !== 0 && i !== start) continue;

      const x = timeScale.indexToX(i);
      if (x < 15 || x > chartContentWidth - 15) continue;

      const ts = isFuture ? timeScale.indexToTime(i, allData) : allData[i].timestamp;
      if (ts === null || ts === undefined) continue;
      const { label, bold } = chartAxisLabel(ts, tz, prev, options.intervalMs, fmt);

      // Update prev
      const cp = dateParts(ts, tz);
      prev = { year: cp.year, month: cp.month, day: cp.day };

      // Enforce minimum gap (bold labels get tighter spacing)
      const gap = x - lastLabelX;
      const requiredGap = bold ? 35 : minGapPx;
      if (gap < requiredGap) continue;

      ctx.fillStyle = options.colors.text;
      ctx.font = bold ? boldFont : normalFont;
      if (isFuture) ctx.globalAlpha = 0.55; // Zukunfts-Label optisch abgesetzt
      ctx.fillText(label, x, labelY);
      if (isFuture) ctx.globalAlpha = 1;
      lastLabelX = x;
    }

    ctx.restore();
  }
}