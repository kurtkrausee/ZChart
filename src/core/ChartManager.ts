// ChartManager.ts

import { Pane } from './Pane';
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
// NEU: Importiere die neuen Konfigurations-Typen und die Merge-Funktion
import { defaultOptions, mergeOptions } from './ChartOptions';
import type { ChartConfig, DeepPartial } from './ChartOptions';
import { YAxisNode } from '../nodes/YAxisNode';
import { XAxisNode } from '../nodes/XAxisNode';
import { DataStore } from '../data/DataStore';
import { CandlestickNode } from '../nodes/CandlestickNode';

export class ChartManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  
  // NEU: Hier speichern wir die finalen, zusammengeführten Optionen für diese Instanz
  private options: ChartConfig;

  // WICHTIG: Diese Zeile muss oben stehen, damit "this.timeScale" gefunden wird!
  private timeScale: TimeScale = new TimeScale();

  // Aufteilung in X- und Y-Achsen
  private yAxisNode: YAxisNode = new YAxisNode();
  private xAxisNode: XAxisNode = new XAxisNode(); 

  // NEU: Ein spezieller Node für die Candlesticks, der Zugriff auf die Daten hat
  private dataStore: DataStore = new DataStore();
  private candlestickNode: CandlestickNode = new CandlestickNode(this.dataStore);
  
  // NEU: Der Konstruktor akzeptiert nun optionale userOptions für individuelle Themes
  constructor(containerId: string, userOptions?: DeepPartial<ChartConfig>) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} nicht gefunden.`);
    this.container = container;

    // NEU: Standardwerte mit eventuellen Nutzerwerten verschmelzen
    this.options = mergeOptions(defaultOptions, userOptions);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!; // Performance-Boost: Kein Alpha
    this.container.appendChild(this.canvas);

    this.setupResizing();
    this.startRenderLoop();
  }

  // NEU: Methode, um das Theme im laufenden Betrieb zu ändern (z.B. Light/Dark-Mode)
  public applyOptions(newOptions: DeepPartial<ChartConfig>) {
    this.options = mergeOptions(this.options, newOptions);
    // Das Canvas zeichnet sich durch den Render-Loop automatisch mit den neuen Farben neu
  }

  // NEU: Hilfsmethode, damit Panes und Nodes auf die Konfiguration zugreifen können
  public getOptions(): ChartConfig {
    return this.options;
  }

  private setupResizing() {
    const resizeObserver = new ResizeObserver(() => this.updateSize());
    resizeObserver.observe(this.container);
    this.updateSize();
  }

  private updateSize() {
    const rect = this.container.getBoundingClientRect();
    
    // High-DPI Scaling
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;

    // CSS-Größe festlegen
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Context skalieren, damit wir im Code mit "logischen" Pixeln arbeiten können
    this.ctx.scale(this.dpr, this.dpr);
    
    this.render(); // Sofortiger Redraw bei Resize
  }

  public addPane(pane: Pane) {
    this.panes.push(pane);
  }

  private startRenderLoop() {
    const loop = () => {
      this.render();    // Ruft render() auf
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Bereich ohne die rechte Preisachse berechnen (greift jetzt auf this.options zu)
    const chartContentWidth = width - this.options.layout.axisWidth;

    // 1. Hintergrund löschen (komplett)
    this.ctx.fillStyle = this.options.colors.background;
    this.ctx.fillRect(0, 0, width, height);

    // 2. TimeScale über die nutzbare Breite informieren
    this.timeScale.width = chartContentWidth;

    // 3. Vertikales Grid (Zeit)
    const { start: visibleStart, end: visibleEnd } = this.timeScale.getVisibleRange(500);
    this.ctx.strokeStyle = this.options.colors.grid;
    this.ctx.lineWidth = this.options.grid.verticalLines.lineWidth;

    if (this.options.grid.verticalLines.visible) {
      for (let i = visibleStart; i <= visibleEnd; i++) {
        if (i % 10 === 0) {
          const x = this.timeScale.indexToX(i);
          this.ctx.beginPath();
          this.ctx.moveTo(x, 0);
          this.ctx.lineTo(x, height);
          this.ctx.stroke();
        }
      }
    }

    let currentY = 0;

    // 4. Durch jede Pane gehen
    this.panes.forEach(pane => {
      const paneHeight = height * pane.heightWeight;
      pane.priceScale.height = paneHeight;

      // --- Zeichne Preisachse & Hintergrund-Streifen rechts ---
      this.yAxisNode.draw(
        this.ctx,
        paneHeight,
        pane.priceScale,
        width,
        currentY,
        this.options // NEU: Optionen an die AxisNode weitergeben
      );

      // --- Zeichne Zeitachse unten ---
      this.xAxisNode.draw(
        this.ctx,
        chartContentWidth,
        height,
        this.timeScale,
        this.options
    );

      // --- SPEZIFISCHE LOGIK PRO PANE ---
      if (pane.id === 'main') {
        const totalCandles = this.dataStore.getAllData().length;
        const { start, end } = this.timeScale.getVisibleRange(totalCandles);
        const visibleData = this.dataStore.getVisibleData(start, end);

        // Auto-Scaling mit den ECHTEN Kerzen-Daten
        let min = Infinity; let max = -Infinity;
        for (const candle of visibleData) {
          if (candle.high > max) max = candle.high;
          if (candle.low < min) min = candle.low;
        }
        
        // Fallback, falls keine Daten da sind
        if (min === Infinity) { min = 0; max = 100; }
        
        const padding = (max - min) * 0.1;
        pane.priceScale.setRange(min - padding, max + padding);

        // Zeichnen der echten Kerzen (ersetzt die blauen Linien)
        this.ctx.save();
        
        // Clipping-Maske
        this.ctx.beginPath();
        this.ctx.rect(0, currentY, chartContentWidth, paneHeight);
        this.ctx.clip();
        
        // Wir verschieben den Canvas-Nullpunkt temporär nach unten in die aktuelle Pane
        this.ctx.translate(0, currentY);
        
        // Aufruf unseres neuen Pinsels
        this.candlestickNode.draw(this.ctx, this.timeScale, pane.priceScale, this.options);
        
        this.ctx.restore(); // Clipping und Verschiebung aufheben
      }

      // Rahmen um die Pane zur Kontrolle (nur bis zur Achse)
      this.ctx.strokeStyle = this.options.colors.axisLine;
      this.ctx.strokeRect(0, currentY, chartContentWidth, paneHeight);

      currentY += paneHeight;
    });
  }
}