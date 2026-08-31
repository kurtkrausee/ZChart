// nodes/tools/PriceRangeNode.ts
// Version: 1.0.0 | Updated: 2026-04-18 | By: GitHub Copilot
//
// Price Range Measurer (TV-style)
// - 2 clicks to define a box (top + bottom prices, x range)
// - Vertical arrow at the right edge between top/bottom y
// - Horizontal end-caps at top y and bottom y (right side)
// - Filled background rectangle between the two anchors
// - Label box: ΔPrice (Δ%) [ΔVolume]
// - Settings: lineColor, lineWidth, fillColor, extend (none|top|bottom|both),
//   stats (priceRange/percentChange/volume), label color/size/background

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint, VisibilityTimeframes } from '../../types/DrawableShape';
import type { CandleData } from '../../data/DataStore';

export type ExtendMode = 'none' | 'top' | 'bottom' | 'both';

export class PriceRangeNode implements DrawableShape {
    public readonly shapeType = 'price_range' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Preis-Bereich';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;
    public visibleIntervals?: string;
    public visibilityTimeframes?: VisibilityTimeframes;

    // Optional data source for volume aggregation
    public dataStore: { getAllData(): CandleData[] } | null = null;

    // ── Style ──
    public lineColor: string = '#2962FF';
    public lineWidth: number = 1;
    public showBackground: boolean = true;
    public fillColor: string = 'rgba(41, 98, 255, 0.15)';
    public extendMode: ExtendMode = 'none';

    // Stats (info)
    public statsShowPriceRange: boolean = true;
    public statsShowPercentChange: boolean = true;
    public statsShowPipsChange: boolean = false;
    public statsShowVolume: boolean = true;

    // Label
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
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        const chartW = timeScale.width;
        const chartH = priceScale.height;

        ctx.save();

        // ── Background fill ──
        if (this.showBackground) {
            const bgLeft = (this.extendMode === 'both' || this.extendMode === 'top') ? 0 : left;
            const bgRight = (this.extendMode === 'both' || this.extendMode === 'bottom') ? chartW : right;
            const bgTop = (this.extendMode === 'top' || this.extendMode === 'both') ? 0 : top;
            const bgBottom = (this.extendMode === 'bottom' || this.extendMode === 'both') ? chartH : bottom;
            ctx.fillStyle = this.fillColor;
            ctx.fillRect(bgLeft, bgTop, bgRight - bgLeft, bgBottom - bgTop);
        }

        // ── Box border ──
        const borderColor = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = this.lineWidth;
        ctx.strokeRect(left, top, right - left, bottom - top);

        // ── Vertical arrow at right edge (top → bottom direction matches price move) ──
        const ax = right;
        const priceDiff = this.point2.price - this.point1.price;
        // Arrow points from start price (point1) to end price (point2)
        const ay1 = priceScale.priceToY(this.point1.price);
        const ay2 = priceScale.priceToY(this.point2.price);
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineWidth + 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay1);
        ctx.lineTo(ax, ay2);
        ctx.stroke();
        // Arrow head
        const ah = 7;
        const dir = ay2 > ay1 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(ax, ay2);
        ctx.lineTo(ax - ah * 0.6, ay2 - ah * dir);
        ctx.lineTo(ax + ah * 0.6, ay2 - ah * dir);
        ctx.closePath();
        ctx.fillStyle = this.lineColor;
        ctx.fill();

        // ── Horizontal end-caps at top and bottom y on right side ──
        const cap = 12;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(ax - cap, top); ctx.lineTo(ax + cap, top);
        ctx.moveTo(ax - cap, bottom); ctx.lineTo(ax + cap, bottom);
        ctx.stroke();

        // ── Label box (centered horizontally below arrow) ──
        const lines: string[] = [];
        const pct = this.point1.price !== 0 ? (priceDiff / this.point1.price) * 100 : 0;
        const sign = priceDiff >= 0 ? '+' : '';
        const pieces: string[] = [];
        if (this.statsShowPriceRange) pieces.push(`${sign}${priceDiff.toFixed(2)}`);
        if (this.statsShowPercentChange) pieces.push(`(${sign}${pct.toFixed(2)}%)`);
        if (this.statsShowVolume && this.dataStore) {
            const vol = this.computeVolume();
            if (vol > 0) pieces.push(formatVolume(vol));
        }
        if (pieces.length > 0) lines.push(pieces.join(' '));

        if (lines.length > 0) {
            ctx.font = `${this.labelSize}px sans-serif`;
            const padX = 8, padY = 4;
            const widths = lines.map(l => ctx.measureText(l).width);
            const maxW = Math.max(...widths);
            const boxW = maxW + padX * 2;
            const boxH = lines.length * (this.labelSize + 2) + padY * 2;
            const cx = (left + right) / 2;
            const boxX = cx - boxW / 2;
            const boxY = bottom + 8;

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

        // ── Anchors ──
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, borderColor);
            this.drawAnchor(ctx, x2, y2, borderColor);
        }

        ctx.restore();
    }

    private computeVolume(): number {
        if (!this.dataStore || !this.point1 || !this.point2) return 0;
        const data = this.dataStore.getAllData();
        const i1 = Math.max(0, Math.min(this.point1.index, this.point2.index));
        const i2 = Math.min(data.length - 1, Math.max(this.point1.index, this.point2.index));
        let sum = 0;
        for (let i = Math.floor(i1); i <= Math.floor(i2); i++) {
            const c = data[i];
            if (c && typeof c.volume === 'number') sum += c.volume;
        }
        return sum;
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
        const left = Math.min(x1, x2) - this.HIT_TOLERANCE;
        const right = Math.max(x1, x2) + this.HIT_TOLERANCE;
        const top = Math.min(y1, y2) - this.HIT_TOLERANCE;
        const bottom = Math.max(y1, y2) + this.HIT_TOLERANCE;
        if (pixelX < left || pixelX > right || pixelY < top || pixelY > bottom) return false;
        // Edge or right-arrow column → hit
        const ax = Math.max(x1, x2);
        if (Math.abs(pixelX - ax) <= this.HIT_TOLERANCE + 4) return true;
        // Top/bottom edges
        if (Math.abs(pixelY - Math.min(y1, y2)) <= this.HIT_TOLERANCE) return true;
        if (Math.abs(pixelY - Math.max(y1, y2)) <= this.HIT_TOLERANCE) return true;
        return false;
    }
}

function formatVolume(v: number): string {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return v.toFixed(0);
}
