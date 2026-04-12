// PriceScale.ts

export class PriceScale {
  public height: number = 0;
  public minPrice: number = 0;
  public maxPrice: number = 100;
  public visibleMin: number = 0;
  public visibleMax: number = 100;

  /**
   * Wandelt einen Preis (z.B. 54000.50) in einen Y-Pixelwert um
   */
  public priceToY(price: number): number {
    const range = this.maxPrice - this.minPrice;
    if (range === 0) return 0;
    
    // Y=0 ist oben im Canvas
    return this.height - ((price - this.minPrice) / range) * this.height;
  }

  /**
   * Für Mouse-Interaktion: Pixel zu Preis
   */
  public yToPrice(y: number): number {
    const range = this.maxPrice - this.minPrice;
    if (this.height === 0) return 0;
    return this.minPrice + (1 - y / this.height) * range;
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
  public autoScale(visibleData: any[]) {
    if (visibleData.length === 0) return;

    let highest = -Infinity;
    let lowest = Infinity;

    for (const candle of visibleData) {
        if (candle.high > highest) highest = candle.high;
        if (candle.low < lowest) lowest = candle.low;
    }

    // 10% Platz oben und unten lassen
    const padding = (highest - lowest) * 0.1;

    if (highest !== -Infinity && lowest !== Infinity) {
        this.maxPrice = highest + padding;
        this.minPrice = lowest - padding;
    }
  }

  /**
   * Zoomt/Staucht die Preisachse manuell
   */
  public zoom(deltaY: number) {
    const range = this.maxPrice - this.minPrice;
    const factor = deltaY * 0.002; 
    
    this.minPrice -= range * factor;
    this.maxPrice += range * factor;

    if (this.minPrice >= this.maxPrice) {
      this.minPrice = this.maxPrice - 0.01;
    }
  }
}