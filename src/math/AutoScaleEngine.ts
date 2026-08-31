// math/AutoScaleEngine.ts

import { Pane } from '../core/Pane';

export class AutoScaleEngine {
  
  /**
   * Berechnet die Min/Max Werte der PriceScale basierend auf den sichtbaren Daten.
   */
  public scalePane(pane: Pane, visibleData: any[], startIndex: number, endIndex: number) {
    if (visibleData.length === 0) return;

    if (pane.id === 'main') {
      this.scaleMainChart(pane, visibleData);
    } else if (pane.id.startsWith('rsi')) {
      this.scaleRSI(pane);
    } else if (pane.id.startsWith('volume')) {
      this.scaleVolume(pane, visibleData);
    } else {
      // Das ist der neue, universelle Weg für MACD und alle anderen!
      this.scaleDynamic(pane, startIndex, endIndex);
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
   * Generischer Hook: Fragt alle Nodes im Pane nach ihren Min/Max-Werten!
   */
  private scaleDynamic(pane: Pane, startIndex: number, endIndex: number) {
    let min = Infinity; 
    let max = -Infinity;

    // Wir fragen jedes Node (jede Linie, jedes Histogramm) in diesem Fenster
    pane.nodes.forEach((node: any) => {
        // Hat das Node die neue getMinMax Methode?
        if (typeof node.getMinMax === 'function') {
            const bounds = node.getMinMax(startIndex, endIndex);
            if (bounds) {
                if (bounds.min < min) min = bounds.min;
                if (bounds.max > max) max = bounds.max;
            }
        }
    });

    if (min !== Infinity && max !== -Infinity) {
      if (min === max) {
          pane.priceScale.setRange(min - 1, max + 1);
          return;
      }
      const padding = (max - min) * 0.20;
      pane.priceScale.setRange(min - padding, max + padding);
    } else {
      // Fallback
      pane.priceScale.setRange(0, 100);
    }
  }
}