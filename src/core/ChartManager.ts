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

  // OffscreenCanvas
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  public isChartDirty: boolean = true; // Sagt uns, wann ein "neues Foto" nötig ist

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

  public isLoadingHistory: boolean = false; // Verhindert API-Spam
  
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
    this.bgCanvas = document.createElement('canvas');
    // alpha: false macht das Canvas für den Browser noch schneller
    this.bgCtx = this.bgCanvas.getContext('2d', { alpha: false })!;

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
    this.isChartDirty = true;
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
   * Gibt alle aktuellen Panes (Main, RSI, Volume etc.) als Array zurück.
   */
  public getPanes() {
      return this.panes; 
  }

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
    this.isChartDirty = true;
    this.timeScale.candleWidth *= factor;
    // Grenzen einhalten (nicht zu klein, nicht zu groß)
    this.timeScale.candleWidth = Math.max(1, Math.min(this.timeScale.candleWidth, 100));
  }

  /**
   * Live-Update API: Wird von außen aufgerufen, wenn ein neuer Tick (Trade) reinkommt.
   */
  public updateTick(tick: any) { // "any" oder importiere "CandleData"
      this.isChartDirty = true;
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
   * Wird von außen aufgerufen, wenn historische Daten geladen wurden.
   */
  public prependHistoricalData(historicalCandles: any[]) {
      if (!historicalCandles || historicalCandles.length === 0) {
          this.isLoadingHistory = false; // Nichts mehr zu laden (Anfang erreicht)
          return;
      }

      // 1. Daten vorne anfügen
      const addedCount = this.dataStore.prependData(historicalCandles);

      // 2. ANTI-JUMP MAGIE: Den Scroll-Offset exakt um die Breite der neuen Kerzen verschieben
      this.timeScale.scrollOffset += (addedCount * this.timeScale.candleWidth);

      // 3. Status zurücksetzen und Foto neu schießen
      this.isLoadingHistory = false;
      this.isChartDirty = true;
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
    
    // 1. Sichtbares Canvas anpassen
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(this.dpr, this.dpr);

    // 2. Unsichtbares Canvas (Offscreen) exakt gleich anpassen
    this.bgCanvas.width = rect.width * this.dpr;
    this.bgCanvas.height = rect.height * this.dpr;
    this.bgCtx.scale(this.dpr, this.dpr);
    
    // 3. Markieren, dass wir zwingend ein neues Foto brauchen, da sich die Größe geändert hat
    this.isChartDirty = true; 

    // 4. Jetzt erst zeichnen
    this.render();
  }

// 1. Die ID speichern wir, um den Loop beenden zu können
  private animationFrameId: number | null = null;

  // 2. Wieder private, da es nur intern vom ChartManager gestartet wird
  private startRenderLoop() {
    const loop = () => {
      
      if (this.isChartDirty) {
          this.render();
          this.isChartDirty = false; // Setzt den Status nach dem "großen" Render zurück
      } else {
          // Auch wenn nichts aufwändiges passiert, müssen wir zumindest 
          // Layer 2 und 3 (Foto stempeln & Fadenkreuz zeichnen) in Gang halten!
          this.render(); 
      }
      
      // Die ID beim Aufruf IMMER speichern!
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    // Erste Initialisierung
    if (this.animationFrameId === null) {
        this.animationFrameId = requestAnimationFrame(loop);
    }
  }

  public destroy() {
      if (this.animationFrameId !== null) {
          cancelAnimationFrame(this.animationFrameId); 
          this.animationFrameId = null;
      }
      // Hier können später auch Event-Listener (Mouse, Resize) entfernt werden
  }

  public render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const chartContentWidth = width - this.options.layout.axisWidth;

    // ==========================================
    // LAYER 1: CACHE ERSTELLEN (Nur wenn isChartDirty = true)
    // ==========================================
    if (this.isChartDirty) {
        this.bgCtx.fillStyle = this.options.colors.background;
        this.bgCtx.fillRect(0, 0, width, height);

        this.timeScale.width = chartContentWidth;

        const totalDataCount = this.dataStore.getAllData().length;
        const { start, end } = this.timeScale.getVisibleRange(totalDataCount);
        const visibleData = this.dataStore.getVisibleData(start, end);

        // Infinite Scroll Trigger
        if (start < 50 && !this.isLoadingHistory && totalDataCount > 0) {
            this.isLoadingHistory = true;
            const oldestCandle = this.dataStore.getAllData()[0];
            this.emit('loadMoreHistoricalData', { 
                oldestTime: oldestCandle ? oldestCandle.timestamp : null 
            });
        }

        // Grid zeichnen
        this.gridNode.draw(this.bgCtx, chartContentWidth, height, this.timeScale, this.options, start, end);

        let currentY = 0;

        // Panes rendern
        this.panes.forEach(pane => {
            const paneHeight = height * pane.heightWeight;
            pane.priceScale.height = paneHeight;
            
            // Pane 'top' setzen für das [X] Icon!
            (pane as any).top = currentY; 

            // ==========================================
            // NEU: AUTO-SCALING LOGIK DIREKT HIER
            // ==========================================
            if (this.isAutoScaling) {
                if (pane.id === 'main') {
                    // Hauptchart skaliert nach Kerzen
                    pane.priceScale.autoScale(visibleData);
                } else if (pane.id.toLowerCase() === 'rsi') {
                    // RSI ist immer fix von 0 bis 100
                    pane.priceScale.setRange(0, 100);
                } else {
                    // Volumen und Co. skalieren sich auch selbst
                    pane.priceScale.autoScale(visibleData);
                }
            }

            this.yAxisNode.draw(this.bgCtx, paneHeight, pane.priceScale, width, currentY, this.options, pane.id);
            
            this.bgCtx.save();
            this.bgCtx.beginPath();
            this.bgCtx.rect(0, currentY, chartContentWidth, paneHeight);
            this.bgCtx.clip();
            this.bgCtx.translate(0, currentY);

            pane.draw(this.bgCtx, this.timeScale, this.options);

            if (pane.id === 'main') {
                this.watermarkNode.draw(this.bgCtx, this.timeScale, pane.priceScale, this.options);
                this.drawingManager.draw(this.bgCtx, this.timeScale, pane.priceScale, this.options);
            }

            this.bgCtx.restore();

            this.bgCtx.strokeStyle = this.options.colors.axisLine;
            this.bgCtx.strokeRect(0, currentY, chartContentWidth, paneHeight);
            currentY += paneHeight;
        });

        // X-Achse
        this.xAxisNode.draw(this.bgCtx, chartContentWidth, height, this.timeScale, this.options, this.dataStore.getAllData());

        this.isChartDirty = false;
    }

    // ==========================================
    // LAYER 2: BILD AUF BILDSCHIRM
    // ==========================================
    this.ctx.drawImage(this.bgCanvas, 0, 0, width, height);

    // ==========================================
    // LAYER 3: FADENKREUZ (Jetzt MIT dataArray!)
    // ==========================================
    const mode = this.inputManager?.mode || 'crosshair_and_pan';
    const isDrawing = mode.startsWith('draw_');
    const isPanning = mode === 'crosshair_and_pan';
    
    if (this.mousePos && (isDrawing || isPanning)) {
      this.crosshairNode.draw(
        this.ctx, 
        this.mousePos, 
        chartContentWidth, 
        height, 
        this.timeScale, 
        (y) => this.getPaneAt(y), 
        this.options,
        this.dataStore.getAllData() // <--- NEU: Daten für das Datumslayout
      );
    }
}
}