// input/InputManager.ts

import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from '../core/ChartOptions';
import { TrendLineNode } from '../nodes/tools/TrendLineNode';
import { DrawingManager } from '../core/DrawingManager';
import { FiboNode } from '../nodes/tools/FiboNode';
import { EmojiNode } from '../nodes/tools/EmojiNode';


// --- NEU (Phase 8): Interfaces für das Koordinaten-Mapping ---

export interface LogicalCoordinates {
  x: number;          // Roher Pixel-Wert (z.B. für UI-Overlays)
  y: number;          // Roher Pixel-Wert
  paneId: string;     // In welcher Pane wurde geklickt? (z.B. 'main', 'rsi')
  time: number | null; // Unix-Timestamp der X-Achse (null, falls außerhalb der Daten)
  index: number;      // Logischer Daten-Index (wichtig für Snapping von Linien)
  price: number;      // Der reale Preis oder Indikator-Wert der Y-Achse
}

export interface LogicalCoordinates {
  x: number; y: number; paneId: string; time: number | null; index: number; price: number;
}

/**
 * Ein minimales Interface für Panes, damit der InputManager typsicher die Y-Achse abfragen kann.
 */
export interface IPane {
  getId(): string;
  getTopOffset(): number;
  getPriceScale(): { yToPrice(y: number): number; priceToY(price: number): number };
}

// --- NEU: Werkzeug-Modi ---
// --- NEU: Werkzeug-Modi (als String Union, Vite-kompatibel!) ---
export type InputMode = 'crosshair_and_pan' | 'draw_trendline' | 'draw_fibo';


/**
 * Ein Interface beschreibt, welche Methoden der ChartManager besitzen muss.
 * So kann der InputManager mit ihm reden, ohne die ganze Datei importieren zu müssen.
 */
interface IChartManager {
  options: ChartConfig;
  drawingManager: DrawingManager; // NEU: Zugriff auf alle Zeichnungen
  zoomPrice(deltaY: number): void;
  setMousePos(x: number | null, y: number | null): void;
  // NEU: Der Manager muss uns sagen können, welche Pane an Pixel-Y liegt
  getPaneAt(pixelY: number): IPane | null;
  
  emit(eventName: string, data: any): void; // NEU: Event-Emitter-Methode
  dataStore: any; // NEU: Damit der InputManager auf die Kerzen zugreifen kann
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private timeScale: TimeScale;
  private manager: IChartManager; // Die direkte, saubere Verbindung zum ChartManager

  // --- NEU: Aktueller Modus ---
  public mode: InputMode = 'crosshair_and_pan';

  // Status-Variablen für das Panning (X-Achse schieben)
  private isDragging: boolean = false;
  private startX: number = 0;
  private startScrollOffset: number = 0;

  // Status-Variablen für das Y-Scaling (Preisachse stauchen)
  private isScalingY: boolean = false;
  private startY: number = 0;

 // Status fürs Zeichnen
  private drawStep: number = 0;
  private activeDrawingNode: TrendLineNode | FiboNode | null = null; // Die Linie, die gerade gezeichnet/verschoben wird

  // Status für das Verschieben von Punkten
  private isDraggingPoint: boolean = false;
  private draggedPointIndex: 1 | 2 | null = null;

  constructor(canvas: HTMLCanvasElement, timeScale: TimeScale, manager: IChartManager) {
    this.canvas = canvas;
    this.timeScale = timeScale;
    this.manager = manager;
    this.attachListeners();
  }

  private attachListeners() {
    // Maus-Events für Klicks und Ziehen
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    // Zooming via Mausrad
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Wenn die Maus das Canvas verlässt, setzen wir das Fadenkreuz im Manager auf null
    this.canvas.addEventListener('mouseleave', () => this.manager.setMousePos(null, null));
  }

