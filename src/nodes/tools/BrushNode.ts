// nodes/tools/BrushNode.ts
// Version: 1.0.0 | Updated: 2026-04-17 | By: GitHub Copilot
// Brush / Highlighter – freehand drawing stored as array of logical points

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class BrushNode implements DrawableShape {
  public readonly shapeType = 'brush' as const;
  public id: string = crypto.randomUUID();
  public name: string = 'Freihand';
  public isVisible: boolean = true;
  public point1: LogicalPoint | null = null;
  public point2: LogicalPoint | null = null; // unused

  public isHovered: boolean = false;
  public isSelected: boolean = false;
  public isLocked: boolean = false;

  /** Freehand path as logical points */
  public points: LogicalPoint[] = [];

  public lineColor: string = '#FFD700';
  public lineWidth: number = 3;
  public opacity: number = 0.6;

  /** When true, renders as Highlighter (thicker, more translucent, default presets) */
  public isHighlighter: boolean = false;

  private readonly HIT_TOLERANCE = 8;

  public draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    _options: ChartConfig
  ) {
    if (this.points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    const p0 = this.points[0];
    ctx.moveTo(timeScale.indexToX(p0.index), priceScale.priceToY(p0.price));

    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      ctx.lineTo(timeScale.indexToX(p.index), priceScale.priceToY(p.price));
    }
    ctx.stroke();

    // Selection / hover halo (does not change underlying color)
    if (this.isSelected || this.isHovered) {
      ctx.globalAlpha = this.isSelected ? 0.35 : 0.2;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = this.lineWidth + 4;
      ctx.stroke();
    }

    ctx.restore();
  }

  public hitTestAnchor(_px: number, _py: number, _ts: TimeScale, _ps: PriceScale): 1 | 2 | null {
    return null;
  }

  public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
    for (const p of this.points) {
      const px = timeScale.indexToX(p.index);
      const py = priceScale.priceToY(p.price);
      const dx = pixelX - px;
      const dy = pixelY - py;
      if (dx * dx + dy * dy <= this.HIT_TOLERANCE * this.HIT_TOLERANCE) return true;
    }
    return false;
  }
}
