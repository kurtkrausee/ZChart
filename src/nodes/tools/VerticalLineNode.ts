// nodes/tools/VerticalLineNode.ts
// Version: 1.4.0 | Updated: 2026-04-18 | By: GitHub Copilot
// Vertical line at a fixed data index (1-click placement)

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export type { LogicalPoint };

export class VerticalLineNode implements DrawableShape {
    public readonly shapeType = 'vline' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Vertikale Linie';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;  // unused, kept for interface compat
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

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
        _priceScale: PriceScale,
        _options: ChartConfig
    ) {
        if (!this.point1) return;

        const x = timeScale.indexToX(this.point1.index);

        ctx.save();
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        ctx.setLineDash(this.lineDash);

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ctx.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Text label near top
        if (this.text) {
            ctx.font = `${this.fontItalic ? 'italic ' : ''}${this.fontBold ? 'bold ' : ''}${this.fontSize}px Arial`;
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.fillText(this.text, x + 6, 20);
        }

        ctx.restore();
    }

    public hitTestAnchor(_pixelX: number, _pixelY: number, _timeScale: TimeScale, _priceScale: PriceScale): 1 | 2 | null {
        return null;  // No draggable anchors for v-lines
    }

    public hitTest(
        pixelX: number,
        _pixelY: number,
        timeScale: TimeScale,
        _priceScale: PriceScale
    ): boolean {
        if (!this.point1) return false;
        const lineX = timeScale.indexToX(this.point1.index);
        return Math.abs(pixelX - lineX) <= this.HIT_TOLERANCE;
    }
}
