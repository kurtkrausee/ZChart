// src/nodes/series/AreaNode.ts

import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import type { CandleData } from '../../data/DataStore';
import { SceneNode } from '../core/SceneNode'; // Pfad ggf. anpassen!
import type { ChartConfig } from '../../core/ChartOptions'; // WICHTIG FÜR SIGNATUR

export class AreaNode extends SceneNode {
    public role = 'series'; // Hier ist die wichtige Rolle!
    private data: CandleData[];

    // Wir übergeben die Daten im Konstruktor (wie bei CandlestickNode den DataStore)
    constructor(data: CandleData[]) {
        super();
        this.data = data;
    }

    // Die Draw-Methode muss exakt die Signatur aus SceneNode matchen!
    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ): void {
        if (!this.isVisible || this.data.length === 0) return;

        ctx.save();
        
        ctx.beginPath();
        const startX = timeScale.indexToX(0);
        const startY = priceScale.priceToY(this.data[0].close);
        ctx.moveTo(startX, startY);

        for (let i = 1; i < this.data.length; i++) {
            const x = timeScale.indexToX(i);
            const y = priceScale.priceToY(this.data[i].close);
            ctx.lineTo(x, y);
        }

        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const lastX = timeScale.indexToX(this.data.length - 1);
        const bottomY = priceScale.priceToY(priceScale.visibleMin); 

        ctx.lineTo(lastX, bottomY);
        ctx.lineTo(startX, bottomY);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, priceScale.priceToY(priceScale.visibleMax), 0, bottomY);
        gradient.addColorStop(0, 'rgba(41, 98, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(41, 98, 255, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }
}