// nodes/GridNode.ts

import { TimeScale } from '../../math/TimeScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class GridNode {
  public draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeScale: TimeScale,
    options: ChartConfig,
    start: number,
    end: number
  ) {
    ctx.save();
    ctx.strokeStyle = options.colors.grid;
    ctx.lineWidth = 1;

    // Vertikales Grid (Zeitachse)
    if (options.grid.verticalLines.visible) {
      ctx.beginPath();

      // ==========================================
      // NEU: Dynamische Schrittweite (Zoom-Level)
      // ==========================================
      const visibleCandles = end - start;
      let step = 10;

      // Je weiter wir herauszoomen (viele Kerzen sichtbar), 
      // desto größer wird der Abstand zwischen den vertikalen Linien.
      if (visibleCandles > 1000) {
          step = 200;
      } else if (visibleCandles > 500) {
          step = 100;
      } else if (visibleCandles > 200) {
          step = 50;
      } else if (visibleCandles > 100) {
          step = 20;
      } else if (visibleCandles > 50) {
          step = 10;
      } else {
          step = 5; // Sehr nah reingezoomt
      }

      for (let i = start; i <= end; i++) {
        // Wir nutzen jetzt den dynamischen 'step' anstelle der starren 10
        if (i % step === 0) {
          const x = timeScale.indexToX(i);
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
      }
      ctx.stroke();
    }
  
    ctx.restore();
  }
}