// nodes/tools/CrossLineNode.ts
// Version: 1.1.0 | Updated: 2026-04-18 | By: GitHub Copilot
// Cross Line: Horizontal + Vertical line crossing at a single click point

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class CrossLineNode implements DrawableShape {
    public readonly shapeType = 'cross_line' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Cross Line';
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
        const chartHeight = priceScale.height;

        ctx.save();
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();

        // Price label on right
        ctx.setLineDash([]);
        const priceLabel = this.point1.price.toFixed(2);
        ctx.font = '10px Arial';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(priceLabel, chartWidth - ctx.measureText(priceLabel).width - 4, y - 3);

        // Text label near center
        if (this.text) {
            ctx.font = `${this.fontItalic ? 'italic ' : ''}${this.fontBold ? 'bold ' : ''}${this.fontSize}px Arial`;
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.fillText(this.text, x + 8, y - 8);
        }

        ctx.restore();
    }

    public hitTestAnchor(_pixelX: number, _pixelY: number, _timeScale: TimeScale, _priceScale: PriceScale): 1 | 2 | null {
        return null;
    }

    public hitTest(
        pixelX: number,
        pixelY: number,
        timeScale: TimeScale,
        priceScale: PriceScale
    ): boolean {
        if (!this.point1) return false;
        const lineX = timeScale.indexToX(this.point1.index);
        const lineY = priceScale.priceToY(this.point1.price);
        return Math.abs(pixelX - lineX) <= this.HIT_TOLERANCE || Math.abs(pixelY - lineY) <= this.HIT_TOLERANCE;
    }
}
