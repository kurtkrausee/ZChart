// data/DataStore.ts

import sampleData from './ohlcv_sample_5000.json';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number; // NEU: Das Fragezeichen bedeutet "optional"
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
    this.data = sampleData as CandleData[];
  }

  // --- DIE METHODE MUSS HIER REIN (vor die letzte Klammer) ---
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
} // <--- Das ist die finale Klammer der Klasse