// AxisNode.ts

import { ChartOptions } from '../core/ChartOptions';
import { PriceScale } from '../math/PriceScale';

export class AxisNode {
  constructor() {}

  public drawPriceAxis(ctx: CanvasRenderingContext2D, paneHeight: number, priceScale: PriceScale, width: number, yOffset: number) {
    ctx.save();
    
    const axisWidth = ChartOptions.layout.axisWidth;
    const axisX = width - axisWidth;

    // 1. Hintergrund für den Achsen-Streifen rechts zeichnen
    ctx.fillStyle = ChartOptions.colors.background;
    ctx.fillRect(axisX, yOffset, axisWidth, paneHeight);
    
    // 2. Vertikale Trennlinie zwischen Chart und Achse
    ctx.strokeStyle = ChartOptions.colors.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX, yOffset);
    ctx.lineTo(axisX, yOffset + paneHeight);
    ctx.stroke();

    // 3. Texteinstellungen (WICHTIG!)
    ctx.fillStyle = ChartOptions.colors.text;
    ctx.font = `${ChartOptions.layout.fontSize}px Arial`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle'; // Zentriert den Text vertikal zur Linie

    // 4. Raster & Labels zeichnen
    ctx.strokeStyle = ChartOptions.colors.grid;

    for (let i = 0; i <= 5; i++) {
      const y = (paneHeight / 5) * i;
      const price = priceScale.yToPrice(y);

      // Rasterlinie NUR im Chart-Bereich (bis axisX)
      ctx.beginPath();
      ctx.moveTo(0, yOffset + y);
      ctx.lineTo(axisX, yOffset + y);
      ctx.stroke();

      // Preis-Label im Achsen-Bereich
      // width - 5 gibt uns einen kleinen Abstand zum rechten Rand
      ctx.fillText(price.toFixed(2), width - 5, yOffset + y);
    }
    
    ctx.restore();
  }
}