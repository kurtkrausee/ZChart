// nodes/TrendLineNode.ts
// Version: 1.6.0 | Updated: 2026-04-14 | By: GitHub Copilot

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale'; 
import type { ChartConfig } from '../../core/ChartOptions';
import { distanceToLineSegment } from '../../utils/geometry';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export type { LogicalPoint };

export class TrendLineNode implements DrawableShape {
    public readonly shapeType = 'trendline' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'Trendlinie';
    public isVisible: boolean = true;
    
    // Die zwei Ankerpunkte der Linie in der "Welt-Koordinate"
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    
    // Visueller Status (wird von außen durch den InputManager/State gesteuert)
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

    // Line tool extensions (TV-style: Trendline extends right by default)
    public extendLeft: boolean = false;
    public extendRight: boolean = true;
    public leftEndpoint: 'normal' | 'arrow' = 'normal';
    public rightEndpoint: 'normal' | 'arrow' = 'normal';
    public showMiddlePoint: boolean = false;
    public showPriceLabels: boolean = false;
    public statsMode: 'hidden' | 'compact' = 'hidden';
    public statsPosition: 'left' | 'center' | 'right' | 'auto' = 'right';
    public statsShowPriceRange: boolean = true;
    public statsShowPercentChange: boolean = true;
    public statsShowPipsChange: boolean = false;
    public statsShowBarsRange: boolean = true;
    public statsShowDateTimeRange: boolean = false;
    public statsShowDistance: boolean = false;
    public statsShowAngle: boolean = false;

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;

    /** Extend line from origin in a direction to the canvas edge */
    private extendToEdge(ox: number, oy: number, dx: number, dy: number, width: number, height: number): { x: number; y: number } {
        if (dx === 0 && dy === 0) return { x: ox, y: oy };
        let tMax = Infinity;
        if (dx > 0) tMax = Math.min(tMax, (width - ox) / dx);
        else if (dx < 0) tMax = Math.min(tMax, -ox / dx);
        if (dy > 0) tMax = Math.min(tMax, (height - oy) / dy);
        else if (dy < 0) tMax = Math.min(tMax, -oy / dy);
        if (!isFinite(tMax)) tMax = 1;
        return { x: ox + dx * tMax, y: oy + dy * tMax };
    }

