// src/nodes/tools/HorizontalLineNode.ts
import { SceneNode } from '../core/SceneNode';

export class HorizontalLineNode extends SceneNode {
    public id: string;
    public price: number = 0; // Der Y-Wert (Support/Resistance Level)
    
    // Styling
    public color: string = '#2962FF';
    public lineWidth: number = 2;
    public lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
    
    // Status
    public isSelected: boolean = false;
    public isHovered: boolean = false;
    public name: string = "Horizontal Line";

    constructor() {
        super();
        this.id = `hline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public draw(ctx: CanvasRenderingContext2D, timeScale: any, priceScale: any, options: any) {
        if (!priceScale || !this.isVisible) return; 

        const y = priceScale.priceToY(this.price);

        // Wir nutzen ctx.canvas.height für den Sicherheitscheck
        if (y < 0 || y > ctx.canvas.height) return;

        ctx.save();
        ctx.lineWidth = this.lineWidth;
        
        if (this.isSelected) {
            ctx.strokeStyle = '#ffffff'; 
            ctx.lineWidth = this.lineWidth + 1;
        } else {
            ctx.strokeStyle = this.isHovered ? '#4d85ff' : this.color;
        }

        if (this.lineStyle === 'dashed') ctx.setLineDash([5, 5]);
        if (this.lineStyle === 'dotted') ctx.setLineDash([2, 4]);

        ctx.beginPath();
        ctx.moveTo(0, y);
        // ctx.canvas.width liefert uns immer die korrekte Chart-Breite!
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Hit-Test: Prüft, ob die Maus nah genug an der Linie ist (+/- 5 Pixel)
     */
    public hitTest(x: number, y: number, timeScale: any, priceScale: any): boolean {
        if (!priceScale) return false;
        const lineY = priceScale.priceToY(this.price);
        
        // Wenn die Maus auf der Y-Achse auf ca. 5 Pixel an der Linie ist, haben wir einen Hit!
        return Math.abs(y - lineY) <= 5;
    }

    /**
     * Für horizontale Linien gibt es keine einzelnen Ankerpunkte (wie bei der Trendlinie),
     * man greift die Linie einfach als Ganzes. Daher geben wir hier null zurück.
     */
    public hitTestAnchor(x: number, y: number, timeScale: any, priceScale: any): null {
        return null; 
    }
}