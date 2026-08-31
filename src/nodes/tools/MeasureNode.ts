// nodes/tools/MeasureNode.ts
// Version: 1.0.0 | Updated: 2026-04-10 | By: GitHub Copilot

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class MeasureNode implements DrawableShape {
    public readonly shapeType = 'measure' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Measure';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        const priceDiff = this.point2.price - this.point1.price;
        const pctChange = this.point1.price !== 0 ? (priceDiff / this.point1.price) * 100 : 0;
        const bars = Math.abs(Math.round(this.point2.index - this.point1.index));
        const isUp = priceDiff >= 0;
        const accent = isUp ? '#089981' : '#f23645';
        const fill = isUp ? 'rgba(8,153,129,0.12)' : 'rgba(242,54,69,0.12)';

        const left = Math.min(x1, x2), right = Math.max(x1, x2);
        const top = Math.min(y1, y2), bot = Math.max(y1, y2);

        ctx.save();

        // Filled selection rectangle
        ctx.fillStyle = fill;
        ctx.fillRect(left, top, right - left, bot - top);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(left, top, right - left, bot - top);

        // Horizontal arrow (across): from point1 side to point2 side at y = (y1+y2)/2? TV uses y2 level
        this.drawArrow(ctx, x1, y2, x2, y2, accent);
        // Vertical arrow: at point2 x, from y1 to y2
        this.drawArrow(ctx, x2, y1, x2, y2, accent);

        // Info box centered below
        const lines = [
            `${isUp ? '+' : ''}${priceDiff.toFixed(2)} (${isUp ? '+' : ''}${pctChange.toFixed(2)}%)`,
            `${bars} Bars`,
        ];
        ctx.font = 'bold 12px sans-serif';
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const boxW = maxWidth + 24;
        const boxH = lines.length * 18 + 10;
        const boxX = (left + right) / 2 - boxW / 2;
        const boxY = bot + 6;

        ctx.fillStyle = accent;
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(boxX, boxY, boxW, boxH, 6);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        lines.forEach((line, i) => {
            ctx.fillText(line, boxX + boxW / 2, boxY + 9 + i * 18);
        });

        // Anchors
        this.drawAnchor(ctx, x1, y1, accent);
        this.drawAnchor(ctx, x2, y2, accent);

        ctx.restore();
    }

    private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Arrowhead at (x2,y2)
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const L = 8;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - L * Math.cos(ang - Math.PI / 6), y2 - L * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(x2 - L * Math.cos(ang + Math.PI / 6), y2 - L * Math.sin(ang + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
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

        // Check proximity to the connector line
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.sqrt((pixelX - x1) ** 2 + (pixelY - y1) ** 2) <= this.HIT_TOLERANCE;
        let t = ((pixelX - x1) * dx + (pixelY - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.sqrt((pixelX - projX) ** 2 + (pixelY - projY) ** 2) <= this.HIT_TOLERANCE;
    }
}
