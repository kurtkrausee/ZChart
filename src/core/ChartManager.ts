// core/ChartManager.ts

import { Pane } from './Pane';
import { TimeScale } from '../math/TimeScale';
import { defaultOptions, mergeOptions } from './ChartOptions';
import type { ChartConfig, DeepPartial } from './ChartOptions';
import { YAxisNode } from '../nodes/core/YAxisNode';
import { XAxisNode } from '../nodes/core/XAxisNode';
import { DataStore } from '../data/DataStore';
import { InputManager } from '../input/InputManager';
import { CrosshairNode } from '../nodes/core/CrosshairNode';
import { GridNode } from '../nodes/core/GridNode';            
import { AutoScaleEngine } from '../math/AutoScaleEngine';     
import { DrawingManager } from './DrawingManager';
import { WatermarkNode } from '../nodes/core/WatermarkNode';

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
  private autoScaleEngine = new AutoScaleEngine(); 

  // Globale Nodes
  private yAxisNode: YAxisNode = new YAxisNode();
  private xAxisNode: XAxisNode = new XAxisNode(); 
  private crosshairNode: CrosshairNode = new CrosshairNode();
  private gridNode: GridNode = new GridNode();   

  // Interaktion
  public inputManager!: InputManager; //private -> public
  private mousePos: { x: number, y: number } | null = null;

  public drawingManager: DrawingManager = new DrawingManager();
  public watermarkNode: WatermarkNode = new WatermarkNode();
  
  // Speicher für Callbacks (die Brücke/API wird sich hier registrieren)
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(containerOrId: string | HTMLElement, userOptions?: DeepPartial<ChartConfig>) {
    // Falls es ein String ist -> getElementById, sonst direkt das Element nehmen
    const container = typeof containerOrId === 'string' 
      ? document.getElementById(containerOrId) 
      : containerOrId;

    if (!container) {
      throw new Error(`Container ${containerOrId} nicht gefunden.`);
  }
  
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

  /**
   * Die zentrale Methode, um Daten nach außen an die Brücke zu senden.
   */
  public emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Wird von der ZChartAPI genutzt, um sich auf Events zu abonnieren.
   */
  public on(event: string, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
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

  // ==========================================
  // CORE API BEFEHLE
  // ==========================================

  /**
   * Snapshot-Tool: Exportiert den Canvas als Base64-Bild-String.
   */
  public toDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Zoom-API: Verändert die Kerzenbreite auf der X-Achse.
   */
  public zoomTime(factor: number) {
    this.timeScale.candleWidth *= factor;
    // Grenzen einhalten (nicht zu klein, nicht zu groß)
    this.timeScale.candleWidth = Math.max(1, Math.min(this.timeScale.candleWidth, 100));
  }

  /**
   * Live-Update API: Wird von außen aufgerufen, wenn ein neuer Tick (Trade) reinkommt.
   */
  public updateTick(tick: any) { // "any" oder importiere "CandleData"
      this.dataStore.updateTick(tick);
      
      // Auto-Scroll: Wenn wir ganz rechts im Chart sind, scrollen wir automatisch mit!
      // (Verhindert, dass der Kurs aus dem Bildschirm läuft, wenn neue Kerzen entstehen)
      const dataLength = this.dataStore.getAllData().length;
      const visibleRange = this.timeScale.getVisibleRange(dataLength);
      
      if (visibleRange.end >= dataLength - 2) { // Toleranz von 1-2 Kerzen
         this.timeScale.scrollOffset -= this.timeScale.candleWidth; 
      }
      
      // (Da dein startRenderLoop ohnehin 60x pro Sekunde läuft, wird die neue Kerze 
      // sofort beim nächsten Frame gezeichnet. Wir müssen hier kein explizites render() rufen.)
  }

  /**
   * Wird von der API aufgerufen, wenn z.B. das Theme wechselt.
   * Da dein ChartManager ohnehin in einem durchgehenden Loop 
   * (startRenderLoop) läuft, brauchen wir hier aktuell nichts tun.
   * Es sichert aber die Kompatibilität für Performance-Updates später ab!
   */
  public requestRedraw() {
     // this.render(); (Aktuell nicht nötig wegen requestAnimationFrame)
  }

  // --- Node-Verwaltung für den ChartStyle-Wechsler ---
  public getNodes() {
    const mainPane = this.panes.find(p => p.id === 'main');
    return mainPane ? (mainPane as any).nodes || [] : [];
  }

  public removeNode(id: string) {
    const mainPane = this.panes.find(p => p.id === 'main');
    if (mainPane && (mainPane as any).nodes) {
        (mainPane as any).nodes = (mainPane as any).nodes.filter((n: any) => n.id !== id);
    }
  }

  public addNode(node: any) {
    const mainPane = this.panes.find(p => p.id === 'main');
    if (mainPane) {
        if (typeof (mainPane as any).addNode === 'function') {
            (mainPane as any).addNode(node);
        } else if ((mainPane as any).nodes) {
            (mainPane as any).nodes.push(node);
        }
    }
  }
  // ==========================================

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

  public render() {
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

      // Watermark im Hintergrund der Main-Pane zeichnen
      if (pane.id === 'main') {
          this.watermarkNode.draw(this.ctx, this.timeScale, pane.priceScale, this.options);
      }

      // Den DrawingManager alle Shapes zeichnen lassen
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
    this.xAxisNode.draw(this.ctx, chartContentWidth, height, this.timeScale, this.options, this.dataStore.getAllData());

    // Crosshair NUR zeichnen, wenn wir im Pan-Modus sind ODER wenn ein Zeichenwerkzeug aktiv ist, 
    // ABER NICHT, wenn wir gerade ein Objekt verschieben (isDraggingPoint)
    const mode = this.inputManager?.mode || 'crosshair_and_pan';
    const isDrawing = mode.startsWith('draw_');
    const isPanning = mode === 'crosshair_and_pan';
    
    // (Optional: Wenn du das Crosshair GANZ ausblenden willst beim normalen Pannen, 
    // dann setze die Bedingung unten einfach auf `if (this.mousePos && isDrawing)`)

    if (this.mousePos && (isDrawing || isPanning)) {
      this.crosshairNode.draw(
        this.ctx, this.mousePos, chartContentWidth, height, 
        this.timeScale, (y) => this.getPaneAt(y), this.options
      );
    }
  }
}