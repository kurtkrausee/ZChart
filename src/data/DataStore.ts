// data/DataStore.ts

// Vite importiert die JSON-Datei automatisch als JavaScript-Objekt/Array
import sampleData from './ohlcv_sample_5000.json';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class DataStore {
  private data: CandleData[] = [];

  constructor() {
    this.loadRealData();
  }

  public getAllData(): CandleData[] {
    return this.data;
  }

  public getVisibleData(startIndex: number, endIndex: number): CandleData[] {
    const start = Math.max(0, Math.floor(startIndex));
    const end = Math.min(this.data.length - 1, Math.ceil(endIndex));
    return this.data.slice(start, end + 1);
  }

  private loadRealData() {
    // Wir weisen die echten Daten einfach unserem Array zu.
    // WICHTIG: Die JSON-Datei muss zwingend ein Array sein, in dem die Objekte 
    // exakt die Schlüssel aus dem CandleData-Interface haben (time, open, high, low, close, volume).
    this.data = sampleData as CandleData[];
  }
}