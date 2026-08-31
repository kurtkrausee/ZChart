// nodes/tools/EllipseNode.ts
// Version: 1.0.0 | Updated: 2026-04-16 | By: GitHub Copilot
// 4.11 Circle/Ellipse drawing tool (2-click: center + edge)

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class EllipseNode implements DrawableShape {
    public readonly shapeType = 'ellipse' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Ellipse';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null; // center
    public point2: LogicalPoint | null = null; // edge point
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    public lineColor: string = '#2962FF';
    public lineWidth: number = 1;
    public lineDash: number[] = [];
    public fillColor: string = 'rgba(41, 98, 255, 0.1)';

    /** When true, render as perfect circle (radius = distance from center to edge point). */
    public isCircle: boolean = false;

    private readonly HIT_TOLERANCE = 6;
    private readonly ANCHOR_RADIUS = 6;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;

        const cx = timeScale.indexToX(this.point1.index);
        const cy = priceScale.priceToY(this.point1.price);
        const ex = timeScale.indexToX(this.point2.index);
        const ey = priceScale.priceToY(this.point2.price);

        let rx: number, ry: number;
        if (this.isCircle) {
            const r = Math.hypot(ex - cx, ey - cy);
            rx = r; ry = r;
        } else {
            rx = Math.abs(ex - cx);
            ry = Math.abs(ey - cy);
        }

        ctx.save();

        // Fill
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
        ctx.fillStyle = this.fillColor;
        ctx.fill();

        // Border
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);
        ctx.stroke();

        // Anchors
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, cx, cy, ctx.strokeStyle);
            this.drawAnchor(ctx, ex, ey, ctx.strokeStyle);
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
        const cx = timeScale.indexToX(this.point1.index);
        const cy = priceScale.priceToY(this.point1.price);
        const ex = timeScale.indexToX(this.point2.index);
        const ey = priceScale.priceToY(this.point2.price);
        if (Math.sqrt((pixelX - cx) ** 2 + (pixelY - cy) ** 2) <= this.ANCHOR_RADIUS) return 1;
        if (Math.sqrt((pixelX - ex) ** 2 + (pixelY - ey) ** 2) <= this.ANCHOR_RADIUS) return 2;
        return null;
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1 || !this.point2) return false;
        const cx = timeScale.indexToX(this.point1.index);
        const cy = priceScale.priceToY(this.point1.price);
        const ex = timeScale.indexToX(this.point2.index);
        const ey = priceScale.priceToY(this.point2.price);

        let rx: number, ry: number;
        if (this.isCircle) {
            const r = Math.max(1, Math.hypot(ex - cx, ey - cy));
            rx = r; ry = r;
        } else {
            rx = Math.max(1, Math.abs(ex - cx));
            ry = Math.max(1, Math.abs(ey - cy));
        }

        // Normalized distance from center
        const dx = (pixelX - cx) / rx;
        const dy = (pixelY - cy) / ry;
        const d = dx * dx + dy * dy;

        // Hit if near the ellipse border (between inner and outer tolerance)
        const tol = this.HIT_TOLERANCE / Math.min(rx, ry);
        return d <= (1 + tol) * (1 + tol) && d >= (1 - tol) * (1 - tol)
            || d <= 1; // also hit inside the filled area
    }
}
