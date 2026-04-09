// src/nodes/tools/PenNode.ts

import { SceneNode } from '../core/SceneNode';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class PenNode extends SceneNode {
    public role = 'tool';
    public name = 'Stift';
    
    // Anstatt point1 und point2 speichern wir hier ALLE Punkte der Freihand-Linie
    public points: { index: number, price: number }[] = [];
    
    public color: string = '#2962FF';
    public lineWidth: number = 2;

    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ): void {
        if (!this.isVisible || this.points.length < 2) return;

        ctx.save();
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : this.color);
        ctx.lineWidth = this.isSelected ? this.lineWidth + 1 : this.lineWidth;
        
        // Runde Kanten machen Freihand-Linien viel geschmeidiger
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        
        // Startpunkt
        const startX = timeScale.indexToX(this.points[0].index);
        const startY = priceScale.priceToY(this.points[0].price);
        ctx.moveTo(startX, startY);

        // Alle weiteren Punkte verbinden
        for (let i = 1; i < this.points.length; i++) {
            const x = timeScale.indexToX(this.points[i].index);
            const y = priceScale.priceToY(this.points[i].price);
            ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.restore();
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (this.points.length < 2) return false;

        // Wir prüfen für jedes kleine Liniensegment, ob die Maus in der Nähe ist
        for (let i = 0; i < this.points.length - 1; i++) {
            const x1 = timeScale.indexToX(this.points[i].index);
            const y1 = priceScale.priceToY(this.points[i].price);
            const x2 = timeScale.indexToX(this.points[i+1].index);
            const y2 = priceScale.priceToY(this.points[i+1].price);

            // Eine grobe, aber extrem schnelle Hitbox für das Segment (± 5 Pixel Toleranz)
            const minX = Math.min(x1, x2) - 5;
            const maxX = Math.max(x1, x2) + 5;
            const minY = Math.min(y1, y2) - 5;
            const maxY = Math.max(y1, y2) + 5;

            if (pixelX >= minX && pixelX <= maxX && pixelY >= minY && pixelY <= maxY) {
                 return true; 
            }
        }
        return false;
    }
}