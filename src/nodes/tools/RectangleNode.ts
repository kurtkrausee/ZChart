// nodes/tools/RectangleNode.ts
// Version: 1.0.0 | Updated: 2026-04-10 | By: GitHub Copilot

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class RectangleNode implements DrawableShape {
    public readonly shapeType = 'rectangle' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Rechteck';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    public lineColor: string = '#2962FF';
    public lineWidth: number = 1;
    public lineDash: number[] = [];
    public fillColor: string = 'rgba(41, 98, 255, 0.1)';

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);

        ctx.save();

        // Fill
        ctx.fillStyle = this.fillColor;
        ctx.fillRect(left, top, w, h);

        // Border
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);
        ctx.strokeRect(left, top, w, h);

        // Anchors
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, ctx.strokeStyle);
            this.drawAnchor(ctx, x2, y2, ctx.strokeStyle);
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

        const left = Math.min(x1, x2) - this.HIT_TOLERANCE;
        const right = Math.max(x1, x2) + this.HIT_TOLERANCE;
        const top = Math.min(y1, y2) - this.HIT_TOLERANCE;
        const bottom = Math.max(y1, y2) + this.HIT_TOLERANCE;

        // Check if inside the expanded rectangle, or near any edge
        if (pixelX < left || pixelX > right || pixelY < top || pixelY > bottom) return false;

        // Near edge?
        const innerLeft = Math.min(x1, x2) + this.HIT_TOLERANCE;
        const innerRight = Math.max(x1, x2) - this.HIT_TOLERANCE;
        const innerTop = Math.min(y1, y2) + this.HIT_TOLERANCE;
        const innerBottom = Math.max(y1, y2) - this.HIT_TOLERANCE;

        // If the rectangle is too small, any point inside counts
        if (innerLeft >= innerRight || innerTop >= innerBottom) return true;

        // Must be near an edge (not deep inside)
        return pixelX <= innerLeft || pixelX >= innerRight || pixelY <= innerTop || pixelY >= innerBottom;
    }
}
