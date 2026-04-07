// ChartManager.ts

import { Pane } from './Pane';
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import { ChartOptions } from './ChartOptions';
import { AxisNode } from '../nodes/AxisNode';

export class ChartManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  // WICHTIG: Diese Zeile muss oben stehen, damit "this.timeScale" gefunden wird!
  private timeScale: TimeScale = new TimeScale();
  private axisNode: AxisNode = new AxisNode(); // <-- NEU: Hier erstellen wir die AxisNode-Instanz

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} nicht gefunden.`);
    this.container = container;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!; // Performance-Boost: Kein Alpha
    this.container.appendChild(this.canvas);

    this.setupResizing();
    this.startRenderLoop();
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
    // Hier holen wir uns die aktuelle Größe des Canvas
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 1. Hintergrund löschen
    this.ctx.fillStyle = ChartOptions.colors.background;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Vertikales Grid (Zeit) - Geht über die volle Höhe
    const { start: visibleStart, end: visibleEnd } = this.timeScale.getVisibleRange(500);
    this.ctx.strokeStyle = ChartOptions.colors.grid;
    this.ctx.lineWidth = 1;

    for (let i = visibleStart; i <= visibleEnd; i++) {
      if (i % 10 === 0) {
        const x = this.timeScale.indexToX(i);
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();
      }
    }

    let currentY = 0;

    // 3. Durch jede Pane gehen und zeichnen
    this.panes.forEach(pane => {
      const paneHeight = height * pane.heightWeight; // Jetzt ist paneHeight definiert
      // Scale über aktuelle Höhe informieren
      pane.priceScale.height = paneHeight;

      // --- Horizontales Grid (Preise) & Labels pro Pane ---
      this.axisNode.drawPriceAxis(
        this.ctx,
        paneHeight,
        pane.priceScale,
        width,
        currentY
      );

      // --- SPEZIFISCHE LOGIK PRO PANE ---
      if (pane.id === 'main') {
        const totalCandles = 500;
        const { start, end } = this.timeScale.getVisibleRange(totalCandles);

        // --- AUTO-SCALING LOGIK START ---
        let min = Infinity; let max = -Infinity;

        for (let i = start; i <= end; i++) {
          const pHigh = 50 + Math.sin(i * 0.1) * 30;
          const pLow = pHigh - 10;
          if (pHigh > max) max = pHigh; if (pLow < min) min = pLow;
        }

        const padding = (max - min) * 0.1;
        pane.priceScale.setRange(min - padding, max + padding);
        // --- AUTO-SCALING LOGIK ENDE ---

        this.ctx.strokeStyle = '#3b99fc';
        for (let i = start; i <= end; i++) {
          const x = this.timeScale.indexToX(i);
          const yStart = pane.priceScale.priceToY(50 + Math.sin(i * 0.1) * 30);
          const yEnd = pane.priceScale.priceToY(50 + Math.sin(i * 0.1) * 30 - 10);

          this.ctx.beginPath();
          this.ctx.moveTo(x, currentY + yStart);
          this.ctx.lineTo(x, currentY + yEnd);
          this.ctx.stroke();
        }
      }

      // Rahmen um die Pane zur Kontrolle
      this.ctx.strokeStyle = ChartOptions.colors.axisLine;
      this.ctx.strokeRect(0, currentY, width, paneHeight);

      // Y-Position für die nächste Pane nach unten schieben
      currentY += paneHeight;
    }); // <--- HIER schließt die forEach-Schleife korrekt!
  }
}