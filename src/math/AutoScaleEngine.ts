// math/AutoScaleEngine.ts

import { Pane } from '../core/Pane';

export class AutoScaleEngine {
  
  /**
   * Berechnet die Min/Max Werte der PriceScale basierend auf den sichtbaren Daten.
   */
  public scalePane(pane: Pane, visibleData: any[]) {
    if (visibleData.length === 0) return;

    switch (pane.id) {
      case 'main':
        this.scaleMainChart(pane, visibleData);
        break;
      case 'rsi':
        this.scaleRSI(pane);
        break;
      case 'volume':
        this.scaleVolume(pane, visibleData);
        break;
      default:
        // Späterer Hook für dynamische/eigene Indikatoren
        break;
    }
  }

  private scaleMainChart(pane: Pane, visibleData: any[]) {
    let min = Infinity; 
    let max = -Infinity;
    for (const candle of visibleData) {
      if (candle.high > max) max = candle.high;
      if (candle.low < min) min = candle.low;
    }
    const padding = (max - min) * 0.1;
    pane.priceScale.setRange(min - padding, max + padding);
  }

  private scaleRSI(pane: Pane) {
    // RSI ist immer fix zwischen 0 und 100
    pane.priceScale.setRange(-5, 105);
  }

  private scaleVolume(pane: Pane, visibleData: any[]) {
    let maxVol = 0;
    for (const c of visibleData) {
      if (c.volume > maxVol) maxVol = c.volume;
    }
    pane.priceScale.setRange(0, maxVol * 1.1); // 10% Platz nach oben
  }
}