// core/DrawingManager.ts

import { TrendLineNode } from '../nodes/TrendLineNode';
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import type { ChartConfig } from './ChartOptions';

export class DrawingManager {
    // Hier landen später auch FiboNode, RayNode etc.
    public shapes: TrendLineNode[] = []; 

    /**
     * Zeichnet alle aktiven Formen auf den Canvas.
     */
    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ) {
        this.shapes.forEach(shape => {
            shape.draw(ctx, timeScale, priceScale, options);
        });
    }

    /**
     * Deselektiert alle Formen. (Wichtig, wenn man ins Leere klickt).
     */
    public deselectAll() {
        this.shapes.forEach(shape => shape.isSelected = false);
    }
}