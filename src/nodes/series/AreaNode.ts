// src/nodes/series/AreaNode.ts

import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import { DataStore } from '../../data/DataStore';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class AreaNode extends SceneNode {
    public role = 'series'; 
    private dataStore: DataStore;

    // Perfekt: Wir übergeben den DataStore, damit Live-Ticks funktionieren!
    constructor(dataStore: DataStore) {
        super();
        this.dataStore = dataStore;
    }

    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ): void {
        const totalCandles = this.dataStore.getAllData().length;
        if (!this.isVisible || totalCandles === 0) return;

        // Performance: Wir zeichnen NUR, was auf dem Bildschirm sichtbar ist
        const { start, end } = timeScale.getVisibleRange(totalCandles);
        const data = this.dataStore.getAllData();

        if (start === end) return;

        ctx.save();
        ctx.beginPath();

        let firstX = 0;
        let lastX = 0;

        // 1. Die Linie abfahren
        for (let i = start; i <= end; i++) {
            const candle = data[i];
            if (!candle) continue;

            const x = timeScale.indexToX(i);
            const y = priceScale.priceToY(candle.close);

            if (i === start) {
                ctx.moveTo(x, y);
                firstX = x;
            } else {
                ctx.lineTo(x, y);
            }
            lastX = x;
        }

        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Den Bereich nach unten schließen
        const bottomY = priceScale.height; // Sicherer, um bis zum echten Boden zu füllen
        ctx.lineTo(lastX, bottomY);
        ctx.lineTo(firstX, bottomY);
        ctx.closePath();

        // 3. Halbtransparenter Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, bottomY);
        gradient.addColorStop(0, 'rgba(41, 98, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(41, 98, 255, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }
}