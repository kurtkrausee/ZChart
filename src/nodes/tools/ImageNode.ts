// src/nodes/tools/ImageNode.ts

import { SceneNode } from '../core/SceneNode';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class ImageNode extends SceneNode {
    public role = 'tool';
    public name = 'Bild';
    
    // Der Ankerpunkt auf dem Chart (Zentrum des Bildes)
    public point1: { index: number, price: number } | null = null;
    
    // Das echte HTML-Image-Element und seine Dimensionen
    public image: HTMLImageElement | null = null;
    public width: number = 100;
    public height: number = 100;

    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ): void {
        if (!this.point1 || !this.isVisible || !this.image) return;

        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation); // Das Bild kann gedreht werden!

        // Wir zeichnen das Bild exakt zentriert um den Koordinaten-Ursprung (0,0)
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        ctx.drawImage(this.image, -halfW, -halfH, this.width, this.height);

        // Bounding Box zeichnen, wenn ausgewählt
        if (this.isSelected || this.isHovered) {
            ctx.strokeStyle = '#2962FF';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(-halfW - 2, -halfH - 2, this.width + 4, this.height + 4);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1 || !this.image) return false;
        
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        const halfW = this.width / 2;
        const halfH = this.height / 2;

        // Prüfen, ob der Klick innerhalb des Rechtecks war
        return pixelX >= x - halfW && pixelX <= x + halfW &&
               pixelY >= y - halfH && pixelY <= y + halfH;
    }
}