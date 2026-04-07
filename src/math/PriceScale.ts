// PriceScale.ts

export class PriceScale {
  public height: number = 0;
  public minPrice: number = 0;
  public maxPrice: number = 100;

  // Wandelt einen Preis (z.B. 54000.50) in einen Y-Pixelwert um
  public priceToY(price: number): number {
    const range = this.maxPrice - this.minPrice;
    if (range === 0) return 0;
    
    // WICHTIG: Im Canvas ist Y=0 oben. 
    // Ein hoher Preis muss also einen kleinen Y-Wert haben.
    return this.height - ((price - this.minPrice) / range) * this.height;
  }

  // Für Mouse-Interaktion: Pixel zu Preis
  public yToPrice(y: number): number {
    const range = this.maxPrice - this.minPrice;
    return this.minPrice + (1 - y / this.height) * range;
  }

  // Setzt die Range (wird später automatisch berechnet)
  public setRange(min: number, max: number) {
    this.minPrice = min;
    this.maxPrice = max;
  }
}