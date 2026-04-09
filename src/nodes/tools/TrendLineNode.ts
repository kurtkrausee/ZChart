// nodes/TrendLineNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale'; 
import type { ChartConfig } from '../../core/ChartOptions';
import { distanceToLineSegment } from '../../utils/geometry';
import { SceneNode } from '../core/SceneNode';

// 1. Das Interface muss außerhalb der Klasse stehen!
export interface LogicalPoint {
    index: number;
    price: number;
}

// 2. Hier startet die Klasse (nur EINMAL deklariert)
export class TrendLineNode extends SceneNode {
    public role = 'tool'; // <--- Hier sitzt die Rolle perfekt!
    
    public id: string = crypto.randomUUID(); // Eindeutige ID für den Object Tree
    public name: string = 'Trendlinie';     // Anzeigename im Baum
    public isVisible: boolean = true;
    
    // Die zwei Ankerpunkte der Linie in der "Welt-Koordinate"
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    
    // Visueller Status (wird von außen durch den InputManager/State gesteuert)
    public isHovered: boolean = false;
    public isSelected: boolean = false;

    // Toleranz-Radius für den Hit-Test (in Pixeln)
    private readonly HIT_TOLERANCE = 5;

    private readonly ANCHOR_RADIUS = 6; // Etwas größerer Radius für einfacheres Greifen

    public draw(
        ctx: CanvasRenderingContext2D,
        timeScale: TimeScale,
        priceScale: PriceScale,
        options: ChartConfig
    ) {
        // Ohne Start- und Endpunkt können wir keine Linie zeichnen
        if (!this.point1 || !this.point2) return;

        // 1. Logische Koordinaten in aktuelle Pixel umrechnen
        const x1 = timeScale.indexToX(this.point1.index);
        const y1 = priceScale.priceToY(this.point1.price);
        
        const x2 = timeScale.indexToX(this.point2.index);
        const y2 = priceScale.priceToY(this.point2.price);

        // 2. Linie auf den Canvas bringen
        ctx.save();
        
        // Styling anpassen, falls die Maus darüber ist oder sie angeklickt wurde
        ctx.strokeStyle = this.isSelected ? '#FFD700' : (this.isHovered ? '#4ea2ff' : '#2962FF');
        ctx.lineWidth = this.isSelected ? 3 : 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Optional: Kleine "Anfasser"-Kreise an den Enden zeichnen, 
        // wenn die Linie ausgewählt oder gehovert ist
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