    /** Draw an arrowhead at (x,y) pointing in direction angle */
    private drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
        const size = 10 + this.lineWidth;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size / 3);
        ctx.lineTo(-size, size / 3);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fill();
        ctx.restore();
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        timeScale: TimeScale,
        priceScale: PriceScale,
        _options: ChartConfig
    ) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        ctx.save();
        const color = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.lineColor);
        ctx.strokeStyle = color;
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        ctx.lineCap = this.lineDash.length > 0 ? 'butt' : 'round'; // round frisst kurze Dash-Luecken (Gepunktet [2,2])
        if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);

        // Compute draw endpoints (with optional extend)
        const dx = x2 - x1;
        const dy = y2 - y1;
        const w = ctx.canvas.width / (window.devicePixelRatio || 1);
        const h = ctx.canvas.height / (window.devicePixelRatio || 1);
        const drawX1 = this.extendLeft ? this.extendToEdge(x1, y1, -dx, -dy, w, h).x : x1;
        const drawY1 = this.extendLeft ? this.extendToEdge(x1, y1, -dx, -dy, w, h).y : y1;
        const drawX2 = this.extendRight ? this.extendToEdge(x1, y1, dx, dy, w, h).x : x2;
        const drawY2 = this.extendRight ? this.extendToEdge(x1, y1, dx, dy, w, h).y : y2;

        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();

        // Arrow endpoints
        if (this.leftEndpoint === 'arrow') {
            const angle = Math.atan2(drawY1 - y1, drawX1 - x1) || Math.atan2(y1 - y2, x1 - x2);
            this.drawArrowhead(ctx, x1, y1, angle);
        }
        if (this.rightEndpoint === 'arrow') {
            const angle = Math.atan2(drawY2 - y2, drawX2 - x2) || Math.atan2(y2 - y1, x2 - x1);
            this.drawArrowhead(ctx, x2, y2, angle);
        }

        // Middle point marker
        if (this.showMiddlePoint) {
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            ctx.beginPath();
            ctx.arc(mx, my, 3, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Text label near midpoint
        if (this.text) {
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 - 8;
            ctx.font = `${this.fontItalic ? 'italic ' : ''}${this.fontBold ? 'bold ' : ''}${this.fontSize}px Arial`;
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.fillText(this.text, mx, my);
        }

        // Price labels on Y-axis
        if (this.showPriceLabels) {
            ctx.setLineDash([2, 2]);
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(w, y1);
            ctx.moveTo(x2, y2); ctx.lineTo(w, y2);
            ctx.stroke();
            ctx.setLineDash(this.lineDash);
            ctx.globalAlpha = 1;
        }

        // Stats box
        if (this.statsMode === 'compact' && this.point1 && this.point2) {
            this.drawStats(ctx, x1, y1, x2, y2, _options);
        }

        // Anchors
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, color);
            this.drawAnchor(ctx, x2, y2, color);
        }

        ctx.restore();
    }

    private drawStats(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, opts: ChartConfig) {
        if (!this.point1 || !this.point2) return;
        const lines: string[] = [];
        const priceDiff = this.point2.price - this.point1.price;
        const pricePct = this.point1.price !== 0 ? (priceDiff / this.point1.price) * 100 : 0;
        const bars = Math.abs(this.point2.index - this.point1.index);
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (this.statsShowPriceRange) lines.push(`${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)}`);
        if (this.statsShowPercentChange) lines.push(`${pricePct >= 0 ? '+' : ''}${pricePct.toFixed(2)}%`);
        if (this.statsShowPipsChange) lines.push(`${Math.round(priceDiff * 100)} pips`);
        if (this.statsShowBarsRange) lines.push(`${bars} Bars`);
        if (this.statsShowDateTimeRange) {
            const totalMs = bars * (opts.intervalMs || 86400000);
            if (totalMs >= 86400000 * 365) lines.push(`${(totalMs / (86400000 * 365)).toFixed(1)}y`);
            else if (totalMs >= 86400000) lines.push(`${Math.round(totalMs / 86400000)}d`);
            else if (totalMs >= 3600000) lines.push(`${Math.round(totalMs / 3600000)}h`);
            else lines.push(`${Math.round(totalMs / 60000)}m`);
        }
        if (this.statsShowDistance) lines.push(`${Math.round(Math.sqrt(dx * dx + dy * dy))} px`);
        if (this.statsShowAngle) lines.push(`${(Math.atan2(-dy, dx) * 180 / Math.PI).toFixed(1)}°`);
        if (lines.length === 0) return;

        const fs = 10;
        ctx.font = `${fs}px Arial`;
        const pad = 4;
        const lh = fs + 3;
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const bW = maxW + pad * 2;
        const bH = lines.length * lh + pad * 2;
        let bx: number;
        const by = Math.min(y1, y2) - bH - 6;
        if (this.statsPosition === 'left') bx = Math.min(x1, x2);
        else if (this.statsPosition === 'center') bx = (x1 + x2) / 2 - bW / 2;
        else if (this.statsPosition === 'auto') bx = x2;
        else bx = Math.max(x1, x2) - bW;

        ctx.fillStyle = opts.colors.background;
        ctx.globalAlpha = 0.88;
        ctx.fillRect(bx, by, bW, bH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        ctx.strokeRect(bx, by, bW, bH);
        ctx.fillStyle = opts.colors.text;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * lh + lh / 2));
    }

    private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | CanvasGradient | CanvasPattern) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    /**
     * Prüft, welcher Ankerpunkt getroffen wurde.
     * @returns 1 für Punkt1, 2 für Punkt2, null für keinen Treffer.
     */
    public hitTestAnchor(
        pixelX: number, 
        pixelY: number, 
        timeScale: TimeScale, 
        priceScale: PriceScale
    ): 1 | 2 | null {
        if (!this.point1 || !this.point2) return null;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        // Distanz zu Punkt 1 prüfen
        const dist1 = Math.sqrt((pixelX - x1) ** 2 + (pixelY - y1) ** 2);
        if (dist1 <= this.ANCHOR_RADIUS) return 1;

        // Distanz zu Punkt 2 prüfen
        const dist2 = Math.sqrt((pixelX - x2) ** 2 + (pixelY - y2) ** 2);
        if (dist2 <= this.ANCHOR_RADIUS) return 2;

        return null;
    }

    /**
     * Prüft, ob ein Maus-Klick (in Pixeln) nah genug an dieser Linie ist.
     * Wird vom InputManager aufgerufen.
     */
    public hitTest(
        pixelX: number, 
        pixelY: number, 
        timeScale: TimeScale, 
        priceScale: PriceScale
    ): boolean {
        if (!this.point1 || !this.point2) return false;

        // Um den Abstand zu berechnen, müssen wir wissen, wo die Linie *jetzt gerade* // auf dem Canvas gerendert werden würde (da User gezoomt/gepaned haben könnte)
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        // Kürzeste Distanz zwischen Klick und Liniensegment ermitteln
        const distance = distanceToLineSegment(pixelX, pixelY, x1, y1, x2, y2);

        return distance <= this.HIT_TOLERANCE;
    }
}