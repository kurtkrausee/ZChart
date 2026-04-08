// nodes/CrosshairNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export class CrosshairNode {
  public draw(
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    chartContentWidth: number,
    height: number,
    timeScale: TimeScale,
    getPaneAtY: (y: number) => { pane: any; localY: number } | null,
    options: ChartConfig
  ) {
    const { x, y } = mousePos;
    const axisWidth = options.layout.axisWidth;

    // --- SNAPPING LOGIK ---
    // indexToX gibt die linke Kante. + candleWidth / 2 schiebt uns exakt in die Mitte!
    const index = timeScale.xToIndex(x);
    
    const snappedX = timeScale.indexToX(index);

    ctx.save();
    
    // Linien-Style
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#9194a3';
    ctx.lineWidth = 1;

    // 1. Vertikale Linie (Zeit)
    ctx.beginPath();
    ctx.moveTo(snappedX, 0);
    ctx.lineTo(snappedX, height);
    ctx.stroke();

    // 2. Horizontale Linie (Preis) - nur im Chart-Bereich
    if (x <= chartContentWidth) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartContentWidth, y);
      ctx.stroke();
    }

    // --- LABELS (TAGS) ---
    ctx.setLineDash([]); 
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Preis-Label rechts
    const paneInfo = getPaneAtY(y);
    if (paneInfo) {
      const price = paneInfo.pane.priceScale.yToPrice(paneInfo.localY);
      const priceText = price.toFixed(2);
      
      this.drawLabel(ctx, priceText, chartContentWidth + axisWidth / 2, y, axisWidth, 20);
    }

    // Zeit-Label unten
    const timeText = `Tag ${index}`;
    const textWidth = ctx.measureText(timeText).width + 12;
    this.drawLabel(ctx, timeText, snappedX, height - 10, textWidth, 20);

    ctx.restore();
  }

  private drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = '#363a45';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
  }
}