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
        this.scaleDynamic(pane, visibleData);
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

  /**
   * Generischer Hook für alle unbekannten/eigenen Indikatoren.
   * Sucht in den Daten automatisch nach dem Schlüssel, der der pane.id entspricht.
   */
  private scaleDynamic(pane: Pane, visibleData: any[]) {
    let min = Infinity; 
    let max = -Infinity;
    const dataKey = pane.id; // z.B. 'macd', 'atr', 'momentum'

    for (const candle of visibleData) {
      // Wir greifen dynamisch auf den Wert zu (z.B. candle['macd'])
      const value = candle[dataKey]; 
      
      if (value !== undefined && value !== null) {
        if (value > max) max = value;
        if (value < min) min = value;
      }
    }

    // Wenn wir gültige Daten gefunden haben, skalieren wir
    if (min !== Infinity && max !== -Infinity) {
      // Wenn min und max exakt gleich sind (z.B. flache Linie), brauchen wir künstliches Padding
      if (min === max) {
          pane.priceScale.setRange(min - 1, max + 1);
          return;
      }
      
      const padding = (max - min) * 0.1; // 10% Luft oben und unten
      pane.priceScale.setRange(min - padding, max + padding);
    } else {
      // Fallback, falls die Daten (noch) nicht da sind
      pane.priceScale.setRange(0, 100);
    }
  }
}