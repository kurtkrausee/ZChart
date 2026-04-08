// core/DrawingManager.ts

import { TrendLineNode } from '../nodes/tools/TrendLineNode';
import { FiboNode } from '../nodes/tools/FiboNode';
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import type { ChartConfig } from './ChartOptions';

export class DrawingManager {
    public shapes: Array<TrendLineNode | FiboNode> = []; 

    /**
     * Zeichnet alle sichtbaren Formen auf den Canvas.
     */
    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ) {
        this.shapes.forEach(shape => {
            // NEU: Nur zeichnen, wenn das Auge im Object Tree offen ist
            if (shape.isVisible) {
                shape.draw(ctx, timeScale, priceScale, options);
            }
        });
    }

    /**
     * Entfernt eine Zeichnung anhand ihrer ID (vom Object Tree/API aufgerufen)
     */
    public removeDrawing(id: string) {
        this.shapes = this.shapes.filter(shape => shape.id !== id);
    }

    /**
     * Deselektiert alle Formen. (Wichtig, wenn man ins Leere klickt).
     */
    public deselectAll() {
        this.shapes.forEach(shape => shape.isSelected = false);
    }

    /**
     * Verschiebt eine Zeichnung an eine neue Position im Layer-Stack
     */
    public reorder(id: string, newIndex: number) {
        const index = this.shapes.findIndex(s => s.id === id);
        if (index === -1) return;
        
        const [shape] = this.shapes.splice(index, 1);
        this.shapes.splice(newIndex, 0, shape);
    }

    /**
     * Gibt das aktuell selektierte Objekt zurück (für Entf-Taste)
     */
    public getSelectedShapeId(): string | null {
        const selected = this.shapes.find(s => s.isSelected);
        return selected ? selected.id : null;
    }
}