// src/math/PriceScale.ts

export class PriceScale {
  public height: number = 0;
  public minPrice: number = 0;
  public maxPrice: number = 100;
  public visibleMin: number = 0;
  public visibleMax: number = 100;
  
  // Interaktive Steuerung
  public isAutoScaled: boolean = true;
  public zoom: number = 1; // 1 = Normal, 0.5 = Rausgezoomt, 2 = Eingezoomt
  public scrollOffset: number = 0; // Für das vertikale Verschieben

  /**
   * Wandelt einen Preis in einen Y-Pixelwert um (Berücksichtigt Stauchung!)
   */
  public priceToY(price: number): number {
    const range = (this.maxPrice - this.minPrice) / this.zoom;
    if (range === 0) return 0;
    
    // Zentrum finden und Range mit Zoom anpassen
    const center = (this.maxPrice + this.minPrice) / 2 + this.scrollOffset;
    const newMin = center - range / 2;
    const newMax = center + range / 2;
    
    return this.height - ((price - newMin) / (newMax - newMin)) * this.height;
  }

  /**
   * Für Mouse-Interaktion: Pixel zurück zu Preis
   */
  public yToPrice(y: number): number {
    const range = (this.maxPrice - this.minPrice) / this.zoom;
    if (this.height === 0) return 0;
    
    const center = (this.maxPrice + this.minPrice) / 2 + this.scrollOffset;
    const newMin = center - range / 2;
    
    return newMin + (1 - y / this.height) * range;
  }

  public setRange(min: number, max: number) {
    this.minPrice = min;
    this.maxPrice = max;
    this.visibleMin = min;
    this.visibleMax = max;
  }

  // ==========================================
  // AUTO-SCALING (Gegen flache Linien & leere Screens)
  // ==========================================
  public autoScale(visibleData: any[], isVolume: boolean = false) {
    if (visibleData.length === 0) return;

    let highest = -Infinity;
    let lowest = Infinity;

    for (const candle of visibleData) {
        if (isVolume) {
            if (candle.volume > highest) highest = candle.volume;
            lowest = 0; 
        } else {
            if (candle.high > highest) highest = candle.high;
            if (candle.low < lowest) lowest = candle.low;
        }
    }

    const padding = (highest - lowest) * 0.1;

    if (highest !== -Infinity && lowest !== Infinity) {
        this.maxPrice = highest + padding;
        this.minPrice = isVolume ? 0 : lowest - padding;
    }
  }
}