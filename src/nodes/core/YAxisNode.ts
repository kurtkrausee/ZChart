// nodes/YAxisNode.ts

import type { ChartConfig } from '../../core/ChartOptions';
import { PriceScale } from '../../math/PriceScale';
import { formatKiloMega, formatPrice } from '../../utils/Formatters'; // Unsere neuen Helfer

export class YAxisNode {
  public role = 'axis';
  public draw(
    ctx: CanvasRenderingContext2D,
    paneHeight: number,
    priceScale: PriceScale,
    width: number,
    yOffset: number,
    options: ChartConfig,
    paneId: string // NEU: Wir brauchen die ID, um den richtigen Formatter zu wählen
  ) {
    ctx.save();
    
    const axisWidth = options.layout.axisWidth;
    const axisX = width - axisWidth;

    // 1. Hintergrund für den Achsen-Streifen rechts
    ctx.fillStyle = options.colors.background;
    ctx.fillRect(axisX, yOffset, axisWidth, paneHeight);
    
    // 2. Vertikale Trennlinie
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

    // Wir zeichnen 5 Ticks pro Pane
    for (let i = 0; i <= 5; i++) {
      const y = (paneHeight / 5) * i;
      const price = priceScale.yToPrice(y);

      // --- INTELLIGENTE FORMATIERUNG ---
      let formattedText: string;
      
      if (paneId === 'volume') {
        formattedText = formatKiloMega(price);
      } else if (paneId === 'rsi') {
        formattedText = price.toFixed(0); // RSI braucht meist keine Nachkommastellen
      } else {
        formattedText = formatPrice(price, 2);
      }

      // Rasterlinie
      if (options.grid.horizontalLines.visible) {
        ctx.beginPath();
        ctx.moveTo(0, yOffset + y);
        ctx.lineTo(axisX, yOffset + y);
        ctx.stroke();
      }

      // Preis-Label
      ctx.fillText(formattedText, width - 5, yOffset + y);
    }
    
    ctx.restore();
  }
}