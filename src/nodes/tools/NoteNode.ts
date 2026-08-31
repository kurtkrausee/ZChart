// nodes/tools/NoteNode.ts
// Version: 1.0.0 | Updated: 2026-04-18 | By: GitHub Copilot
// Notiz: 2-click callout. P1 = anchor (small circle), P2 = text box position.
// Connecting line from P1 to P2, rounded text box at P2 with text inside.

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class NoteNode implements DrawableShape {
    public readonly shapeType = 'note' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Notiz';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null; // anchor
    public point2: LogicalPoint | null = null; // text box
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    public text: string = 'Notiz';
    public textColor: string = '#e2e8f0';
    public fontSize: number = 14;
    public lineColor: string = '#FFD700';
    public lineWidth: number = 1.5;
    public fillColor: string = 'rgba(30, 34, 45, 0.85)';

    private readonly ANCHOR_R = 5;
    private readonly PAD_X = 10;
    private readonly PAD_Y = 5;
    private readonly CORNER_R = 6;
    private _boxX = 0;
    private _boxY = 0;
    private _boxW = 0;
    private _boxH = 0;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        ctx.save();
        ctx.font = `${this.fontSize}px sans-serif`;
        const m = ctx.measureText(this.text || '');
        const w = Math.max(m.width, 20) + this.PAD_X * 2;
        const h = this.fontSize + this.PAD_Y * 2;
        // Center the box on point2
        const bx = x2 - w / 2;
        const by = y2 - h / 2;
        this._boxX = bx; this._boxY = by; this._boxW = w; this._boxH = h;

        // Connector line (anchor → nearest box edge)
        const cx = x2;
        const cy = y2;
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#FFF176' : this.lineColor);
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        // Anchor dot
        ctx.fillStyle = this.lineColor;
        ctx.beginPath();
        ctx.arc(x1, y1, this.ANCHOR_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text box background
        ctx.fillStyle = this.fillColor;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, this.CORNER_R);
        ctx.fill();
        if (this.isSelected || this.isHovered) {
            ctx.strokeStyle = this.isSelected ? '#FFD700' : '#4ea2ff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Text
        ctx.fillStyle = this.textColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(this.text || '', x2, y2);

        ctx.restore();
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1 || !this.point2) return false;
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        // Anchor
        if (Math.hypot(pixelX - x1, pixelY - y1) <= this.ANCHOR_R + 4) return true;
        // Box
        if (pixelX >= this._boxX && pixelX <= this._boxX + this._boxW
            && pixelY >= this._boxY && pixelY <= this._boxY + this._boxH) return true;
        // Line
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0) {
            const t = Math.max(0, Math.min(1, ((pixelX - x1) * dx + (pixelY - y1) * dy) / lenSq));
            const px = x1 + t * dx, py = y1 + t * dy;
            if (Math.hypot(pixelX - px, pixelY - py) <= 6) return true;
        }
        return false;
    }

    public hitTestAnchor(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): 1 | 2 | null {
        if (this.point1) {
            const x = timeScale.indexToX(this.point1.index);
            const y = priceScale.priceToY(this.point1.price);
            if (Math.hypot(pixelX - x, pixelY - y) <= this.ANCHOR_R + 4) return 1;
        }
        if (this.point2) {
            const x = timeScale.indexToX(this.point2.index);
            const y = priceScale.priceToY(this.point2.price);
            if (Math.hypot(pixelX - x, pixelY - y) <= 8) return 2;
        }
        return null;
    }
}
