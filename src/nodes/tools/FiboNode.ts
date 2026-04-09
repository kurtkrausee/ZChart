// src/nodes/FiboNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import { distanceToLineSegment } from '../../utils/geometry';
import { SceneNode } from '../core/SceneNode';

export interface LogicalPoint {
    index: number;
    price: number;
}

export class FiboNode extends SceneNode {
    public role = 'tool'; 
    public id: string = crypto.randomUUID();
    public name: string = 'Fibonacci Retracement';
    public isVisible: boolean = true;
    
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    
    public isHovered: boolean = false;
    public isSelected: boolean = false;

    private readonly HIT_TOLERANCE = 5;
    private readonly ANCHOR_RADIUS = 6;

    // Standard Fibonacci Levels
    private levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    
    // Farben für die jeweiligen Levels (passend zu deinem Server-JSON)
    private levelColors: Record<number, string> = {
        0: "#787b86",
        0.236: "#f44336",
        0.382: "#ff9800",
        0.5: "#4caf50",
        0.618: "#2196f3",
        0.786: "#9c27b0",
        1: "#787b86"
    };

    public draw(
        ctx: CanvasRenderingContext2D,
        timeScale: TimeScale,
        priceScale: PriceScale,
        options: ChartConfig
    ) {
        if (!this.point1 || !this.point2) return;

        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2); // Optional: Chart-Ende nehmen für endlose Linien

        ctx.save();

        // 1. Hintergrund-Füllungen zeichnen (zwischen den Levels)
        ctx.globalAlpha = 0.1; // Leichte Transparenz für den Hintergrund
        for (let i = 0; i < this.levels.length - 1; i++) {
            const lvl1 = this.levels[i];
            const lvl2 = this.levels[i + 1];
            
            const price1 = this.point1.price - (this.point1.price - this.point2.price) * lvl1;
            const price2 = this.point1.price - (this.point1.price - this.point2.price) * lvl2;
            
            const lvlY1 = priceScale.priceToY(price1);
            const lvlY2 = priceScale.priceToY(price2);

            ctx.fillStyle = this.levelColors[lvl1] || '#2962ff';
            ctx.fillRect(startX, Math.min(lvlY1, lvlY2), endX - startX, Math.abs(lvlY2 - lvlY1));
        }
        ctx.globalAlpha = 1.0;

        // 2. Horizontale Linien & Text zeichnen
        ctx.lineWidth = 1;
        ctx.font = '10px Arial';
        ctx.textBaseline = 'bottom';

        this.levels.forEach(lvl => {
            const price = this.point1!.price - (this.point1!.price - this.point2!.price) * lvl;
            const y = priceScale.priceToY(price);

            ctx.strokeStyle = this.levelColors[lvl] || '#2962ff';
            ctx.fillStyle = ctx.strokeStyle;

            // Linie
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();

            // Text (Level + Preis)
            ctx.fillText(`${lvl} (${price.toFixed(4)})`, startX, y - 2);
        });

        // 3. Haupt-Trendlinie (Diagonal) für Hit-Testing und Optik zeichnen
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : 'rgba(120, 123, 134, 0.5)');
        ctx.lineWidth = this.isSelected ? 2 : 1;
        ctx.setLineDash([5, 5]); // Gestrichelt
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // Ankerpunkte zum Greifen
        if (this.isSelected || this.isHovered) {
            this.drawAnchor(ctx, x1, y1, ctx.strokeStyle);
            this.drawAnchor(ctx, x2, y2, ctx.strokeStyle);
        }

        ctx.restore();
    }

    private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | CanvasGradient | CanvasPattern) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    // --- Hit-Testing (Identisch zur Trendlinie) ---
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

        // Wir testen der Einfachheit halber nur die Hauptdiagonale
        const distance = distanceToLineSegment(pixelX, pixelY, x1, y1, x2, y2);
        return distance <= this.HIT_TOLERANCE;
    }
}