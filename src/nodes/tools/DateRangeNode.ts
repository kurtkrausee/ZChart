// nodes/tools/DateRangeNode.ts
// Version: 1.0.0 | Updated: 2026-04-18 | By: GitHub Copilot
//
// Date Range Measurer (TV-style)
// - 2 clicks to define a horizontal time-span at a given y
// - Horizontal line connecting the two x positions at the lower y
// - Small vertical end-caps at left and right
// - Label box: bars range / date range / volume

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint, VisibilityTimeframes } from '../../types/DrawableShape';
import type { CandleData } from '../../data/DataStore';

export type ExtendMode = 'none' | 'top' | 'bottom' | 'both';

export class DateRangeNode implements DrawableShape {
    public readonly shapeType = 'date_range' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Datums-Bereich';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;
    public visibleIntervals?: string;
    public visibilityTimeframes?: VisibilityTimeframes;

    public dataStore: { getAllData(): CandleData[] } | null = null;

    public lineColor: string = '#2962FF';
    public lineWidth: number = 1;
    public showBackground: boolean = true;
    public fillColor: string = 'rgba(41, 98, 255, 0.10)';
    public extendMode: ExtendMode = 'none';

    public statsShowBarsRange: boolean = true;
    public statsShowDateTimeRange: boolean = true;
    public statsShowVolume: boolean = true;

    public labelColor: string = '#ffffff';
    public labelSize: number = 12;
    public labelBackground: boolean = true;
    public labelBgColor: string = 'rgba(20, 22, 30, 0.92)';

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const x2 = timeScale.indexToX(this.point2.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const y2 = priceScale.priceToY(this.point2.price);

        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const yLine = Math.max(y1, y2); // lower y (visually bottom)
        const chartH = priceScale.height;

        ctx.save();

        if (this.showBackground) {
            const top = (this.extendMode === 'top' || this.extendMode === 'both') ? 0 : Math.min(y1, y2);
            const bottom = (this.extendMode === 'bottom' || this.extendMode === 'both') ? chartH : Math.max(y1, y2);
            ctx.fillStyle = this.fillColor;
            ctx.fillRect(left, top, right - left, bottom - top);
        }

        const color = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.strokeStyle = color;
        ctx.lineWidth = this.lineWidth + 1;

        // ── Horizontal arrow line ──
        ctx.beginPath();
        ctx.moveTo(left, yLine);
        ctx.lineTo(right, yLine);
        ctx.stroke();

        // ── Arrow head pointing right (or left if reversed) ──
        const ah = 7;
        const dirRight = x2 >= x1;
        const tipX = dirRight ? right : left;
        const baseX = dirRight ? right - ah : left + ah;
        ctx.beginPath();
        ctx.moveTo(tipX, yLine);
        ctx.lineTo(baseX, yLine - ah * 0.6);
        ctx.lineTo(baseX, yLine + ah * 0.6);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // ── Vertical end-caps ──
        const cap = 8;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(left, yLine - cap); ctx.lineTo(left, yLine + cap);
        ctx.moveTo(right, yLine - cap); ctx.lineTo(right, yLine + cap);
        ctx.stroke();

        // ── Label ──
        const lines: string[] = [];
        const bars = Math.abs(Math.round(this.point2.index - this.point1.index));
        const data = this.dataStore?.getAllData() ?? [];
        const i1 = Math.floor(Math.min(this.point1.index, this.point2.index));
        const i2 = Math.floor(Math.max(this.point1.index, this.point2.index));
        const c1 = data[Math.max(0, i1)];
        const c2 = data[Math.min(data.length - 1, i2)];
        const head: string[] = [];
        if (this.statsShowBarsRange) head.push(`${bars} bars`);
        if (this.statsShowDateTimeRange && c1 && c2) {
            const days = Math.max(1, Math.round((c2.timestamp - c1.timestamp) / 86400000));
            head.push(`${days}d`);
        }
        if (head.length > 0) lines.push(head.join(', '));
        if (this.statsShowVolume && data.length > 0) {
            let vol = 0;
            for (let i = Math.max(0, i1); i <= Math.min(data.length - 1, i2); i++) {
                if (data[i] && typeof data[i].volume === 'number') vol += data[i].volume;
            }
            if (vol > 0) lines.push(`Vol ${formatVolume(vol)}`);
        }

        if (lines.length > 0) {
            ctx.font = `${this.labelSize}px sans-serif`;
            const padX = 8, padY = 4;
            const widths = lines.map(l => ctx.measureText(l).width);
            const maxW = Math.max(...widths);
            const boxW = maxW + padX * 2;
            const boxH = lines.length * (this.labelSize + 2) + padY * 2;
            const cx = (left + right) / 2;
            const boxX = cx - boxW / 2;
            const boxY = yLine + 10;

            if (this.labelBackground) {
                ctx.fillStyle = this.labelBgColor;
                ctx.beginPath();
                (ctx as any).roundRect ? (ctx as any).roundRect(boxX, boxY, boxW, boxH, 4) : ctx.rect(boxX, boxY, boxW, boxH);
                ctx.fill();
            }
            ctx.fillStyle = this.labelColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            lines.forEach((l, i) => ctx.fillText(l, cx, boxY + padY + i * (this.labelSize + 2)));
        }

        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, color);
            this.drawAnchor(ctx, x2, y2, color);
        }

        ctx.restore();
    }

    private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | CanvasGradient | CanvasPattern) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    public hitTestAnchor(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): 1 | 2 | null {
        if (!this.point1 || !this.point2) return null;
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);
        if (Math.hypot(pixelX - x1, pixelY - y1) <= this.ANCHOR_RADIUS) return 1;
        if (Math.hypot(pixelX - x2, pixelY - y2) <= this.ANCHOR_RADIUS) return 2;
        return null;
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1 || !this.point2) return false;
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const yLine = Math.max(y1, y2);
        // Horizontal line band
        if (pixelX >= left - this.HIT_TOLERANCE && pixelX <= right + this.HIT_TOLERANCE
            && Math.abs(pixelY - yLine) <= this.HIT_TOLERANCE + 2) return true;
        return false;
    }
}

function formatVolume(v: number): string {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)} K`;
    return v.toFixed(0);
}
