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
  public ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  public panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  public isAutoScaling: boolean = true;
  
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

    // Y-ACHSE STAUCHEN / STRECKEN (Mit dem Scrollrad)
        this.canvas.addEventListener('wheel', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const chartContentWidth = rect.width - this.options.layout.axisWidth;

            if (x > chartContentWidth) {
                e.preventDefault();
                e.stopPropagation();

                const paneInfo = this.getPaneAt(y);
                if (paneInfo) {
                    const priceScale = paneInfo.getPriceScale();
                    priceScale.isAutoScaled = false; 
                    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                    priceScale.zoom *= zoomFactor;
                    this.isChartDirty = true; // <--- HIER GEÄNDERT
                }
            }
        });

        // AUTO-SCALE ZURÜCKSETZEN (Mit Doppelklick auf die Y-Achse)
        this.canvas.addEventListener('dblclick', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const chartContentWidth = rect.width - this.options.layout.axisWidth;

            if (x > chartContentWidth) {
                const paneInfo = this.getPaneAt(y);
                if (paneInfo) {
                    const priceScale = paneInfo.getPriceScale();
                    priceScale.isAutoScaled = true;
                    priceScale.zoom = 1;
                    priceScale.scrollOffset = 0;
                    this.isChartDirty = true; // <--- HIER GEÄNDERT
                }
            }
        });

        // ==========================================
        // Y-ACHSE DRAG & DROP (Verschieben nach oben/unten)
        // ==========================================
        let isDraggingY = false;
        let draggedPane: ReturnType<ChartManager['getPaneAt']> = null;
        let lastMouseY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const chartContentWidth = rect.width - this.options.layout.axisWidth;

            // Hat der User AUF die Y-Achse geklickt?
            if (x > chartContentWidth) {
                isDraggingY = true;
                draggedPane = this.getPaneAt(y);
                lastMouseY = y;
                
                if (draggedPane) {
                    draggedPane.getPriceScale().isAutoScaled = false; // Auto-Scale aus!
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingY && draggedPane) {
                const deltaY = e.clientY - lastMouseY;
                lastMouseY = e.clientY;

                // Wie viel Preis entspricht ein Pixel?
                const scale = draggedPane.getPriceScale();
                const priceRange = (scale.maxPrice - scale.minPrice) / scale.zoom;
                const pricePerPixel = priceRange / scale.height;

                // Verschiebe den Scroll-Offset exakt um die Mausbewegung
                scale.scrollOffset += deltaY * pricePerPixel;
                
                this.isChartDirty = true;
            }
        });

        window.addEventListener('mouseup', () => {
            isDraggingY = false;
            draggedPane = null;
        });
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

  /**
   * Löscht ein Pane (z.B. RSI oder MACD) aus dem Chart
   */
  public removePane(paneId: string) {
    if (paneId === 'main') return;

    // 1. Finde das Gewicht des zu löschenden Panes
    const removedPane = this.panes.find(p => p.id === paneId);
    if (!removedPane) return;
    const removedWeight = removedPane.heightWeight;

    // 2. Pane entfernen
    this.panes = this.panes.filter(p => p.id !== paneId);

    // 3. Gewichte neu verteilen
    // Wir berechnen, wie viel Prozent die verbleibenden Panes zusammen hatten
    const remainingTotalWeight = 1.0 - removedWeight;

    if (remainingTotalWeight > 0) {
        this.panes.forEach(pane => {
            // Jedes Pane wird proportional vergrößert
            pane.heightWeight = pane.heightWeight / remainingTotalWeight;
        });
    }

    this.isChartDirty = true;
    this.render(); // Sofort neu zeichnen
}

  public setMousePos(x: number | null, y: number | null) {
    this.mousePos = (x === null || y === null) ? null : { x, y };
  }

  public zoomPrice(deltaY: number, paneId?: string | null) {
    this.isChartDirty = true;
    
    // Welches Fenster soll gestaucht werden?
    const targetId = paneId || 'main';
    const targetPane = this.panes.find(p => p.id === targetId);
    
    if (targetPane) {
      targetPane.priceScale.isAutoScaled = false; 
      
      // ==========================================
      // DIE MAGIE: EXPONENTIELLES ZOOMEN
      // ==========================================
      // Faktor 0.002 bestimmt die Empfindlichkeit (kleiner = langsamer/weicher)
      // Math.exp macht den Zoom butterweich und verhindert, dass er jemals <= 0 wird!
      // Drag nach unten (deltaY > 0) -> Multiplikator wird z.B. 0.98 (Stauchen)
      // Drag nach oben (deltaY < 0) -> Multiplikator wird z.B. 1.02 (Strecken)
      const zoomMultiplier = Math.exp(-deltaY * 0.002);
      
      targetPane.priceScale.zoom *= zoomMultiplier;

      // ==========================================
      // HARD-LIMITS GEGEN "VERSCHWINDEN"
      // ==========================================
      // Wir begrenzen den Zoom auf vernünftige Werte (1% bis 10000%)
      if (targetPane.priceScale.zoom < 0.01) {
          targetPane.priceScale.zoom = 0.01;
      }
      if (targetPane.priceScale.zoom > 100) {
          targetPane.priceScale.zoom = 100;
      }
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
    // Falls du eine renderLoop hast, stoppe sie hier z.B. mit cancelAnimationFrame
    
    // NEU: Zerstöre alle Window-Listener des InputManagers!
    if (this.inputManager) {
        this.inputManager.destroy();
    }

    // Leere das Canvas
    if (this.container && this.canvas.parentNode) {
        this.container.removeChild(this.canvas);
    }
}

  public render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    // NEU: Schutzschild gegen den ResizeObserver/Canvas Crash!
    if (width <= 0 || height <= 0) return;

    const chartContentWidth = width - this.options.layout.axisWidth;
    // NEU: Wir reservieren 30 Pixel für die X-Achse ganz unten!
    const timeScaleHeight = 30; 
    const usableHeight = height - timeScaleHeight;

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
            const paneHeight = usableHeight * pane.heightWeight;
            pane.priceScale.height = paneHeight;
            
            // Pane 'top' setzen für das [X] Icon!
            (pane as any).top = currentY; 

            // ==========================================
            // AUTO-SCALING LOGIK
            // ==========================================
            if (this.isAutoScaling && pane.priceScale.isAutoScaled) {
                if (pane.id === 'main') {
                    pane.priceScale.autoScale(visibleData, false); // Normaler Preis (bestehende Logik)
                } else if (pane.id.toLowerCase().startsWith('rsi')) {
                    pane.priceScale.setRange(-5, 105); // RSI ist fix
                } else if (pane.id.toLowerCase().startsWith('volume')) {
                    pane.priceScale.autoScale(visibleData, true); // Volumen (bestehende Logik)
                } else {
                    // NEU: Für MACD und alle zukünftigen Indikatoren rufen wir die intelligente Engine auf
                    const engine = new AutoScaleEngine();
                    engine.scalePane(pane, visibleData, start, end);
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