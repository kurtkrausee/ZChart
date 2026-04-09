// src/nodes/tools/TextNode.ts

import { SceneNode } from '../core/SceneNode';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class TextNode extends SceneNode {
    public role = 'tool';
    public name = 'Text';
    
    // Ankerpunkt
    public point1: { index: number, price: number } | null = null;
    
    // Texteigenschaften
    public text: string = '';
    public fontSize: number = 16;
    public color: string = '#d1d4dc'; // Standard-Textfarbe
    public fontFamily: string = 'Arial, sans-serif';

    // Wir speichern die gerenderte Breite, damit wir später den Hit-Test machen können
    private lastRenderedWidth: number = 0;

    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ): void {
        // Zeichne nichts, wenn der Text leer ist oder der Anker fehlt
        if (!this.point1 || !this.isVisible || this.text.trim() === '') return;

        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation); // Phase 11: Rotation anwenden!

        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Breite für den Hit-Test speichern
        this.lastRenderedWidth = ctx.measureText(this.text).width;

        // Text zeichnen
        ctx.fillText(this.text, 0, 0);

        // Bounding Box zeichnen, wenn ausgewählt
        if (this.isSelected || this.isHovered) {
            ctx.strokeStyle = '#2962FF';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            
            // Ein Rechteck genau um den Text ziehen (Puffer von 4px)
            const padding = 4;
            const height = this.fontSize;
            ctx.strokeRect(-padding, -(height/2) - padding, this.lastRenderedWidth + (padding*2), height + (padding*2));
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1 || this.lastRenderedWidth === 0) return false;
        
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        // Da unser Text 'left' und 'middle' zentriert ist, prüfen wir dieses Rechteck:
        const halfHeight = this.fontSize / 2;
        
        const isInsideX = pixelX >= x && pixelX <= x + this.lastRenderedWidth;
        const isInsideY = pixelY >= y - halfHeight && pixelY <= y + halfHeight;

        return isInsideX && isInsideY;
    }

    public hitTestAnchor(): 1 | 2 | null {
        return null; // Text hat keine ziehbaren "Endpunkte" wie eine Trendlinie
    }
}