// ChartManager.ts

import { Pane } from './Pane';
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import { defaultOptions, mergeOptions } from './ChartOptions';
import type { ChartConfig, DeepPartial } from './ChartOptions';
import { YAxisNode } from '../nodes/YAxisNode';
import { XAxisNode } from '../nodes/XAxisNode';
import { DataStore } from '../data/DataStore';
import { CandlestickNode } from '../nodes/CandlestickNode';
import { InputManager } from '../input/InputManager';
import { CrosshairNode } from '../nodes/CrosshairNode';

export class ChartManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  private isAutoScaling: boolean = true;
  
  // Geändert auf public, damit der InputManager (via Interface) darauf zugreifen kann
  public options: ChartConfig;

  // Mathematik & Daten
  private timeScale: TimeScale = new TimeScale();
  private dataStore: DataStore = new DataStore();

  // Rendering-Nodes
  private yAxisNode: YAxisNode = new YAxisNode();
  private xAxisNode: XAxisNode = new XAxisNode(); 
  private candlestickNode: CandlestickNode = new CandlestickNode(this.dataStore);
  private crosshairNode: CrosshairNode = new CrosshairNode(); // NEU

  // Interaktion
  private inputManager!: InputManager;
  private mousePos: { x: number, y: number } | null = null;
  

  constructor(containerId: string, userOptions?: DeepPartial<ChartConfig>) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} nicht gefunden.`);
    this.container = container;

    this.container.innerHTML = '';

    this.options = mergeOptions(defaultOptions, userOptions);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.container.appendChild(this.canvas);

    this.setupResizing();
    this.startRenderLoop();

    // 5. InputManager bekommt jetzt "this" (den ganzen Manager)
    this.inputManager = new InputManager(
      this.canvas, 
      this.timeScale, 
      this 
    );
  }

  // --- PUBLIC API ---

  public addPane(pane: Pane) {
    this.panes.push(pane);
  }

  public applyOptions(newOptions: DeepPartial<ChartConfig>) {
    this.options = mergeOptions(this.options, newOptions);
  }

  public getOptions(): ChartConfig {
    return this.options;
  }

  /**
   * Wird vom InputManager aufgerufen, wenn an der Preisachse gezogen wird
   */
  public zoomPrice(deltaY: number) {
    const mainPane = this.panes.find(p => p.id === 'main');
    if (mainPane) {
      this.isAutoScaling = false; 
      mainPane.priceScale.zoom(deltaY);
    }
  }

  /**
   * Wird vom InputManager aufgerufen, um die Fadenkreuz-Position zu setzen
   */
  public setMousePos(x: number | null, y: number | null) {
    if (x === null || y === null) {
      this.mousePos = null;
    } else {
      this.mousePos = { x, y };
    }
  }

  // --- CORE ENGINE ---

  private setupResizing() {
    const resizeObserver = new ResizeObserver(() => this.updateSize());
    resizeObserver.observe(this.container);
    this.updateSize();
  }

  private updateSize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
    this.render();
  }

  private startRenderLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /**
   * Hilfsfunktion für Pane-Erkennung
   */
  private getPaneAtY(y: number): { pane: Pane, localY: number } | null {
    let accumulatedY = 0;
    const logicalHeight = this.canvas.height / this.dpr;
    for (const pane of this.panes) {
      const paneHeight = logicalHeight * pane.heightWeight;
      if (y >= accumulatedY && y <= accumulatedY + paneHeight) {
        return { pane, localY: y - accumulatedY };
      }
      accumulatedY += paneHeight;
    }
    return null;
  }

  private render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const chartContentWidth = width - this.options.layout.axisWidth;

    // 1. Hintergrund löschen
    this.ctx.fillStyle = this.options.colors.background;
    this.ctx.fillRect(0, 0, width, height);

    this.timeScale.width = chartContentWidth;

    // 2. Vertikales Grid
    const totalDataCount = this.dataStore.getAllData().length;
    const { start: visibleStart, end: visibleEnd } = this.timeScale.getVisibleRange(totalDataCount);
    
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

    // 3. Panes zeichnen
    this.panes.forEach(pane => {
      const paneHeight = height * pane.heightWeight;
      pane.priceScale.height = paneHeight;

      this.yAxisNode.draw(this.ctx, paneHeight, pane.priceScale, width, currentY, this.options);

      if (pane.id === 'main') {
        if (this.isAutoScaling) {
          const visibleData = this.dataStore.getVisibleData(visibleStart, visibleEnd);
          let min = Infinity; let max = -Infinity;
          for (const candle of visibleData) {
            if (candle.high > max) max = candle.high;
            if (candle.low < min) min = candle.low;
          }
          if (min === Infinity) { min = 0; max = 100; }
          else {
            const padding = (max - min) * 0.1;
            pane.priceScale.setRange(min - padding, max + padding);
          }
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, currentY, chartContentWidth, paneHeight);
        this.ctx.clip();
        this.ctx.translate(0, currentY);
        this.candlestickNode.draw(this.ctx, this.timeScale, pane.priceScale, this.options);
        this.ctx.restore();
      }

      this.ctx.strokeStyle = this.options.colors.axisLine;
      this.ctx.strokeRect(0, currentY, chartContentWidth, paneHeight);
      currentY += paneHeight;
    });

    // 4. Zeitachse (X)
    this.xAxisNode.draw(this.ctx, chartContentWidth, height, this.timeScale, this.options);

    // 5. Crosshair & Labels zeichnen (Ausgelagert in CrosshairNode)
    if (this.mousePos) {
      this.crosshairNode.draw(
        this.ctx,
        this.mousePos,
        chartContentWidth,
        height,
        this.timeScale,
        (y) => this.getPaneAtY(y), // Wir geben die Pane-Suche als "Auftrag" mit
        this.options
      );
    }
  }
}