// nodes/LineSeriesNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class LineSeriesNode extends SceneNode {
  public role = 'series';

  // NEU: Diese Eigenschaften werden vom Object Tree und der API genutzt
  public id: string = '';
  public name: string = '';
  public zIndex: number = 0;
  public isVisible: boolean = true;
  
  private dataStore: any;
  private dataKey: string;
  private color: string;
  private lineWidth: number;

  constructor(
    dataStore: any,
    dataKey: string,
    color: string = '#2196F3',
    lineWidth: number = 2
  ) {
    super();
  
    this.dataStore = dataStore;
    this.dataKey = dataKey;
    this.color = color;
    this.lineWidth = lineWidth;
  }

  /**
   * Wird von der AutoScaleEngine aufgerufen, um die Y-Achse perfekt anzupassen
   */
  public getMinMax(start: number, end: number): { min: number, max: number } | null {
    if (!this.isVisible) return null;
    
    const data = this.dataStore.getAllData();
    let min = Infinity;
    let max = -Infinity;

    for (let i = start; i <= end; i++) {
      const candle = data[i];
      if (!candle) continue;
      
      const val = candle[this.dataKey];
      // Nur gültige Zahlen berücksichtigen
      if (val !== undefined && val !== null && !isNaN(val)) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    if (min === Infinity) return null;
    return { min, max };
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    // NEU: Wenn die Linie unsichtbar geschaltet ist, sofort abbrechen!
    if (!this.isVisible) return

    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();

    let firstPoint = true;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const val = (candle as any)[this.dataKey]; // Type-Cast auf any, um dynamisch zuzugreifen

      if (val === undefined || val === null) continue;

      const x = timeScale.indexToX(start + i);
      const y = priceScale.priceToY(val);

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }
}