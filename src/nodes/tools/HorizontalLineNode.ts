// nodes/tools/HorizontalLineNode.ts
// Version: 1.5.0 | Updated: 2026-04-19 | By: GitHub Copilot
// Horizontal line at a fixed price level (1-click placement); pane-bindable (B2).

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export type { LogicalPoint };

export class HorizontalLineNode implements DrawableShape {
    public readonly shapeType = 'hline' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Horizontale Linie';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;  // unused, kept for interface compat
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    /** Pane binding (B2). Defaults to 'main'; set by InputManager on creation. */
    public paneId: string = 'main';

    // Configurable style (4.17-19)
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

        const y = priceScale.priceToY(this.point1.price);
        const chartWidth = timeScale.width;

        ctx.save();
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        ctx.setLineDash(this.lineDash);

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price label on right edge
        const label = this.point1.price.toFixed(2);
        ctx.font = '10px Arial';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(label, chartWidth - ctx.measureText(label).width - 4, y - 3);

        // Text label near center
        if (this.text) {
            ctx.font = `${this.fontItalic ? 'italic ' : ''}${this.fontBold ? 'bold ' : ''}${this.fontSize}px Arial`;
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.fillText(this.text, chartWidth / 2, y - 8);
        }

        ctx.restore();
    }

    public hitTestAnchor(_pixelX: number, _pixelY: number, _timeScale: TimeScale, _priceScale: PriceScale): 1 | 2 | null {
        return null;  // No draggable anchors for h-lines
    }

    public hitTest(
        _pixelX: number,
        pixelY: number,
        _timeScale: TimeScale,
        priceScale: PriceScale
    ): boolean {
        if (!this.point1) return false;
        const lineY = priceScale.priceToY(this.point1.price);
        return Math.abs(pixelY - lineY) <= this.HIT_TOLERANCE;
    }
}
