// PriceScale.ts

export class PriceScale {
  public height: number = 0;
  public minPrice: number = 0;
  public maxPrice: number = 100;

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

  /**
   * Setzt die Range (wird für das Auto-Scaling genutzt)
   */
  public setRange(min: number, max: number) {
    this.minPrice = min;
    this.maxPrice = max;
  }

  /**
   * NEU: Zoomt/Staucht die Preisachse manuell
   * deltaY > 0 (Maus runter): Stauchen (Bereich wird größer)
   * deltaY < 0 (Maus hoch): Strecken (Bereich wird kleiner)
   */
  public zoom(deltaY: number) {
    const range = this.maxPrice - this.minPrice;
    // Empfindlichkeit: 0.002 ist ein guter Startwert für weiches Stauchen
    const factor = deltaY * 0.002; 
    
    this.minPrice -= range * factor;
    this.maxPrice += range * factor;

    // Sicherheit: Verhindern, dass der Chart "umklappt"
    if (this.minPrice >= this.maxPrice) {
      this.minPrice = this.maxPrice - 0.01;
    }
  }
}