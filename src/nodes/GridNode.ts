// nodes/GridNode.ts

import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from '../core/ChartOptions';

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
      for (let i = start; i <= end; i++) {
        // Aktuell alle 10 Kerzen ein Strich (Später dynamisch je nach Zoom)
        if (i % 10 === 0) {
          const x = timeScale.indexToX(i);
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
      }
      ctx.stroke();
    }

    // Horizontales Grid (Preisachse) 
    // (Wird später pro Pane gezeichnet, aber das Fundament steht hier)

    ctx.restore();
  }
}