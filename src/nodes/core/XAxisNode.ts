// nodes/XAxisNode.ts

import type { ChartConfig } from '../../core/ChartOptions';
import { TimeScale } from '../../math/TimeScale';

export class XAxisNode {
  public role = 'axis';
  public draw(
    ctx: CanvasRenderingContext2D,
    chartContentWidth: number, // Breite ohne die rechte Preisachse
    fullHeight: number,        // Gesamthöhe des Canvas
    timeScale: TimeScale,
    options: ChartConfig
  ) {
    ctx.save();
    
    const axisHeight = options.layout.axisHeight;
    const axisY = fullHeight - axisHeight; // Start-Y für die Leiste unten

    // 1. Hintergrund für den unteren Streifen zeichnen
    ctx.fillStyle = options.colors.background;
    ctx.fillRect(0, axisY, chartContentWidth, axisHeight);
    
    // 2. Horizontale Trennlinie zwischen Chart und Zeitachse
    ctx.strokeStyle = options.colors.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(chartContentWidth, axisY);
    ctx.stroke();

    // 3. Texteinstellungen
    ctx.fillStyle = options.colors.text;
    ctx.font = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
    ctx.textAlign = 'center'; // Text mittig unter dem X-Wert zentrieren
    ctx.textBaseline = 'middle';

    // 4. Zeit-Labels zeichnen (synchron zum Grid im ChartManager)
    const { start, end } = timeScale.getVisibleRange(500); 
    
    for (let i = start; i <= end; i++) {
      if (i % 10 === 0) { // Jeden 10. Index beschriften
        const x = timeScale.indexToX(i);
        
        // Dummy-Label (wird später durch echte Timestamps ersetzt)
        const labelText = `Tag ${i}`; 
        
        // Label vertikal mittig in der Achse platzieren
        ctx.fillText(labelText, x, axisY + (axisHeight / 2));
      }
    }
    
    ctx.restore();
  }
}