// src/nodes/series/AreaNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';

export class EmojiNode {
    public id: string = crypto.randomUUID();
    public name: string = 'emoji';
    public isVisible: boolean = true;
    public point1: { index: number, price: number } | null = null;
    
    public emoji: string = '😊';
    public fontSize: number = 40;
    public rotation: number = 0; // In Radiant

    public isHovered: boolean = false;
    public isSelected: boolean = false;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale) {
        if (!this.point1 || !this.isVisible) return;

        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation);
        
        ctx.font = `${this.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Zeichne Smiley
        ctx.fillText(this.emoji, 0, 0);

        // Selection Frame
        if (this.isSelected) {
            ctx.strokeStyle = '#2962ff';
            ctx.lineWidth = 1;
            const s = this.fontSize;
            ctx.strokeRect(-s/2, -s/2, s, s);
        }

        ctx.restore();
    }
    
    // Einfacher Hit-Test für Punkt
    public hitTest(px: number, py: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1) return false;
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);
        const dist = Math.sqrt((px - x)**2 + (py - y)**2);
        return dist < this.fontSize / 2;
    }
}