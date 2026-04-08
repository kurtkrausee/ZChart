//  TimeScale.ts

export class TimeScale {
  public width: number = 0;
  public candleWidth: number = 10; // Breite einer Kerze in Pixeln
  public scrollOffset: number = 0; // Verschiebung

  constructor() {}

  // Wandelt den Index einer Kerze in einen X-Pixelwert um
  public indexToX(index: number): number {
    return index * this.candleWidth + this.scrollOffset;
  }

  // Wandelt einen X-Pixelwert zurück in einen Index (für Maus-Events)
  public xToIndex(x: number): number {
    return Math.floor((x - this.scrollOffset) / this.candleWidth);
  }

  public getVisibleRange(totalDataCount: number) {
  // Wo fängt das Bild an? (Index)
  const start = Math.max(0, Math.floor(-this.scrollOffset / this.candleWidth));
  
  // Wo hört das Bild auf? (Index)
  const end = Math.min(
    totalDataCount,
    Math.ceil((this.width - this.scrollOffset) / this.candleWidth)
  );
  
  return { start, end };
 }

 /**
   * Export: Wandelt einen Index in einen echten Zeitstempel um (für die Datenbank)
   */
  public indexToTime(index: number, dataArray: any[]): number | null {
    // Runden, falls der Ankerpunkt zwischen zwei Kerzen liegt
    const i = Math.round(index); 
    if (i >= 0 && i < dataArray.length) {
      return dataArray[i].timestamp; // HINWEIS: Hier 'timestamp' ggf. anpassen, je nachdem wie dein K-Line Array heißt (z.B. 'time')
    }
    return null;
  }

  /**
   * Import: Sucht den passenden Index für einen Zeitstempel aus der Datenbank
   */
  public timeToIndex(time: number, dataArray: any[]): number {
    // Sucht die Kerze, die exakt zu dieser Zeit gehört
    const index = dataArray.findIndex(candle => candle.timestamp === time);
    
    // Fallback: Wenn exakte Zeit nicht gefunden wird (z.B. Wochenende), nimm das Ende
    return index !== -1 ? index : dataArray.length - 1; 
  }
}
