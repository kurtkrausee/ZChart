// src/nodes/series/AreaNode.ts

import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import type { CandleData } from '../../data/DataStore';

export class AreaNode {
    public isVisible: boolean = true;

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, data: CandleData[]) {
        if (!this.isVisible || data.length === 0) return;

        ctx.save();
        
        ctx.beginPath();
        const startX = timeScale.indexToX(0);
        const startY = priceScale.priceToY(data[0].close);
        ctx.moveTo(startX, startY);

        for (let i = 1; i < data.length; i++) {
            const x = timeScale.indexToX(i);
            const y = priceScale.priceToY(data[i].close);
            ctx.lineTo(x, y);
        }

        // Linie zeichnen
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fläche schließen für den Fill
        const lastX = timeScale.indexToX(data.length - 1);
        const bottomY = priceScale.priceToY(priceScale.visibleMin); // Bis zum unteren Rand

        ctx.lineTo(lastX, bottomY);
        ctx.lineTo(startX, bottomY);
        ctx.closePath();

        // Gradient erstellen
        const gradient = ctx.createLinearGradient(0, priceScale.priceToY(priceScale.visibleMax), 0, bottomY);
        gradient.addColorStop(0, 'rgba(41, 98, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(41, 98, 255, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }
}