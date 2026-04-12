// nodes/YAxisNode.ts

import type { ChartConfig } from '../../core/ChartOptions';
import { PriceScale } from '../../math/PriceScale';
import { formatKiloMega, formatPrice } from '../../utils/Formatters'; 

export class YAxisNode {
  public role = 'axis';
  public draw(
    ctx: CanvasRenderingContext2D,
    paneHeight: number,
    priceScale: PriceScale,
    width: number,
    yOffset: number,
    options: ChartConfig,
    paneId: string
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
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= 5; i++) {
      const y = (paneHeight / 5) * i;
      const price = priceScale.yToPrice(y);

      let formattedText: string;
      
      if (paneId === 'volume') {
        formattedText = formatKiloMega(price);
      } else if (paneId === 'rsi') {
        formattedText = price.toFixed(0);
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

      // --- NEUE CLAMPING LOGIK (HIER KORRIGIERT) ---
      let textY = y;
      const padding = 12; // Puffer für die Texthöhe

      // Wir prüfen, ob die relative Position 'y' zu nah am Rand der Pane ist
      if (textY < padding) {
        textY = padding; // Schiebt das oberste Label ein Stück nach unten
      } else if (textY > paneHeight - padding) {
        textY = paneHeight - padding; // Schiebt das unterste Label ein Stück nach oben
      }

      // WICHTIG: yOffset + textY verwenden, damit das Label in der richtigen Pane landet
      ctx.fillText(formattedText, width - 5, yOffset + textY);
    }
    
    ctx.restore();
  }
}