  // --- NEU (Phase 8): Die zentrale Mapping-Funktion ---
  public getLogicalCoordinates(pixelX: number, pixelY: number): LogicalCoordinates | null {
    // 1. Zuständige Pane über den Manager ermitteln
    const targetPane = this.manager.getPaneAt(pixelY);
    if (!targetPane) return null;

    // 2. Zeit und Index über die TimeScale ermitteln
    // HINWEIS: Wir nehmen an, dass TimeScale eine Methode indexToTime() oder ähnlich hat.
    const index = this.timeScale.xToIndex(pixelX);
    
    // Wir holen uns alle Kerzen über das Interface vom Manager
    // (Achtung: Dein IChartManager Interface braucht dafür evtl. Zugriff auf dataStore)
    // Einfacher Workaround, da wir wissen, dass der Manager den DataStore hat:
    const dataArray = this.manager.dataStore.getAllData();
    const time = this.timeScale.indexToTime(index, dataArray);

    // 3. Preis über die spezifische PriceScale der getroffenen Pane ermitteln
    const paneTopOffset = targetPane.getTopOffset();
    const relativeY = pixelY - paneTopOffset; 
    const price = targetPane.getPriceScale().yToPrice(relativeY);

    return {
      x: pixelX,
      y: pixelY,
      paneId: targetPane.getId(),
      time,
      index,
      price
    };
  }

  private onMouseDown = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top; // NEU: Y-Koordinate wird jetzt benötigt
    
    // Prüfen: Ist die Maus über der rechten Preisachse?
    // Wir nutzen hier die options direkt vom manager
    const isOverYAxis = x > (rect.width - this.manager.options.layout.axisWidth);
    if (isOverYAxis) {
      // Modus: Preisachse stauchen
      this.isScalingY = true;
      this.startY = e.clientY;
      this.canvas.style.cursor = 'ns-resize';
      return;
    } 

    // --- NEU (Phase 8): Logische Koordinaten beim Klick berechnen ---
    const logicalCoords = this.getLogicalCoordinates(x, y);
    if (!logicalCoords || logicalCoords.paneId !== 'main') return;

    const targetPane = this.manager.getPaneAt(y);
    const priceScale = targetPane?.getPriceScale() as any;

    // ==========================================
    // MODUS: STANDARD (Auswählen & Modifizieren)
    // ==========================================
    if (this.mode === 'crosshair_and_pan') {

        // 1. Prüfen: Haben wir einen Ankerpunkt von einer SELEKTIERTEN Linie getroffen?
        for (const shape of this.manager.drawingManager.shapes) {
            if (shape.isSelected) {
                const anchorHit = shape.hitTestAnchor(x, y, this.timeScale, priceScale);
                if (anchorHit) {
                    this.isDraggingPoint = true;
                    this.draggedPointIndex = anchorHit;
                    this.activeDrawingNode = shape;
                    return; // Stopp: Wir verschieben einen Punkt, nicht pannen!
                }
            }
        }

        // 2. Prüfen: Haben wir eine Linie getroffen? (Rückwärts-Schleife wegen Z-Index)
        let hitFound = false;
        const shapes = this.manager.drawingManager.shapes;
        for (let i = shapes.length - 1; i >= 0; i--) {
            const shape = shapes[i];
            if (!hitFound && shape.hitTest(x, y, this.timeScale, priceScale)) {
                shape.isSelected = !shape.isSelected;
                hitFound = true;
            } else {
                shape.isSelected = false; // Alle anderen deselektieren
            }
        }
        
        if (hitFound) return; // Stopp: Wir haben etwas markiert, nicht pannen!
        
        // Wenn wir hier ankommen, haben wir ins "Leere" geklickt -> Alles deselektieren
        this.manager.drawingManager.deselectAll();
    }

