// nodes/YAxisNode.ts

import type { ChartConfig } from '../core/ChartOptions';
import { PriceScale } from '../math/PriceScale';

export class YAxisNode {
  public draw(
    ctx: CanvasRenderingContext2D,
    paneHeight: number,
    priceScale: PriceScale,
    width: number,
    yOffset: number,
    options: ChartConfig
  ) {
    ctx.save();
    
    const axisWidth = options.layout.axisWidth;
    const axisX = width - axisWidth;

    // 1. Hintergrund für den Achsen-Streifen rechts zeichnen
    ctx.fillStyle = options.colors.background;
    ctx.fillRect(axisX, yOffset, axisWidth, paneHeight);
    
    // 2. Vertikale Trennlinie zwischen Chart und Achse
    ctx.strokeStyle = options.colors.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX, yOffset);
    ctx.lineTo(axisX, yOffset + paneHeight);
    ctx.stroke();

    // 3. Texteinstellungen
    ctx.fillStyle = options.colors.text;
    ctx.font = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // 4. Raster & Labels zeichnen
    ctx.strokeStyle = options.colors.grid;
    ctx.lineWidth = options.grid.horizontalLines.lineWidth;

    for (let i = 0; i <= 5; i++) {
      const y = (paneHeight / 5) * i;
      const price = priceScale.yToPrice(y);

      // Rasterlinie NUR im Chart-Bereich (bis axisX), wenn in Optionen aktiviert
      if (options.grid.horizontalLines.visible) {
        ctx.beginPath();
        ctx.moveTo(0, yOffset + y);
        ctx.lineTo(axisX, yOffset + y);
        ctx.stroke();
      }

      // Preis-Label im Achsen-Bereich (Abstand 5px vom Rand)
      ctx.fillText(price.toFixed(2), width - 5, yOffset + y);
    }
    
    ctx.restore();
  }
}