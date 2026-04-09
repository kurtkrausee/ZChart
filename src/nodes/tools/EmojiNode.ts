// src/nodes/tools/EmojiNode.ts

import { SceneNode } from '../core/SceneNode';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class EmojiNode extends SceneNode {
    public role = 'tool';
    public name = 'Emoji';
    
    // Der Ankerpunkt in der Chart-Welt
    public point1: { index: number, price: number } | null = null;
    
    // Spezifische Eigenschaften für dieses Tool
    public emoji: string = '😀';
    public size: number = 40; 
    public scaleX: number = 1; // 1 = normal, -1 = horizontal gespiegelt

    // (Hinweis: `rotation`, `isSelected` etc. erben wir automatisch von SceneNode!)

    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ): void {
        if (!this.point1 || !this.isVisible) return;

        // 1. Logische Position in Pixel umrechnen
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        // 2. Zustand des Canvas SPEICHERN
        ctx.save();

        // 3. Den Nullpunkt (0,0) exakt auf unser Emoji verschieben
        ctx.translate(x, y);

        // 4. Das "Papier" drehen (this.rotation ist in Radiant)
        ctx.rotate(this.rotation);

        // 5. Spiegeln (falls der Nutzer nach links gezogen hat)
        ctx.scale(this.scaleX, 1);

        // 6. Zeichnen! (Wichtig: Wir zeichnen bei 0,0, da wir den Canvas verschoben haben)
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';      // Zentriert das Emoji exakt auf 0,0
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);

        // 7. Bounding Box (Rahmen) zeichnen, wenn ausgewählt
        if (this.isSelected || this.isHovered) {
            ctx.strokeStyle = '#2962FF';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // Gestrichelte Linie
            
            // Ein Rechteck um 0,0 herum zeichnen
            const half = (this.size / 2) + 5; // 5px Padding
            ctx.strokeRect(-half, -half, this.size + 10, this.size + 10);
            
            ctx.setLineDash([]); // Dash zurücksetzen
        }

        // 8. Zustand ZURÜCKSETZEN (damit der Rest des Charts nicht gedreht wird!)
        ctx.restore();
    }

    /**
     * Hit-Test: Hat der User auf das Emoji geklickt?
     */
    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1) return false;
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        // Einfacher Radius-Check per Satz des Pythagoras
        const distance = Math.sqrt((pixelX - x) ** 2 + (pixelY - y) ** 2);
        
        // Treffer, wenn die Maus innerhalb der halben Schriftgröße ist (+ kleiner Puffer)
        return distance <= (this.size / 2) + 5;
    }

    /**
     * Da das Emoji nur EINEN Punkt hat, brauchen wir keine komplexen Anker-Handles.
     */
    public hitTestAnchor(): 1 | 2 | null {
        return null; 
    }
}