    // ==========================================
    // MODUS: ZEICHNEN (Neue Trendlinie)
    // ==========================================
    else if (this.mode === 'draw_trendline') {
        if (this.drawStep === 0) {
            // Linie erstellen und in den Manager pushen
            const newLine = new TrendLineNode();
            
            // Punkt 1 und Punkt 2 initial auf die gleiche Koordinate setzen (für Vorschau)
            newLine.point1 = { index: logicalCoords.index, price: logicalCoords.price };
            newLine.point2 = { index: logicalCoords.index, price: logicalCoords.price }; 
            
            this.manager.drawingManager.shapes.push(newLine);
            
            this.activeDrawingNode = newLine;
            this.drawStep = 1;
            
            // OPTIONAL: Event "Zeichnen gestartet" feuern, falls die UI reagieren soll
            // this.manager.emit('drawingStarted', newLine); 
            
            return;
        } else if (this.drawStep === 1 && this.activeDrawingNode) {
            // Endpunkt setzen und Modus automatisch beenden
            this.activeDrawingNode.point2 = { index: logicalCoords.index, price: logicalCoords.price };
            this.activeDrawingNode.isSelected = true; // Neu gezeichnete Linie direkt markieren
            
            // --- NEU (Phase 9): Die Brücke benachrichtigen ---
            // Wir feuern das Event, BEVOR wir die Referenz auf null setzen.
            // Die Web-App erhält so das fertige Objekt inklusive seiner neuen ID.
            this.manager.emit('drawingCreated', {
                id: this.activeDrawingNode.id,
                type: 'trendline',
                data: {
                    point1: this.activeDrawingNode.point1,
                    point2: this.activeDrawingNode.point2
                }
            });

            this.drawStep = 0; 
            this.activeDrawingNode = null;
            this.mode = 'crosshair_and_pan'; // Zurück zum Standard-Mauszeiger!
            
            // Dem Manager sagen, dass er den Cursor aktualisieren und neu zeichnen soll
            this.manager.setMousePos(x, y); 
            return;
        }
    }
    
    // ==========================================
    // MODUS: ZEICHNEN (Neues Fibonacci)
    // ==========================================
    else if (this.mode === 'draw_fibo') {
        if (this.drawStep === 0) {
            const newFibo = new FiboNode();
            
            newFibo.point1 = { index: logicalCoords.index, price: logicalCoords.price };
            newFibo.point2 = { index: logicalCoords.index, price: logicalCoords.price }; 
            
            this.manager.drawingManager.shapes.push(newFibo);
            
            this.activeDrawingNode = newFibo; // FiboNode muss in activeDrawingNode passen!
            this.drawStep = 1;
            return;
        } else if (this.drawStep === 1 && this.activeDrawingNode) {
            this.activeDrawingNode.point2 = { index: logicalCoords.index, price: logicalCoords.price };
            this.activeDrawingNode.isSelected = true; 
            
            // Event feuern (Dirty Check)
            this.manager.emit('drawingCreated', {
                id: this.activeDrawingNode.id,
                type: 'fibRetracement',
                data: {
                    point1: this.activeDrawingNode.point1,
                    point2: this.activeDrawingNode.point2
                }
            });

            this.drawStep = 0; 
            this.activeDrawingNode = null;
            this.mode = 'crosshair_and_pan'; 
            this.manager.setMousePos(x, y); 
            return;
        }
    }

    // ==========================================
    // DEFAULT: PANNING
    // ==========================================
    this.isDragging = true;
    this.startX = e.clientX;
    this.startScrollOffset = this.timeScale.scrollOffset;
    this.canvas.style.cursor = 'grabbing';
  };

