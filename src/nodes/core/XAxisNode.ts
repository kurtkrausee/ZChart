// nodes/XAxisNode.ts

import type { ChartConfig } from '../../core/ChartOptions';
import { TimeScale } from '../../math/TimeScale';

export class XAxisNode {
  public role = 'axis';
  public draw(
    ctx: CanvasRenderingContext2D,
    chartContentWidth: number, 
    fullHeight: number,        
    timeScale: TimeScale,
    options: ChartConfig,
    dataArray: any[] // <--- NEU: Die Achse braucht die echten Kerzendaten!
  ) {
    ctx.save();
    
    const axisHeight = options.layout.axisHeight;
    const axisY = fullHeight - axisHeight; 

    // 1. Hintergrund
    ctx.fillStyle = options.colors.background;
    ctx.fillRect(0, axisY, chartContentWidth, axisHeight);
    
    // 2. Trennlinie
    ctx.strokeStyle = options.colors.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(chartContentWidth, axisY);
    ctx.stroke();

    // 3. Texteinstellungen
    ctx.fillStyle = options.colors.text;
    ctx.font = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';

    // 4. Zeit-Labels zeichnen (Dynamisch & Echte Zeiten)
    // Wir nutzen hier die echte Länge der Daten statt der harten '500'
    const { start, end } = timeScale.getVisibleRange(dataArray.length); 
    
    // ==========================================
    // Dynamische Schrittweite (wie im Grid)
    // ==========================================
    const visibleCandles = end - start;
    let step = 10;
    if (visibleCandles > 1000) step = 200;
    else if (visibleCandles > 500) step = 100;
    else if (visibleCandles > 200) step = 50;
    else if (visibleCandles > 100) step = 20;
    else if (visibleCandles > 50) step = 10;
    else step = 5;
    
    for (let i = start; i <= end; i++) {
      if (i % step === 0) {
        const x = timeScale.indexToX(i);
        
        // Echte Zeit aus den Daten holen
        const time = timeScale.indexToTime(i, dataArray);
        let labelText = '';
        
        if (time) {
            // Timestamp (meist in Millisekunden) in ein JS-Datum umwandeln
            // Falls deine API Sekunden schickt, musst du hier (time * 1000) machen
            const date = new Date(time); 
            
            // Smarte Formatierung: 
            // Weit rausgezoomt = Datum (z.B. 24.05.23) | Nah dran = Uhrzeit (z.B. 14:30)
            if (visibleCandles > 150) {
                labelText = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
            } else {
                labelText = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        if (labelText) {
            ctx.fillText(labelText, x, axisY + (axisHeight / 2));
        }
      }
    }
    
    ctx.restore();
  }
}