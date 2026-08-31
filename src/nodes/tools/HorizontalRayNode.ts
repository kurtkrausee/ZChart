// nodes/tools/HorizontalRayNode.ts
// Version: 1.1.0 | Updated: 2026-04-18 | By: GitHub Copilot
// Horizontal Ray: 1-click, extends from point to the right (or left) edge

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class HorizontalRayNode implements DrawableShape {
    public readonly shapeType = 'hray' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Horizontaler Strahl';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null; // unused
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

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

    /** Direction: 'right' extends to the right edge, 'left' to the left edge */
    public direction: 'right' | 'left' = 'right';

    private readonly HIT_TOLERANCE = 5;

    public draw(
        ctx: CanvasRenderingContext2D,
        timeScale: TimeScale,
        priceScale: PriceScale,
        _options: ChartConfig
    ) {
        if (!this.point1) return;

        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);
        const chartWidth = timeScale.width;

        ctx.save();
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);

        ctx.beginPath();
        ctx.moveTo(x, y);
        if (this.direction === 'right') {
            ctx.lineTo(chartWidth, y);
        } else {
            ctx.lineTo(0, y);
        }
        ctx.stroke();

        // Anchor at origin
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x, y, ctx.strokeStyle);
        }

        // Price label on right edge
        ctx.setLineDash([]);
        const label = this.point1.price.toFixed(2);
        ctx.font = '10px Arial';
        ctx.fillStyle = ctx.strokeStyle;
        if (this.direction === 'right') {
            ctx.fillText(label, chartWidth - ctx.measureText(label).width - 4, y - 3);
        } else {
            ctx.fillText(label, 4, y - 3);
        }

        // Text label near origin
        if (this.text) {
            ctx.font = `${this.fontItalic ? 'italic ' : ''}${this.fontBold ? 'bold ' : ''}${this.fontSize}px Arial`;
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.fillText(this.text, x + (this.direction === 'right' ? 10 : -10), y - 8);
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
        if (!this.point1) return null;
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);
        if (Math.sqrt((pixelX - x) ** 2 + (pixelY - y) ** 2) <= 6) return 1;
        return null;
    }

    public hitTest(
        pixelX: number,
        pixelY: number,
        timeScale: TimeScale,
        priceScale: PriceScale
    ): boolean {
        if (!this.point1) return false;
        const x = timeScale.indexToX(this.point1.index);
        const lineY = priceScale.priceToY(this.point1.price);
        if (Math.abs(pixelY - lineY) > this.HIT_TOLERANCE) return false;
        // Only hit if on the correct side
        if (this.direction === 'right') return pixelX >= x - this.HIT_TOLERANCE;
        return pixelX <= x + this.HIT_TOLERANCE;
    }
}
