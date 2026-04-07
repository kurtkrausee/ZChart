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
}
