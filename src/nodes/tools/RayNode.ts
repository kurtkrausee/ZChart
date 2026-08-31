// nodes/tools/RayNode.ts
// Version: 1.4.0 | Updated: 2026-04-14 | By: GitHub Copilot
// Ray (Strahl): Finite segment from point1 to point2 (extendable via settings).

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import { distanceToLineSegment } from '../../utils/geometry';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class RayNode implements DrawableShape {
  public readonly shapeType = 'ray' as const;
  public id: string = crypto.randomUUID();
  public name: string = 'Strahl';
  public isVisible: boolean = true;
  public point1: LogicalPoint | null = null;
  public point2: LogicalPoint | null = null;
  public isHovered: boolean = false;
  public isSelected: boolean = false;
  public isLocked: boolean = false;

  // Configurable style
  public lineColor: string = '#2962FF';
  public lineWidth: number = 2;
  public lineDash: number[] = [];

  // Text label properties
  public text: string = '';
  public textColor: string = '#ffffff';
  public fontSize: number = 14;
  public fontBold: boolean = false;
  public fontItalic: boolean = false;
  public textAlign: 'left' | 'center' | 'right' = 'center';

  // Line tool extensions (Ray: finite segment by default, extendable)
  public extendLeft: boolean = false;
  public extendRight: boolean = false;
  public leftEndpoint: 'normal' | 'arrow' = 'normal';
  public rightEndpoint: 'normal' | 'arrow' = 'normal';
  public showMiddlePoint: boolean = false;
  public showPriceLabels: boolean = false;
  public statsMode: 'hidden' | 'compact' = 'hidden';
  public statsPosition: 'left' | 'center' | 'right' | 'auto' = 'right';
  public statsShowPriceRange: boolean = true;
  public statsShowPercentChange: boolean = true;
  public statsShowPipsChange: boolean = false;
  public statsShowBarsRange: boolean = true;
  public statsShowDateTimeRange: boolean = false;
  public statsShowDistance: boolean = false;
  public statsShowAngle: boolean = false;

  private readonly HIT_TOLERANCE = 5;
  private readonly ANCHOR_RADIUS = 6;

  /** Extend line from p1 through p2 to the edge of the canvas. Returns the far-edge point. */
  private getExtendedEnd(x1: number, y1: number, x2: number, y2: number, width: number, height: number): { x: number; y: number } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return { x: x2, y: y2 };

    // Parametric: P = (x1, y1) + t * (dx, dy), find max t that stays inside [0, width] x [0, height]
    let tMax = Infinity;
    if (dx > 0) tMax = Math.min(tMax, (width - x1) / dx);
    else if (dx < 0) tMax = Math.min(tMax, -x1 / dx);
    if (dy > 0) tMax = Math.min(tMax, (height - y1) / dy);
    else if (dy < 0) tMax = Math.min(tMax, -y1 / dy);
    if (!isFinite(tMax)) tMax = 1;

    return { x: x1 + dx * tMax, y: y1 + dy * tMax };
  }

  /** Draw an arrowhead at (x,y) pointing in direction angle */
  private drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    const size = 10 + this.lineWidth;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 3);
    ctx.lineTo(-size, size / 3);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
    ctx.restore();
  }

  public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
    if (!this.point1 || !this.point2) return;
    if (!this.isVisible) return;

    const x1 = timeScale.indexToX(this.point1.index);
    const y1 = priceScale.priceToY(this.point1.price);
    const x2 = timeScale.indexToX(this.point2.index);
    const y2 = priceScale.priceToY(this.point2.price);

    const width = ctx.canvas.width / (window.devicePixelRatio || 1);
    const height = ctx.canvas.height / (window.devicePixelRatio || 1);
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Ray: conditionally extends based on extendLeft/extendRight
    const drawX1 = this.extendLeft ? this.getExtendedEnd(x1, y1, x1 - dx, y1 - dy, width, height).x : x1;
    const drawY1 = this.extendLeft ? this.getExtendedEnd(x1, y1, x1 - dx, y1 - dy, width, height).y : y1;
    const drawX2 = this.extendRight ? this.getExtendedEnd(x1, y1, x2, y2, width, height).x : x2;
    const drawY2 = this.extendRight ? this.getExtendedEnd(x1, y1, x2, y2, width, height).y : y2;

    ctx.save();
    const color = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
    ctx.strokeStyle = color;
    ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
    ctx.lineCap = this.lineDash.length > 0 ? 'butt' : 'round'; // round frisst kurze Dash-Luecken (Gepunktet [2,2])
    if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);

    ctx.beginPath();
    ctx.moveTo(drawX1, drawY1);
    ctx.lineTo(drawX2, drawY2);
    ctx.stroke();

    // Arrow endpoints
    if (this.leftEndpoint === 'arrow') {
      this.drawArrowhead(ctx, x1, y1, Math.atan2(y1 - y2, x1 - x2));
    }
    if (this.rightEndpoint === 'arrow') {
      this.drawArrowhead(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1));
    }

    // Middle point
    if (this.showMiddlePoint) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      ctx.beginPath(); ctx.arc(mx, my, 3, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
    }

    if (this.isSelected || this.isHovered) {
      this.drawAnchor(ctx, x1, y1, color);
      this.drawAnchor(ctx, x2, y2, color);
    }

    if (this.text) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 8;
      ctx.font = `${this.fontItalic ? 'italic ' : ''}${this.fontBold ? 'bold ' : ''}${this.fontSize}px Arial`;
      ctx.fillStyle = this.textColor;
      ctx.textAlign = this.textAlign;
      ctx.fillText(this.text, mx, my);
    }

    ctx.restore();
  }

  private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | CanvasGradient | CanvasPattern) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  public hitTestAnchor(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): 1 | 2 | null {
    if (!this.point1 || !this.point2) return null;
    const x1 = timeScale.indexToX(this.point1.index);
    const y1 = priceScale.priceToY(this.point1.price);
    const x2 = timeScale.indexToX(this.point2.index);
    const y2 = priceScale.priceToY(this.point2.price);
    if (Math.sqrt((pixelX - x1) ** 2 + (pixelY - y1) ** 2) <= this.ANCHOR_RADIUS) return 1;
    if (Math.sqrt((pixelX - x2) ** 2 + (pixelY - y2) ** 2) <= this.ANCHOR_RADIUS) return 2;
    return null;
  }

  public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
    if (!this.point1 || !this.point2) return false;
    const x1 = timeScale.indexToX(this.point1.index);
    const y1 = priceScale.priceToY(this.point1.price);
    const x2 = timeScale.indexToX(this.point2.index);
    const y2 = priceScale.priceToY(this.point2.price);

    // For finite segment, just test p1-p2; for extended, test the extended line
    if (this.extendRight || this.extendLeft) {
      const extEndX = this.extendRight ? x1 + (x2 - x1) * 100 : x2;
      const extEndY = this.extendRight ? y1 + (y2 - y1) * 100 : y2;
      const extStartX = this.extendLeft ? x1 - (x2 - x1) * 100 : x1;
      const extStartY = this.extendLeft ? y1 - (y2 - y1) * 100 : y1;
      return distanceToLineSegment(pixelX, pixelY, extStartX, extStartY, extEndX, extEndY) <= this.HIT_TOLERANCE;
    }
    return distanceToLineSegment(pixelX, pixelY, x1, y1, x2, y2) <= this.HIT_TOLERANCE;
  }
}