private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.manager.setMousePos(x, y);
    const logicalCoords = this.getLogicalCoordinates(x, y);

    // --- 1. LIVE PREVIEWS (Beim ersten Zeichnen) ---
    if (this.drawStep === 1 && this.activeDrawingNode && logicalCoords) {
        // Vorschau für Trendlinie & Fibo
        if (this.mode === 'draw_trendline' || this.mode === 'draw_fibo') {
            this.activeDrawingNode.point2 = { index: logicalCoords.index, price: logicalCoords.price };
        }
    }

    // --- 2. ADVANCED NODE INTERACTION (Rotation / Spiegeln) ---
    // Wenn wir ein Emoji selektiert haben und gerade ziehen
    if (this.isDragging && this.activeDrawingNode instanceof EmojiNode && this.activeDrawingNode.point1) {
        
        // Zuerst die aktuelle Pane und deren PriceScale holen
        const targetPane = this.manager.getPaneAt(y);
        const priceScale = targetPane?.getPriceScale() as any;
        
        // Wenn keine Preisskala gefunden wurde, können wir nicht rechnen
        if (!priceScale) return;

        const centerX = this.timeScale.indexToX(this.activeDrawingNode.point1.index);
        
        // Nutze nun die priceScale der Pane statt die des Managers:
        const centerY = priceScale.priceToY(this.activeDrawingNode.point1.price);

        // Delta zwischen Maus und Zentrum
        const dx = x - centerX;
        const dy = y - centerY;

        // Fall A: Rotation (Winkel berechnen)
        // Wir nutzen atan2, um den Winkel im Bogenmaß zu erhalten
        // + Math.PI/2 korrigiert die Ausrichtung, da unser Handle oben sitzt
        this.activeDrawingNode.rotation = Math.atan2(dy, dx) + Math.PI / 2;

        // Fall B: Spiegeln (Mirroring)
        // Wenn die Maus links vom Zentrum ist, flippen wir das Emoji
        this.activeDrawingNode.scaleX = dx < 0 ? -1 : 1;
        
        // Fall C: Skalieren (Größe anpassen)
        // Wir nutzen die Distanz zum Zentrum als neue Font-Größe
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 10) { // Mindestgröße zum Schutz
            this.activeDrawingNode.size = distance * 1.2;
        }
    }

    // --- 3. POINT DRAGGING (Bestehende Logik für Ankerpunkte) ---
    if (this.isDraggingPoint && this.activeDrawingNode && this.draggedPointIndex && logicalCoords) {
        const pointKey = `point${this.draggedPointIndex}` as 'point1' | 'point2';
        this.activeDrawingNode[pointKey] = { index: logicalCoords.index, price: logicalCoords.price };
    }

    // --- 4. PANNING (Verschieben des Charts) ---
    if (this.isDragging && !this.activeDrawingNode) { // Nur pannen, wenn kein Objekt bewegt wird
      const deltaX = e.clientX - this.startX;
      this.timeScale.scrollOffset = this.startScrollOffset + deltaX;
    }

    // --- 5. PRICE SCALING (Y-Achse ziehen) ---
    if (this.isScalingY) {
      const deltaY = e.clientY - this.startY;
      this.startY = e.clientY;
      this.manager.zoomPrice(deltaY);
    }

    this.updateCursor(x, y);
  };

private onMouseUp = () => {
    // Wenn wir gerade einen Punkt verschoben haben...
    if (this.isDraggingPoint && this.activeDrawingNode) {
        // ...feuern wir ein Event mit den neuen Daten!
        this.manager.emit('drawingChanged', {
            id: this.activeDrawingNode.id,
            type: 'trendline',
            data: {
                point1: this.activeDrawingNode.point1,
                point2: this.activeDrawingNode.point2
            }
        });
    }

    this.isDragging = false;
    this.isScalingY = false;
    this.isDraggingPoint = false;
    this.draggedPointIndex = null;

    if (this.mode !== 'draw_trendline') { // Cursor nicht zurücksetzen, wenn wir noch zeichnen
        this.canvas.style.cursor = 'default';
    }
  };

  /**
   * Hilfsfunktion für dynamische Cursor-Icons
   */
  private updateCursor(x: number, y: number) {
    if (this.isDragging || this.isScalingY || this.isDraggingPoint) return;

    if (this.mode === 'draw_trendline') {
        this.canvas.style.cursor = 'crosshair';
        return;
    }

    const targetPane = this.manager.getPaneAt(y);
    const priceScale = targetPane?.getPriceScale() as any;

    if (targetPane && targetPane.getId() === 'main') {
        for (let i = this.manager.drawingManager.shapes.length - 1; i >= 0; i--) {
            const shape = this.manager.drawingManager.shapes[i];
            
            if (shape.isSelected && shape.hitTestAnchor(x, y, this.timeScale, priceScale)) {
                this.canvas.style.cursor = 'move';
                shape.isHovered = false;
                return;
            }
            if (shape.hitTest(x, y, this.timeScale, priceScale)) {
                this.canvas.style.cursor = 'pointer';
                shape.isHovered = true;
                return;
            }
            shape.isHovered = false;
        }
    }
    this.canvas.style.cursor = 'default';
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Index bestimmen, um um den Mauszeiger herum zu zoomen
    const indexUnderMouse = this.timeScale.xToIndex(mouseX);

    // Zoom-Faktor (Mausrad hoch = 10% größer, runter = 10% kleiner)
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    this.timeScale.candleWidth *= zoomFactor;

    // Grenzen einhalten
    this.timeScale.candleWidth = Math.max(1, Math.min(this.timeScale.candleWidth, 100));

    // ScrollOffset korrigieren, damit der Punkt unter der Maus fix bleibt
    this.timeScale.scrollOffset = mouseX - (indexUnderMouse * this.timeScale.candleWidth);
  };
}