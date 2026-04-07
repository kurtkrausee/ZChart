// core/ChartManager.ts

import { Pane } from './Pane';
import { TimeScale } from '../math/TimeScale';
import { defaultOptions, mergeOptions } from './ChartOptions';
import type { ChartConfig, DeepPartial } from './ChartOptions';
import { YAxisNode } from '../nodes/YAxisNode';
import { XAxisNode } from '../nodes/XAxisNode';
import { DataStore } from '../data/DataStore';
import { InputManager } from '../input/InputManager';
import { CrosshairNode } from '../nodes/CrosshairNode';

export class ChartManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  private isAutoScaling: boolean = true;
  
  public options: ChartConfig;

  // Mathematik & Daten (dataStore ist jetzt public für die main.ts)
  public timeScale: TimeScale = new TimeScale();
  public dataStore: DataStore = new DataStore();

  // Globale Nodes (gelten für den ganzen Chart)
  private yAxisNode: YAxisNode = new YAxisNode();
  private xAxisNode: XAxisNode = new XAxisNode(); 
  private crosshairNode: CrosshairNode = new CrosshairNode();

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

    this.inputManager = new InputManager(this.canvas, this.timeScale, this);
  }

  // --- PUBLIC API ---

  public addPane(pane: Pane) {
    this.panes.push(pane);
  }

  /**
   * Automatische Skalierung für eine Pane berechnen.
   * Aktuell noch mit einfacher Logik für Kerzen und Volumen.
   */
  private autoScalePane(pane: Pane, start: number, end: number) {
    const visibleData = this.dataStore.getVisibleData(start, end);
    if (visibleData.length === 0) return;

    // 1. Haupt-Chart (Preis)
    if (pane.id === 'main') {
      let min = Infinity; let max = -Infinity;
      for (const candle of visibleData) {
        if (candle.high > max) max = candle.high;
        if (candle.low < min) min = candle.low;
      }
      const padding = (max - min) * 0.1;
      pane.priceScale.setRange(min - padding, max + padding);
    } 
  
    // 2. RSI (Immer 0 bis 100)
    else if (pane.id === 'rsi') {
      // Ein RSI geht mathematisch nie über 100 oder unter 0.
      // Wir geben ihm 5% Padding, damit die Linie nicht am Rand klebt.
      pane.priceScale.setRange(-5, 105);
    }
  
    // 3. Volumen (Eigene Skala)
    else if (pane.id === 'volume') {
      let maxVol = 0;
      for (const c of visibleData) if (c.volume > maxVol) maxVol = c.volume;
      pane.priceScale.setRange(0, maxVol * 1.1); // 10% Puffer nach oben
    }
  }

  public setMousePos(x: number | null, y: number | null) {
    this.mousePos = (x === null || y === null) ? null : { x, y };
  }

  public zoomPrice(deltaY: number) {
    const mainPane = this.panes.find(p => p.id === 'main');
    if (mainPane) {
      this.isAutoScaling = false; 
      mainPane.priceScale.zoom(deltaY);
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

    // 1. Hintergrund
    this.ctx.fillStyle = this.options.colors.background;
    this.ctx.fillRect(0, 0, width, height);

    this.timeScale.width = chartContentWidth;

    // 2. Grid & Sichtbarer Bereich
    const totalDataCount = this.dataStore.getAllData().length;
    const { start, end } = this.timeScale.getVisibleRange(totalDataCount);
    
    // Einfaches vertikales Grid
    this.ctx.strokeStyle = this.options.colors.grid;
    this.ctx.lineWidth = 1;
    if (this.options.grid.verticalLines.visible) {
      for (let i = start; i <= end; i++) {
        if (i % 10 === 0) {
          const x = this.timeScale.indexToX(i);
          this.ctx.beginPath();
          this.ctx.moveTo(x, 0); this.ctx.lineTo(x, height);
          this.ctx.stroke();
        }
      }
    }

    let currentY = 0;

    this.panes.forEach(pane => {
    const paneHeight = height * pane.heightWeight;
    pane.priceScale.height = paneHeight;

    this.yAxisNode.draw(this.ctx, paneHeight, pane.priceScale, width, currentY, this.options, pane.id);
    
    if (this.isAutoScaling) {
        this.autoScalePane(pane, start, end);
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, currentY, chartContentWidth, paneHeight);
    this.ctx.clip();
    this.ctx.translate(0, currentY);

    // DIE PANE ZEICHNET SICH JETZT SELBST INKL. Z-SORTIERUNG
    pane.draw(this.ctx, this.timeScale, this.options);

    this.ctx.restore();

    this.ctx.strokeStyle = this.options.colors.axisLine;
    this.ctx.strokeRect(0, currentY, chartContentWidth, paneHeight);
    currentY += paneHeight;
    });

    // 4. X-Achse & Crosshair
    this.xAxisNode.draw(this.ctx, chartContentWidth, height, this.timeScale, this.options);

    if (this.mousePos) {
      this.crosshairNode.draw(
        this.ctx, this.mousePos, chartContentWidth, height, 
        this.timeScale, (y) => this.getPaneAtY(y), this.options
      );
    }
  }
}