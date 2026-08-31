// nodes/tools/TriangleNode.ts
// Version: 1.0.0 | Updated: 2026-04-16 | By: GitHub Copilot
// 4.12 Triangle drawing tool (3-click: 3 vertices)

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class TriangleNode implements DrawableShape {
    public readonly shapeType = 'triangle' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Dreieck';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public point3: LogicalPoint | null = null;
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
        const x3 = this.point3 ? timeScale.indexToX(this.point3.index) : (x1 + x2) / 2;
        const y3 = this.point3 ? priceScale.priceToY(this.point3.price) : y1 - 50;

        ctx.save();

        // Fill
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fillStyle = this.fillColor;
        ctx.fill();

        // Border
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);
        ctx.stroke();

        // Anchors
        if (this.isSelected || this.isHovered) {
            const color = ctx.strokeStyle;
            this.drawAnchor(ctx, x1, y1, color);
            this.drawAnchor(ctx, x2, y2, color);
            if (this.point3) this.drawAnchor(ctx, x3, y3, color);
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
        // point3 not standard 2-anchor... skip for now (hitTestAnchor returns 1 | 2 | null)
        return null;
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1 || !this.point2) return false;
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);
        const x3 = this.point3 ? timeScale.indexToX(this.point3.index) : (x1 + x2) / 2;
        const y3 = this.point3 ? priceScale.priceToY(this.point3.price) : y1 - 50;

        // Point-in-triangle test using barycentric coordinates
        return this.pointInTriangle(pixelX, pixelY, x1, y1, x2, y2, x3, y3) ||
               this.nearEdge(pixelX, pixelY, x1, y1, x2, y2) ||
               this.nearEdge(pixelX, pixelY, x2, y2, x3, y3) ||
               this.nearEdge(pixelX, pixelY, x3, y3, x1, y1);
    }

    private pointInTriangle(px: number, py: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): boolean {
        const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
        const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
        const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    private nearEdge(px: number, py: number, x1: number, y1: number, x2: number, y2: number): boolean {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= this.HIT_TOLERANCE;
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2) <= this.HIT_TOLERANCE;
    }
}
