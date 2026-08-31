// nodes/tools/fib/FiboNode.ts
// Version: 2.2.0 | Updated: 2026-04-14 | By: GitHub Copilot
// Fibonacci Retracement: 2-point tool with TV-style configurable levels/fills/labels.

import { TimeScale } from '../../../math/TimeScale';
import { PriceScale } from '../../../math/PriceScale';
import type { ChartConfig } from '../../../core/ChartOptions';
import { distanceToLineSegment } from '../../../utils/geometry';
import type { DrawableShape, LogicalPoint } from '../../../types/DrawableShape';
import {
  type FibStyleConfig, DEFAULT_RETRACEMENT_LEVELS,
  createDefaultFibStyle, applyLineStyle, formatFibLabel,
} from './FibTypes';

export type { LogicalPoint };

export class FiboNode implements DrawableShape {
    public readonly shapeType = 'fibo' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Fibonacci Retracement';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    /** TV-style configurable properties – Phase 3 Atom-Katalog will expose these */
    public style: FibStyleConfig = createDefaultFibStyle(DEFAULT_RETRACEMENT_LEVELS);

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        const canvasW = ctx.canvas.width / (window.devicePixelRatio || 1);
        // v10-MIGRATION: extend field replaces extendLeft/extendRight
        const ext = this.style.extend ?? 'none';
        const startX = (ext === 'left' || ext === 'both') ? 0 : Math.min(x1, x2);
        const endX = (ext === 'right' || ext === 'both') ? canvasW : Math.max(x1, x2);

        const levels = this.style.levels.filter(l => l.visible);
        const p1Price = this.style.reverse ? this.point2.price : this.point1.price;
        const p2Price = this.style.reverse ? this.point1.price : this.point2.price;
        const useOneColor = this.style.useOneColor ?? false;
        const oneColor = this.style.oneColor ?? '#2962FF';

        ctx.save();

        // 1. Background fills between consecutive levels
        if (this.style.fills.show) {
            ctx.globalAlpha = this.style.fills.opacity;
            for (let i = 0; i < levels.length - 1; i++) {
                const price1 = p1Price - (p1Price - p2Price) * levels[i].value;
                const price2 = p1Price - (p1Price - p2Price) * levels[i + 1].value;
                const ly1 = priceScale.priceToY(price1);
                const ly2 = priceScale.priceToY(price2);
                ctx.fillStyle = useOneColor ? oneColor : levels[i].color;
                ctx.fillRect(startX, Math.min(ly1, ly2), endX - startX, Math.abs(ly2 - ly1));
            }
            ctx.globalAlpha = 1.0;
        }

        // 2. Level lines + labels
        const hAlign = this.style.labels.hAlign ?? this.style.labels.position ?? 'left';
        const vAlign = this.style.labels.vAlign ?? 'middle';
        const fontSize = this.style.labels.fontSize ?? 12;
        const globalWidth = this.style.levelsLineWidth;
        const globalStyle = this.style.levelsLineStyle;

        for (const lvl of levels) {
            const price = p1Price - (p1Price - p2Price) * lvl.value;
            const y = priceScale.priceToY(price);
            const lvlColor = useOneColor ? oneColor : lvl.color;

            ctx.strokeStyle = lvlColor;
            ctx.lineWidth = globalWidth ?? lvl.lineWidth;
            applyLineStyle(ctx, globalStyle ?? lvl.lineStyle);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            if (this.style.labels.show || this.style.labels.showPrice) {
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = lvlColor;
                // Vertical alignment
                ctx.textBaseline = vAlign === 'top' ? 'bottom' : vAlign === 'bottom' ? 'top' : 'middle';
                const yOff = vAlign === 'top' ? -3 : vAlign === 'bottom' ? 3 : 0;
                const label = formatFibLabel(lvl, price, this.style.labels);
                // Horizontal alignment
                const tw = ctx.measureText(label).width;
                let lx: number;
                if (hAlign === 'right') lx = endX - tw - 4;
                else if (hAlign === 'center') lx = (startX + endX - tw) / 2;
                else lx = startX + 4;
                ctx.fillText(label, lx, y + yOff);
            }
        }

        // 3. Trend/base line (diagonal)
        if (this.style.trendLine.show) {
            ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.style.trendLine.color);
            ctx.lineWidth = this.isSelected ? 2 : this.style.trendLine.width;
            applyLineStyle(ctx, this.style.trendLine.style);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Anchor points
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, this.isSelected ? '#FFD700' : '#4ea2ff');
            this.drawAnchor(ctx, x2, y2, this.isSelected ? '#FFD700' : '#4ea2ff');
        }

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

    public hitTestAnchor(px: number, py: number, ts: TimeScale, ps: PriceScale): 1 | 2 | null {
        if (!this.point1 || !this.point2) return null;
        const x1 = ts.indexToX(this.point1.index), y1 = ps.priceToY(this.point1.price);
        const x2 = ts.indexToX(this.point2.index), y2 = ps.priceToY(this.point2.price);
        if (Math.hypot(px - x1, py - y1) <= this.ANCHOR_RADIUS) return 1;
        if (Math.hypot(px - x2, py - y2) <= this.ANCHOR_RADIUS) return 2;
        return null;
    }

    public hitTest(px: number, py: number, ts: TimeScale, ps: PriceScale): boolean {
        if (!this.point1 || !this.point2) return false;
        const x1 = ts.indexToX(this.point1.index), y1 = ps.priceToY(this.point1.price);
        const x2 = ts.indexToX(this.point2.index), y2 = ps.priceToY(this.point2.price);
        return distanceToLineSegment(px, py, x1, y1, x2, y2) <= this.HIT_TOLERANCE;
    }
}
