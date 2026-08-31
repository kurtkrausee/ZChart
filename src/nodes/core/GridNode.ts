// nodes/GridNode.ts
// Version: 1.2.0 | Updated: 2026-08-18 | By: Agent
// 1.2.0 (AR-Polish 12): vertikaler Grid-Schritt zoomabhaengig (>= ~100 px), statt fix alle 10 Kerzen.
// P4.7: gridVert uses options.colors.gridVert (separate from gridHorz)

import { TimeScale } from '../../math/TimeScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class GridNode {
  public draw(
    ctx: CanvasRenderingContext2D,
    _width: number,
    height: number,
    timeScale: TimeScale,
    options: ChartConfig,
    start: number,
    end: number
  ) {
    ctx.save();
    ctx.lineWidth = 1;

    // Vertikales Grid (P4.7: eigene Farbe gridVert)
    if (options.grid.verticalLines.visible) {
      ctx.strokeStyle = options.colors.gridVert;
      ctx.beginPath();
      // 1.2.0: Schrittweite dynamisch nach Zoom — mindestens ~100 px Abstand
      // (bei candleWidth 10 = alle 10 Kerzen wie bisher; weit herausgezoomt
      // z.B. alle 100 Kerzen statt einem dichten Lattenzaun alle 20 px).
      const cw = Math.max(0.5, timeScale.candleWidth);
      const minPx = options.grid.verticalLines.minSpacingPx ?? 100;
      const STEPS = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
      let step = STEPS[STEPS.length - 1];
      for (const st of STEPS) {
        if (st * cw >= minPx) { step = st; break; }
      }
      for (let i = start; i <= end; i++) {
        if (i % step === 0) {
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