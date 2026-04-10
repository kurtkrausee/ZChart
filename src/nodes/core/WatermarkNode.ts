// src/nodes/core/WatermarkNode.ts
import { SceneNode } from './SceneNode';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class WatermarkNode extends SceneNode {
    public role = 'background';
    public text: string = '';
    
    // Verhindert, dass der InputManager versehentlich das Watermark anklickt
    public hitTest() { return false; } 

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig) {
        if (!this.isVisible || !this.text) return;

        // Die Breite und Höhe der aktuellen Pane
        const width = timeScale.width;
        const height = priceScale.height;

        ctx.save();
        // Fetter, großer Text, zentriert
        ctx.font = 'bold 80px Arial, sans-serif';
        // Sehr blass machen (z.B. 4% Sichtbarkeit)
        ctx.fillStyle = options.colors.text || '#888888';
        ctx.globalAlpha = 0.04; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Exakt in der Mitte des Canvas zeichnen
        ctx.fillText(this.text, width / 2, height / 2);
        ctx.restore();
    }
}