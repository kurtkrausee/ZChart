// data/DataStore.ts

import sampleData from './ohlcv_sample_5000.json';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number; 
}

export class DataStore {
  private data: CandleData[] = [];

  constructor() {
    this.loadRealData();
  }

  public getAllData(): CandleData[] {
    return this.data;
  }

  // ==========================================
  // NEU: Überschreibt die Daten komplett (für Binance/Ticker-Suche)
  // ==========================================
  public setData(newData: CandleData[]) {
    this.data = newData;
  }

  public getVisibleData(startIndex: number, endIndex: number): CandleData[] {
    const start = Math.max(0, Math.floor(startIndex));
    const end = Math.min(this.data.length - 1, Math.ceil(endIndex));
    return this.data.slice(start, end + 1);
  }

  /**
   * Verarbeitet einen einkommenden Live-Tick über WebSocket.
   * Aktualisiert die letzte Kerze oder fügt eine neue hinzu.
   */
  public updateTick(tick: CandleData) {
    if (this.data.length === 0) {
        this.data.push(tick);
        return;
    }

    const lastCandle = this.data[this.data.length - 1];

    // Wenn der Tick den gleichen Zeitstempel hat wie unsere letzte Kerze,
    // updaten wir einfach die Werte (High/Low ausweiten, Close anpassen).
    if (tick.timestamp === lastCandle.timestamp) {
        lastCandle.close = tick.close;
        lastCandle.high = Math.max(lastCandle.high, tick.high);
        lastCandle.low = Math.min(lastCandle.low, tick.low);
        
        // Hinweis: Je nachdem, ob dein Server "kumuliertes Volumen" 
        // oder "Tick-Volumen" schickt, wird das hier überschrieben oder addiert (+).
        // Standardmäßig überschreiben wir es mit dem neuesten Wert vom Server:
        lastCandle.volume = tick.volume; 
    } 
    // Wenn die Zeit des Ticks größer ist, ist eine neue Kerze angebrochen!
    else if (tick.timestamp > lastCandle.timestamp) {
        this.data.push(tick);
    }
  }

  private loadRealData() {
    this.data = sampleData as CandleData[];
  }

  public calculateRSI(period: number = 14) {
    const data = this.data;
    if (data.length <= period) return;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i].close - data[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    data[period].rsi = 100 - (100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i].close - data[i - 1].close;
      const currentGain = diff >= 0 ? diff : 0;
      const currentLoss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

      data[i].rsi = 100 - (100 / (1 + avgGain / avgLoss));
    }
  }

   /**
   * Fügt historische Kerzen VORNE an das Array an (für Infinite Scroll).
   * @returns Die Anzahl der hinzugefügten Kerzen (wichtig für die Offset-Korrektur)
   */
  public prependData(historicalData: any[]): number {
      if (!historicalData || historicalData.length === 0) return 0;
      
      // Die neuen alten Daten vorne anfügen
      this.data = [...historicalData, ...this.data];
      
      return historicalData.length;
  }
}