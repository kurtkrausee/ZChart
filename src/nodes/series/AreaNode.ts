// nodes/series/AreaNode.ts
// Version: 1.2.0 | Updated: 2026-04-09 | By: GitHub Copilot
// Theme-aware area chart – uses options.colors for line & gradient

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import { DataStore } from '../../data/DataStore';
import type { ChartConfig } from '../../core/ChartOptions';

export class AreaNode extends SceneNode {
    public role = 'series';
    private dataStore: DataStore;

    constructor(dataStore: DataStore) {
        super();
        this.dataStore = dataStore;
    }

    draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
        const totalCandles = this.dataStore.getAllData().length;
        const { start, end } = timeScale.getVisibleRange(totalCandles);
        const visibleData = this.dataStore.getVisibleData(start, end);

        if (visibleData.length === 0) return;

        ctx.save();
        
        ctx.beginPath();
        const startX = timeScale.indexToX(start);
        const startY = priceScale.priceToY(visibleData[0].close);
        ctx.moveTo(startX, startY);

        for (let i = 1; i < visibleData.length; i++) {
            const x = timeScale.indexToX(start + i);
            const y = priceScale.priceToY(visibleData[i].close);
            ctx.lineTo(x, y);
        }

        // Stroke the line (theme-aware)
        ctx.strokeStyle = options.colors.areaLineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Close area for gradient fill
        const lastX = timeScale.indexToX(start + visibleData.length - 1);
        const bottomY = priceScale.priceToY(priceScale.visibleMin);

        ctx.lineTo(lastX, bottomY);
        ctx.lineTo(startX, bottomY);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, priceScale.priceToY(priceScale.visibleMax), 0, bottomY);
        gradient.addColorStop(0, options.colors.areaGradientStart);
        gradient.addColorStop(1, options.colors.areaGradientEnd);
        
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }
}