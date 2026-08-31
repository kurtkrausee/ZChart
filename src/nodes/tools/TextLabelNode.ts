// nodes/tools/TextLabelNode.ts
// Version: 1.0.0 | Updated: 2026-04-10 | By: GitHub Copilot

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class TextLabelNode implements DrawableShape {
    public readonly shapeType = 'text_label' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Text';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null; // unused, kept for interface
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    public text: string = 'Text';
    public textColor: string = '#e2e8f0';
    public fontSize: number = 14;
    public bgColor: string = 'rgba(30, 34, 45, 0.85)';

    private readonly ANCHOR_RADIUS = 6;
    private _cachedWidth: number = 0;
    private _cachedHeight: number = 0;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.text) return;

        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        ctx.save();
        ctx.font = `${this.fontSize}px sans-serif`;
        const metrics = ctx.measureText(this.text);
        const padX = 8;
        const padY = 4;
        const w = metrics.width + padX * 2;
        const h = this.fontSize + padY * 2;
        this._cachedWidth = w;
        this._cachedHeight = h;

        // Background
        ctx.fillStyle = this.isSelected ? 'rgba(255, 215, 0, 0.2)' : this.bgColor;
        const cornerR = 4;
        ctx.beginPath();
        ctx.roundRect(x - padX, y - h / 2, w, h, cornerR);
        ctx.fill();

        // Border when selected/hovered
        if (this.isSelected || this.isHovered) {
            ctx.strokeStyle = this.isSelected ? '#FFD700' : '#4ea2ff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Text
        ctx.fillStyle = this.textColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(this.text, x, y);

        ctx.restore();
    }

    public hitTestAnchor(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): 1 | 2 | null {
        if (!this.point1) return null;
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);
        if (Math.sqrt((pixelX - x) ** 2 + (pixelY - y) ** 2) <= this.ANCHOR_RADIUS) return 1;
        return null;
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1) return false;
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);
        const padX = 8;
        return pixelX >= x - padX && pixelX <= x - padX + this._cachedWidth &&
               pixelY >= y - this._cachedHeight / 2 && pixelY <= y + this._cachedHeight / 2;
    }
}
