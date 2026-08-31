// nodes/HistogramNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class HistogramNode extends SceneNode {
    public role = 'series';
    public id: string = '';
    public name: string = '';
    public zIndex: number = 4;
    public isVisible: boolean = true;
    
    private dataStore: any;
    private dataKey: string;
    private colorUp: string;
    private colorDown: string;
    public opacity: number;

    constructor(dataStore: any, dataKey: string, colorUp: string = '#26a69a', colorDown: string = '#ef5350', opacity: number = 1.0) {
        super();
        this.dataStore = dataStore;
        this.dataKey = dataKey;
        this.colorUp = colorUp;
        this.colorDown = colorDown;
        this.opacity = opacity;
    }

    // NEU: Gibt der AutoScaleEngine die Min/Max Werte zurück!
    public getMinMax(start: number, end: number): { min: number, max: number } | null {
        if (!this.isVisible) return null;
        const data = this.dataStore.getAllData();
        let min = Infinity; let max = -Infinity;
        
        for (let i = start; i <= end; i++) {
            if (!data[i]) continue;
            const val = data[i][this.dataKey];
            if (val !== undefined && val !== null && !isNaN(val)) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
        if (min === Infinity) return null;
        return { min, max };
    }

    draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
        if (!this.isVisible) return;
        const totalData = this.dataStore.getAllData().length;
        const { start, end } = timeScale.getVisibleRange(totalData);
        const visibleData = this.dataStore.getVisibleData(start, end);
        
        const barWidth = timeScale.getBarWidth() * 0.8;
        const zeroY = priceScale.priceToY(0); // Histogramme wachsen von der 0-Linie aus!

        ctx.save();
        ctx.globalAlpha = this.opacity; // Hier verwenden wir die Transparenz

        for (let i = 0; i < visibleData.length; i++) {
            const val = visibleData[i][this.dataKey];
            if (val === undefined || val === null || isNaN(val)) continue;
            
            const x = timeScale.indexToX(start + i);
            const y = priceScale.priceToY(val);
            
            ctx.fillStyle = val >= 0 ? this.colorUp : this.colorDown;
            // Clevere Mathe, damit die Balken nach oben ODER nach unten wachsen
            ctx.fillRect(x - barWidth / 2, Math.min(y, zeroY), barWidth, Math.abs(y - zeroY));
        }
        ctx.restore();
    }
}