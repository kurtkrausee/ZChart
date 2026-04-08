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
import { GridNode } from '../nodes/GridNode';                  // NEU
import { AutoScaleEngine } from '../math/AutoScaleEngine';      // NEU
import { DrawingManager } from './DrawingManager';

export class ChartManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  private isAutoScaling: boolean = true;
  
  public options: ChartConfig;

  // Mathematik, Daten & Engines
  public timeScale: TimeScale = new TimeScale();
  public dataStore: DataStore = new DataStore();
  private autoScaleEngine = new AutoScaleEngine(); // NEU

  // Globale Nodes
  private yAxisNode: YAxisNode = new YAxisNode();
  private xAxisNode: XAxisNode = new XAxisNode(); 
  private crosshairNode: CrosshairNode = new CrosshairNode();
  private gridNode: GridNode = new GridNode();     // NEU

  // Interaktion
  public inputManager!: InputManager; //private -> public
  private mousePos: { x: number, y: number } | null = null;

  public drawingManager: DrawingManager = new DrawingManager();

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

  public addPane(pane: Pane) {
    this.panes.push(pane);
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

  public getPaneAt(pixelY: number) {
    let accumulatedY = 0;
    const logicalHeight = this.canvas.height / this.dpr;
    
    for (const pane of this.panes) {
      const paneHeight = logicalHeight * pane.heightWeight;
      
      if (pixelY >= accumulatedY && pixelY <= accumulatedY + paneHeight) {
        return {
          pane: pane,
          localY: pixelY - accumulatedY,
          getId: () => pane.id,
          getTopOffset: () => accumulatedY,
          getPriceScale: () => pane.priceScale
        };
      }
      accumulatedY += paneHeight;
    }
    return null;
  }

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

  private render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const chartContentWidth = width - this.options.layout.axisWidth;

    // 1. Hintergrund
    this.ctx.fillStyle = this.options.colors.background;
    this.ctx.fillRect(0, 0, width, height);

    this.timeScale.width = chartContentWidth;

    // 2. Sichtbarer Bereich berechnen
    const totalDataCount = this.dataStore.getAllData().length;
    const { start, end } = this.timeScale.getVisibleRange(totalDataCount);
    const visibleData = this.dataStore.getVisibleData(start, end);

    // 3. Grid zeichnen (Ausgelagert!)
    this.gridNode.draw(this.ctx, chartContentWidth, height, this.timeScale, this.options, start, end);

    let currentY = 0;

    // 4. Panes rendern
    this.panes.forEach(pane => {
      const paneHeight = height * pane.heightWeight;
      pane.priceScale.height = paneHeight;

      this.yAxisNode.draw(this.ctx, paneHeight, pane.priceScale, width, currentY, this.options, pane.id);
      
      // AutoScaling via Engine (Ausgelagert!)
      if (this.isAutoScaling) {
        this.autoScaleEngine.scalePane(pane, visibleData);
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, currentY, chartContentWidth, paneHeight);
      this.ctx.clip();
      this.ctx.translate(0, currentY);

      pane.draw(this.ctx, this.timeScale, this.options);

      // NEU: Den DrawingManager alle Shapes zeichnen lassen
      if (pane.id === 'main') {
        // LÖSCHEN: this.testLine.draw(...)
        this.drawingManager.draw(this.ctx, this.timeScale, pane.priceScale, this.options);
      }

      this.ctx.restore();

      this.ctx.strokeStyle = this.options.colors.axisLine;
      this.ctx.strokeRect(0, currentY, chartContentWidth, paneHeight);
      currentY += paneHeight;
    });

    // 5. X-Achse & Crosshair
    this.xAxisNode.draw(this.ctx, chartContentWidth, height, this.timeScale, this.options);

    if (this.mousePos) {
      this.crosshairNode.draw(
        this.ctx, this.mousePos, chartContentWidth, height, 
        this.timeScale, (y) => this.getPaneAt(y), this.options
      );
    }
  }
}