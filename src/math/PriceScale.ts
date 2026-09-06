// PriceScale.ts
// Version: 1.7.0 | Updated: 2026-08-18 | By: Agent
// 1.7.0 (AR-Polish 12): labelFormatter — eigenes Tick-Label-Format je Scale.
// ZV10-P2: fixedRange + tickProvider — deklarative Range/Ticks je Pane
//   (ersetzt den paneId-Switch in AutoScaleEngine für rsi/stochastic)

export type YAxisPosition = 'right' | 'left' | 'both';

export class PriceScale {
  public height: number = 0;
  public minPrice: number = 0;
  public maxPrice: number = 100;
  /** false = User hat diese Achse manuell gezoomt/verschoben — Auto-Fit pausiert
   *  nur fuer DIESE Scale (resetYScale/setData reaktivieren). */
  public autoScale: boolean = true;

  // NEU: Diese Werte brauchen wir für den Area-Fill und das Grid
  public visibleMin: number = 0;
  public visibleMax: number = 100;

  /** Logarithmic scale mode (2.4) */
  public isLog: boolean = false;

  /** Percentage mode (2.5): display % change from basePrice */
  public isPercent: boolean = false;
  public basePrice: number = 0;

  /** Y-axis position (2.6) */
  public axisPosition: YAxisPosition = 'right';

  /** P7.2: Lock price-to-bar ratio (price scale zooms with time scale) */
  public lockPriceBarRatio: boolean = false;

  /** P7.2: Hide the Y-axis entirely (scales placement = 'hidden') */
  public hideAxis: boolean = false;

  /**
   * ZV10-P2: Feste Y-Range für diese Scale. Gesetzt → AutoScaleEngine setzt
   * exakt diese Range statt eines Daten-Fits (Oszillatoren: RSI/Stoch -5..105).
   * Manuelles Y-Zoomen/Pannen bleibt möglich (AutoScale ist dann ohnehin aus).
   */
  public fixedRange: { min: number; max: number } | null = null;

  /**
   * ZV10-P2: Eigene Tick-Werte (echte Preise) für diese Scale. Gesetzt →
   * TickEngine/YAxisNode rendern exakt diese Werte (auf sichtbare Range
   * gefiltert) statt der Nice-Ticks. Bsp. RSI: () => [0, 20, 50, 80, 100].
   */
  public tickProvider: ((scale: PriceScale) => number[]) | null = null;

  /**
   * Eigener Label-Formatter
   * fuer die Achsen-Ticks dieser Scale (z.B. „50 %", „1.960"). Gesetzt → YAxisNode
   * nutzt ihn statt Preis-/Prozent-Format. Bewusst nur fuer Ticks (Crosshair-
   * Label bleibt Preisformat).
   */
  public labelFormatter: ((value: number) => string) | null = null;

  /**
   * Wandelt einen Preis (z.B. 54000.50) in einen Y-Pixelwert um
   */
  public priceToY(price: number): number {
    if (this.isLog) return this.priceToYLog(price);
    const range = this.maxPrice - this.minPrice;
    if (range === 0) return 0;
    return this.height - ((price - this.minPrice) / range) * this.height;
  }

  /**
   * Für Mouse-Interaktion: Pixel zu Preis
   */
  public yToPrice(y: number): number {
    if (this.isLog) return this.yToPriceLog(y);
    const range = this.maxPrice - this.minPrice;
    if (this.height === 0) return 0;
    return this.minPrice + (1 - y / this.height) * range;
  }

  private priceToYLog(price: number): number {
    const safeMin = Math.max(this.minPrice, 1e-10);
    const safeMax = Math.max(this.maxPrice, safeMin + 1e-10);
    const safePrice = Math.max(price, 1e-10);
    const logMin = Math.log(safeMin);
    const logMax = Math.log(safeMax);
    const logRange = logMax - logMin;
    if (logRange === 0) return 0;
    return this.height - ((Math.log(safePrice) - logMin) / logRange) * this.height;
  }

  private yToPriceLog(y: number): number {
    if (this.height === 0) return 0;
    const safeMin = Math.max(this.minPrice, 1e-10);
    const safeMax = Math.max(this.maxPrice, safeMin + 1e-10);
    const logMin = Math.log(safeMin);
    const logMax = Math.log(safeMax);
    return Math.exp(logMin + (1 - y / this.height) * (logMax - logMin));
  }

  /**
   * Setzt die Range (wird für das Auto-Scaling genutzt)
   */
  public setRange(min: number, max: number) {
    this.minPrice = min;
    this.maxPrice = max;
    this.visibleMin = min;
    this.visibleMax = max;
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

  /**
   * Zoomt die Preisachse mit Anker-Preis (Mausrad Y-Zoom, TradingView-Style).
   * Der Preis unter dem Mauszeiger bleibt pixelgenau fixiert.
   */
  public zoomAnchored(deltaY: number, anchorPrice?: number) {
    const range = this.maxPrice - this.minPrice;
    const factor = deltaY * 0.002;
    const anchor = anchorPrice ?? (this.minPrice + range / 2);
    // Anteile des Anker-Preises in der Range berechnen (0=bottom, 1=top)
    const t = (anchor - this.minPrice) / range;
    const newRange = range * (1 + factor * 2);
    const minRange = range * 0.02; // max. 50x Zoom
    const maxRange = range * 50;   // max. 50x Herausgezoomt
    const clampedRange = Math.max(minRange, Math.min(maxRange, newRange));
    this.minPrice = anchor - t * clampedRange;
    this.maxPrice = anchor + (1 - t) * clampedRange;
  }

  /**
   * ZT-P2: Faktor-basierter Anker-Zoom für Pinch-Gesten. `rangeFactor`
   * multipliziert die sichtbare Range (>1 = herauszoomen, <1 = hineinzoomen);
   * der Anker-Preis bleibt pixelgenau fixiert. Clamp identisch zu
   * `zoomAnchored`: 2%..5000% der aktuellen Range pro Aufruf.
   */
  public zoomFactorAnchored(rangeFactor: number, anchorPrice?: number): void {
    if (!Number.isFinite(rangeFactor) || rangeFactor <= 0) return;
    const range = this.maxPrice - this.minPrice;
    if (range <= 0) return;
    const anchor = anchorPrice ?? (this.minPrice + range / 2);
    const t = (anchor - this.minPrice) / range;
    const clampedRange = Math.max(range * 0.02, Math.min(range * 50, range * rangeFactor));
    this.minPrice = anchor - t * clampedRange;
    this.maxPrice = anchor + (1 - t) * clampedRange;
  }

  /**
   * Verschiebt die Preisachse vertikal (Pan) um deltaPixels.
   * Positive Werte = Chart nach oben schieben (Preise steigen sichtbar).
   */
  public pan(deltaPixels: number) {
    const range = this.maxPrice - this.minPrice;
    if (this.height === 0) return;
    const pricePerPixel = range / this.height;
    const priceDelta = deltaPixels * pricePerPixel;
    this.minPrice += priceDelta;
    this.maxPrice += priceDelta;
  }
}