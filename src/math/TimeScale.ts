//  TimeScale.ts
// Version: 1.3.0 | Updated: 2026-07-29 | By: Agent

export class TimeScale {
  public width: number = 0;
  public candleWidth: number = 10; // Breite einer Kerze in Pixeln
  public scrollOffset: number = 0; // Verschiebung

  constructor() {}

  // Wandelt den Index einer Kerze in einen X-Pixelwert um
  public indexToX(index: number): number {
    return index * this.candleWidth + this.scrollOffset;
  }

  // Wandelt einen X-Pixelwert zurück in einen präzisen Float-Index
  // (für smooth dragging von Zeichenwerkzeug-Ankerpunkten)
  public xToIndex(x: number): number {
    return (x - this.scrollOffset) / this.candleWidth;
  }

  // Ganzzahliger Index – snap auf nächste Kerze (für Crosshair, Daten-Lookup)
  public xToIndexSnapped(x: number): number {
    return Math.round((x - this.scrollOffset) / this.candleWidth);
  }

  /**
   * ZT-P2: Zoomt um einen Fokuspunkt (X-Pixel) — der Daten-Index unter dem
   * Fokuspunkt bleibt pixelgenau fixiert (Wheel-Zoom- und Pinch-Anker).
   * `factor` > 1 = hineinzoomen. candleWidth wird auf [minWidth, maxWidth]
   * geklemmt (Default identisch zum bisherigen Wheel-Zoom: 1..100).
   */
  public zoomAroundX(focalX: number, factor: number, minWidth: number = 1, maxWidth: number = 100): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const indexUnderFocal = this.xToIndex(focalX);
    this.candleWidth = Math.max(minWidth, Math.min(this.candleWidth * factor, maxWidth));
    this.scrollOffset = focalX - indexUnderFocal * this.candleWidth;
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
    if (dataArray.length === 0) return null;
    if (i >= 0 && i < dataArray.length) {
      return dataArray[i].timestamp;
    }
    // Future index: extrapolate using the interval between last two candles
    if (i >= dataArray.length && dataArray.length >= 2) {
      const last = dataArray[dataArray.length - 1].timestamp;
      const prev = dataArray[dataArray.length - 2].timestamp;
      const intervalMs = last - prev;
      const stepsAhead = i - (dataArray.length - 1);
      return last + stepsAhead * intervalMs;
    }
    if (i >= dataArray.length) return dataArray[dataArray.length - 1].timestamp;
    return null;
  }

  /**
   * Import: Sucht den passenden Index für einen Zeitstempel aus der Datenbank.
   * Uses binary search to find closest timestamp match (handles timeframe switches).
   */
  public timeToIndex(time: number, dataArray: any[]): number {
    if (!dataArray.length) return 0;

    // Future timestamp: extrapolate index beyond last candle
    const last = dataArray[dataArray.length - 1].timestamp;
    if (time > last && dataArray.length >= 2) {
      const prev = dataArray[dataArray.length - 2].timestamp;
      const intervalMs = last - prev;
      if (intervalMs > 0) {
        return (dataArray.length - 1) + (time - last) / intervalMs;
      }
    }

    // R-perf-100k P3-Quickfix (2026-05-20): KEIN findIndex mehr — das ist
    // O(n) und bei 100k Bars × 1795 Trades × 2 Lookups = 360M Vergleiche
    // pro Frame = ~150ms. Stattdessen direkt Binary Search (O(log n)),
    // die zusätzlich exakte Treffer findet (lo - 1 ist 'closer' bei diff=0).
    let lo = 0, hi = dataArray.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dataArray[mid].timestamp < time) lo = mid + 1;
      else hi = mid;
    }
    // lo is now the first index >= time; check if lo or lo-1 is closer
    if (lo === 0) return 0;
    if (lo >= dataArray.length) return dataArray.length - 1;
    const diffBefore = Math.abs(dataArray[lo - 1].timestamp - time);
    const diffAfter = Math.abs(dataArray[lo].timestamp - time);
    return diffBefore <= diffAfter ? lo - 1 : lo;
  }
}
