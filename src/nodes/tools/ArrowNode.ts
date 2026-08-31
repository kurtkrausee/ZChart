// nodes/tools/ArrowNode.ts
// Version: 1.0.0 | Updated: 2026-04-10 | By: GitHub Copilot
// Arrow tool: 2-click with arrowhead at point2

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import { distanceToLineSegment } from '../../utils/geometry';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export class ArrowNode implements DrawableShape {
    public readonly shapeType = 'arrow' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Pfeil';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    public lineColor: string = '#2962FF';
    public lineWidth: number = 2;
    public lineDash: number[] = [];

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;
    private readonly ARROW_SIZE = 12;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        ctx.save();
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        ctx.lineCap = this.lineDash.length > 0 ? 'butt' : 'round'; // round frisst kurze Dash-Luecken (Gepunktet [2,2])
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);

        // Shaft
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const sz = this.ARROW_SIZE;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - sz * Math.cos(angle - Math.PI / 6), y2 - sz * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - sz * Math.cos(angle + Math.PI / 6), y2 - sz * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, ctx.strokeStyle);
            this.drawAnchor(ctx, x2, y2, ctx.strokeStyle);
        }
        ctx.restore();
    }

    private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | CanvasGradient | CanvasPattern) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = color; ctx.stroke();
    }

    public hitTestAnchor(px: number, py: number, ts: TimeScale, ps: PriceScale): 1 | 2 | null {
        if (!this.point1 || !this.point2) return null;
        const x1 = ts.indexToX(this.point1.index), y1 = ps.priceToY(this.point1.price);
        const x2 = ts.indexToX(this.point2.index), y2 = ps.priceToY(this.point2.price);
        if (Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= this.ANCHOR_RADIUS) return 1;
        if (Math.sqrt((px - x2) ** 2 + (py - y2) ** 2) <= this.ANCHOR_RADIUS) return 2;
        return null;
    }

    public hitTest(px: number, py: number, ts: TimeScale, ps: PriceScale): boolean {
        if (!this.point1 || !this.point2) return false;
        const x1 = ts.indexToX(this.point1.index), y1 = ps.priceToY(this.point1.price);
        const x2 = ts.indexToX(this.point2.index), y2 = ps.priceToY(this.point2.price);
        return distanceToLineSegment(px, py, x1, y1, x2, y2) <= this.HIT_TOLERANCE;
    }
}
