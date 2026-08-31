// nodes/core/RangeHighlightNode.ts
// Version: 1.0.0 | Updated: 2026-07-16 | By: Agent
// ZS-P2-FB4: Schattiertes vertikales Band zwischen zwei Timestamps über die
// volle Pane-Höhe — markiert im W1/M1-Neben-Pane den D1-Bild-Ausschnitt des
// Image-Sync. Reines Overlay (KEIN Drawing → wird nie nach /api/chart-state
// gespeichert). Gesetzt via ZChartAPI.setRangeHighlight().

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from './SceneNode';
import { DataStore } from '../../data/DataStore';
import type { ChartConfig } from '../../core/ChartOptions';

export interface HighlightRange {
  firstTs: number;
  lastTs: number;
}

export class RangeHighlightNode extends SceneNode {
  private dataStore: DataStore;
  private range: HighlightRange | null = null;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  public setRange(range: HighlightRange | null): void {
    this.range = range;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    _priceScale: PriceScale,
    options: ChartConfig,
  ): void {
    if (!this.range) return;
    const data = this.dataStore.getAllData();
    if (data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasW = ctx.canvas.width / dpr;
    const canvasH = ctx.canvas.height / dpr;
    const chartWidth = canvasW - options.layout.axisWidth;

    let x1 = timeScale.indexToX(timeScale.timeToIndex(this.range.firstTs, data));
    let x2 = timeScale.indexToX(timeScale.timeToIndex(this.range.lastTs, data));
    if (x2 < x1) [x1, x2] = [x2, x1];
    if (x2 < 0 || x1 > chartWidth) return;

    const left = Math.max(x1, 0);
    const right = Math.min(x2, chartWidth);

    ctx.save();
    // Dezente blaue Tönung + gestrichelte Randlinien (nur wo nicht geclippt)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.10)';
    ctx.fillRect(left, 0, Math.max(right - left, 1), canvasH);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    if (x1 >= 0 && x1 <= chartWidth) {
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, canvasH);
      ctx.stroke();
    }
    if (x2 >= 0 && x2 <= chartWidth) {
      ctx.beginPath();
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, canvasH);
      ctx.stroke();
    }
    ctx.restore();
  }
}
