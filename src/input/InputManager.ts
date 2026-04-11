// input/InputManager.ts

import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from '../core/ChartOptions';
import { TrendLineNode } from '../nodes/tools/TrendLineNode';
import { DrawingManager } from '../core/DrawingManager';
import { FiboNode } from '../nodes/tools/FiboNode';
import { EmojiNode } from '../nodes/tools/EmojiNode';
import { TextNode } from '../nodes/tools/TextNode';
import { PenNode } from '../nodes/tools/PenNode';
import { ImageNode } from '../nodes/tools/ImageNode';



// --- Interfaces für das Koordinaten-Mapping ---

export interface LogicalCoordinates {
  x: number;          // Roher Pixel-Wert (z.B. für UI-Overlays)
  y: number;          // Roher Pixel-Wert
  paneId: string;     // In welcher Pane wurde geklickt? (z.B. 'main', 'rsi')
  time: number | null; // Unix-Timestamp der X-Achse (null, falls außerhalb der Daten)
  index: number;      // Logischer Daten-Index (wichtig für Snapping von Linien)
  price: number;      // Der reale Preis oder Indikator-Wert der Y-Achse
}

/**
 * Ein minimales Interface für Panes, damit der InputManager typsicher die Y-Achse abfragen kann.
 */
export interface IPane {
  getId(): string;
  getTopOffset(): number;
  getPriceScale(): { yToPrice(y: number): number; priceToY(price: number): number };
}

// --- Werkzeug-Modi ---
export type InputMode = 'crosshair_and_pan' | 'draw_trendline' | 'draw_fibo' | 'draw_emoji' | 'draw_text' | 'draw_pen'   ;


/**
 * Ein Interface beschreibt, welche Methoden der ChartManager besitzen muss.
 * So kann der InputManager mit ihm reden, ohne die ganze Datei importieren zu müssen.
 */
interface IChartManager {
  options: ChartConfig;
  drawingManager: DrawingManager; // Zugriff auf alle Zeichnungen
  zoomPrice(deltaY: number): void;
  setMousePos(x: number | null, y: number | null): void;
  // Der Manager muss uns sagen können, welche Pane an Pixel-Y liegt
  getPaneAt(pixelY: number): IPane | null;
  
  emit(eventName: string, data: any): void; // Event-Emitter-Methode
  dataStore: any; // Damit der InputManager auf die Kerzen zugreifen kann
  isChartDirty: boolean; // Damit der InputManager den Manager zwingen kann, neu zu zeichnen
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private timeScale: TimeScale;
  private manager: IChartManager; // Die direkte, saubere Verbindung zum ChartManager

  // --- Aktueller Modus ---
  public mode: InputMode = 'crosshair_and_pan';

  // Magnet Mode aktivieren
  public isMagnetMode: boolean = true; 

  // Status-Variablen für das Panning (X-Achse schieben)
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private startX: number = 0;
  private startScrollOffset: number = 0;

  // Status-Variablen für das Y-Scaling (Preisachse stauchen)
  private isScalingY: boolean = false;
  private startY: number = 0;

  // Status-Variablen für Pane Resizing (Phase 15)
  private isResizingPane: boolean = false;
  private resizeSplitterIndex: number = -1; // Welcher Splitter wird gerade gezogen?

 // Status fürs Zeichnen
  private drawStep: number = 0;
  private activeDrawingNode: any = null;

  // Status für das Verschieben von Punkten
  private isDraggingPoint: boolean = false;
  private draggedPointIndex: 1 | 2 | null = null;

  // Status-Variablen für Mobile (Touch & Pinch-to-Zoom)
  private initialPinchDistance: number = 0;
  private initialCandleWidth: number = 0;

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
    window.addEventListener('paste', this.onPaste); 
    this.manager.isChartDirty = true; 

    // ==========================================
    // MOBILE TOUCH EVENTS
    // ==========================================
    // passive: false ist GANZ wichtig, damit wir e.preventDefault() rufen können!
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    this.canvas.addEventListener('touchcancel', this.onTouchEnd);
}

  // ==========================================
  // COPY & PASTE
  // ==========================================
  private onPaste = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;

    // Wir holen uns die Position, an der die Maus gerade schwebt
    const logicalCoords = this.getLogicalCoordinates(this.lastMouseX, this.lastMouseY);
    if (!logicalCoords || logicalCoords.paneId !== 'main') return;

    // 1. Zuerst auf Bilder prüfen (z.B. Screenshots)
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (!file) continue;

            // Das Bild aus der Zwischenablage in ein HTML-Image umwandeln
            const imgURL = URL.createObjectURL(file);
            const htmlImage = new Image();
            
            htmlImage.onload = () => {
                const newImageNode = new ImageNode();
                newImageNode.image = htmlImage;

                // Smart Scaling: Wenn das Bild riesig ist, stauchen wir es auf max. 300px
                const maxDim = 300;
                let w = htmlImage.width;
                let h = htmlImage.height;
                if (w > maxDim || h > maxDim) {
                    const ratio = Math.min(maxDim / w, maxDim / h);
                    w *= ratio;
                    h *= ratio;
                }
                newImageNode.width = w;
                newImageNode.height = h;

                // Bild an der Maus-Position ablegen
                newImageNode.point1 = { index: logicalCoords.index, price: logicalCoords.price };
                newImageNode.isSelected = true;

                this.manager.drawingManager.shapes.push(newImageNode);
                
                // Event für die API feuern
                this.manager.emit('drawingCreated', {
                    id: newImageNode.id,
                    type: 'image',
                    data: { point1: newImageNode.point1, width: w, height: h }
                });

                // Chart zwingen, sich neu zu zeichnen (da das Bild asynchron geladen wird)
                (this.manager as any).requestRedraw();
            };
            
            htmlImage.src = imgURL;
            e.preventDefault(); // Browser Standard-Aktion verhindern
            return; 
        }
    }

    // 2. Wenn kein Bild da war, prüfen wir auf Text
    const textData = e.clipboardData.getData('text');
    if (textData) {
        const newTextNode = new TextNode();
        newTextNode.text = textData;
        newTextNode.point1 = { index: logicalCoords.index, price: logicalCoords.price };
        newTextNode.isSelected = true;

        this.manager.drawingManager.shapes.push(newTextNode);

        this.manager.emit('drawingCreated', {
            id: newTextNode.id,
            type: 'text',
            data: { point1: newTextNode.point1, text: textData }
        });

        (this.manager as any).requestRedraw();
        e.preventDefault();
    }
  };

  // --- Die zentrale Mapping-Funktion ---
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
    
    // let, damit Mangnet-Mode den Preis noch anpassen kann
    let price =targetPane.getPriceScale().yToPrice(relativeY);
    let finalY = pixelY; 

    // ==========================================
    // MAGNET MODE (Snapping)
    // ==========================================
    // Wenn Magnet an ist, wir im Main-Chart sind und aktiv zeichnen oder Punkte verschieben:
    const isDrawingOrDragging = this.mode.startsWith('draw_') || this.isDraggingPoint;
    
    if (this.isMagnetMode && targetPane.getId() === 'main' && isDrawingOrDragging) {
        const candle = dataArray[index];
        if (candle) {
            // Wir prüfen den Abstand zu OHLC
            const prices = [candle.open, candle.high, candle.low, candle.close];
            let closestDist = Infinity;

            for (const p of prices) {
                const yPos = targetPane.getPriceScale().priceToY(p) + paneTopOffset;
                const dist = Math.abs(pixelY - yPos);
                
                // Magnet-Radius: 20 Pixel
                if (dist < 20 && dist < closestDist) {
                    closestDist = dist;
                    price = p;       
                    finalY = yPos;   
                }
            }
        }
    }
    

    return {
      x: pixelX,
      y: finalY,
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

    // ==========================================
    // KLICK AUF PANE-SPLITTER (Start Resizing)
    // ==========================================
    if (typeof (this.manager as any).getPanes === 'function') {
        const panes = (this.manager as any).getPanes();
        const totalHeight = this.canvas.getBoundingClientRect().height;
        let currentY = 0;
        
        for (let i = 0; i < panes.length - 1; i++) {
            currentY += totalHeight * panes[i].heightWeight;
            
            if (Math.abs(y - currentY) <= 4) {
                this.isResizingPane = true;
                this.resizeSplitterIndex = i;
                this.startY = e.clientY;
                this.canvas.style.cursor = 'row-resize';
                return; // Stopp: Wir resizen jetzt, kein Panning!
            }
        }
    }

    // --- Logische Koordinaten beim Klick berechnen ---
    const logicalCoords = this.getLogicalCoordinates(x, y);
    if (!logicalCoords || logicalCoords.paneId !== 'main') return;

    const targetPane = this.manager.getPaneAt(y);
    const priceScale = targetPane?.getPriceScale() as any;

    // ==========================================
    // STANDARD (Auswählen & Modifizieren)
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
                    return; 
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
        
        if (hitFound) return; 
        
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

            // ==========================================
            // NEU: HIER RUFEN WIR DIE REACT UI AN!
            // ==========================================
            if ((window as any).zChart) {
                (window as any).zChart.emit('drawingAdded');
            }

            this.drawStep = 0; 
            this.activeDrawingNode = null;
            this.mode = 'crosshair_and_pan'; 
            
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

            // ==========================================
            // NEU: HIER RUFEN WIR DIE REACT UI AN!
            // ==========================================
            if ((window as any).zChart) {
                (window as any).zChart.emit('drawingAdded');
            }

            this.drawStep = 0; 
            this.activeDrawingNode = null;
            this.mode = 'crosshair_and_pan'; 
            this.manager.setMousePos(x, y); 
            return;
        }
    }

    // ==========================================
    // MODUS: ZEICHNEN (Neuer Text)
    // ==========================================
    else if (this.mode === 'draw_text') {
        if (this.drawStep === 0) {
            // 1. Die neue Node erstellen und direkt im Chart platzieren
            const newTextNode = new TextNode();
            newTextNode.point1 = { index: logicalCoords.index, price: logicalCoords.price };
            
            // Vorübergehend "unsichtbar" machen oder leeren Text setzen
            this.manager.drawingManager.shapes.push(newTextNode);
            
            // 2. Das temporäre HTML-Eingabefeld erstellen
            const inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.style.position = 'absolute';
            // Wir platzieren es exakt da, wo der User geklickt hat (mit ein bisschen Offset)
            inputEl.style.left = `${e.clientX}px`;
            inputEl.style.top = `${e.clientY - 10}px`; 
            inputEl.style.zIndex = '1000'; // Sicherstellen, dass es GANZ vorne ist
            inputEl.style.fontSize = '16px';
            inputEl.style.background = 'transparent';
            inputEl.style.color = '#2962FF'; // Eine schöne blaue Farbe für die Eingabe
            inputEl.style.border = '1px dashed #2962FF';
            inputEl.style.outline = 'none';
            
            // Das Input-Feld in den Body hängen und fokussieren
            document.body.appendChild(inputEl);
            inputEl.focus();

            // 3. Warten, bis der User "Enter" drückt oder woanders hinklickt (Blur)
            const finishTextEntry = () => {
                const finalValue = inputEl.value;
                if (finalValue.trim() !== '') {
                    // Text in unsere Node übertragen
                    newTextNode.text = finalValue;
                    newTextNode.isSelected = true;

                    // API benachrichtigen (Dirty Check für Server-Speicherung)
                    this.manager.emit('drawingCreated', {
                        id: newTextNode.id,
                        type: 'text',
                        data: {
                            point1: newTextNode.point1,
                            text: finalValue
                        }
                    });
                } else {
                    // Wenn der Text leer war, löschen wir die Node einfach wieder
                    this.manager.drawingManager.removeDrawing(newTextNode.id);
                }

                // Aufräumen: HTML-Element löschen & Modus zurücksetzen
                if (inputEl.parentNode) {
                    inputEl.parentNode.removeChild(inputEl);
                }
                this.mode = 'crosshair_and_pan';
                (this.manager as any).requestRedraw();
            };

            // Event-Listener an das Input-Feld hängen
            inputEl.addEventListener('blur', finishTextEntry);
            inputEl.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') finishTextEntry();
                if (ev.key === 'Escape') {
                    inputEl.value = ''; // Bei Esc löschen wir den Text
                    finishTextEntry();
                }
            });

            this.drawStep = 0; // Wir bleiben bei 0, das HTML-Feld macht den Rest
            return;
        }
    }

    // ==========================================
    // MODUS: ZEICHNEN (Neuer Stift)
    // ==========================================
    else if (this.mode === 'draw_pen') {
        const newPen = new PenNode();
        newPen.points.push({ index: logicalCoords.index, price: logicalCoords.price });
        
        this.manager.drawingManager.shapes.push(newPen);
        this.activeDrawingNode = newPen;
        this.isDragging = true; 
        return;
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
    this.lastMouseX = x;
    this.lastMouseY = y;

    this.manager.setMousePos(x, y);
    const logicalCoords = this.getLogicalCoordinates(x, y);

    // ==========================================
    // NEU: DIRTY CHECK FÜR PERFORMANCE
    // Wenn wir etwas ziehen, skalieren oder zeichnen -> "Neues Foto" anfordern!
    // ==========================================
    if (this.isDragging || this.isScalingY || this.isResizingPane || this.isDraggingPoint || (this.mode !== 'crosshair_and_pan' && this.activeDrawingNode)) {
        this.manager.isChartDirty = true;
    }



    // ==========================================
    // PANE RESIZING (Höhen dynamisch anpassen)
    // ==========================================
    if (this.isResizingPane) {
        const deltaY = e.clientY - this.startY;
        const panes = (this.manager as any).getPanes();
        const totalHeight = this.canvas.getBoundingClientRect().height;
        
        // Pixel-Verschiebung in Prozent umrechnen
        const deltaWeight = deltaY / totalHeight;

        const topPane = panes[this.resizeSplitterIndex];
        const bottomPane = panes[this.resizeSplitterIndex + 1];

        // Schutzschalter: Ein Pane darf nicht kleiner als ca. 50 Pixel werden!
        const minWeight = 50 / totalHeight;

        if (topPane.heightWeight + deltaWeight > minWeight && bottomPane.heightWeight - deltaWeight > minWeight) {
            // Dem einen Pane Prozentpunkte geben, dem anderen abziehen
            topPane.heightWeight += deltaWeight;
            bottomPane.heightWeight -= deltaWeight;

            this.startY = e.clientY; // StartY für den nächsten Frame updaten
            (this.manager as any).requestRedraw();
        }
        return; // Stopp: Nichts anderes machen, während wir ziehen
    }

    // ==========================================
    // CROSSHAIR EVENT FEUERN 
    // ==========================================
    if (logicalCoords) {
        const dataArray = this.manager.dataStore.getAllData();
        const hoveredCandle = dataArray[logicalCoords.index] || null;

        this.manager.emit('crosshairMove', {
            x: x,                       // Pixel X für UI-Overlays
            y: y,                       // Pixel Y für UI-Overlays
            price: logicalCoords.price, // Der exakte Y-Preis
            time: logicalCoords.time,   // Der Unix-Timestamp der X-Achse
            index: logicalCoords.index, // Der Daten-Index
            paneId: logicalCoords.paneId, // In welcher Pane sich die Maus befindet
            candle: hoveredCandle // Anzeige OHLCV Daten  
        });
    }

    // --- 1. LIVE PREVIEWS (Beim ersten Zeichnen) ---
    if (this.drawStep === 1 && this.activeDrawingNode && logicalCoords) {
        // Vorschau für Trendlinie & Fibo
        if (this.mode === 'draw_trendline' || this.mode === 'draw_fibo') {
            this.activeDrawingNode.point2 = { index: logicalCoords.index, price: logicalCoords.price };
        }
    }

    // --- 2. ADVANCED NODE INTERACTION (Rotation / Spiegeln) ---
    // Wenn wir ein Emoji selektiert haben und gerade ziehen
    if (this.isDragging && this.activeDrawingNode && this.activeDrawingNode.point1 && logicalCoords) {
        
        // Fall A: Text und Bilder wollen wir einfach nur VERSCHIEBEN
        if (this.activeDrawingNode instanceof TextNode || this.activeDrawingNode instanceof ImageNode) {
            this.activeDrawingNode.point1 = { index: logicalCoords.index, price: logicalCoords.price };
            return; // Wichtig: Panning stoppen
        }

        // Fall B: Emojis wollen wir ROTIEREN und SKALIEREN (Dein bestehender Code)
        if (this.activeDrawingNode instanceof EmojiNode) {
        // Zuerst die aktuelle Pane und deren PriceScale holen
            const targetPane = this.manager.getPaneAt(y);
            const priceScale = targetPane?.getPriceScale() as any;
                
        // Wenn keine Preisskala gefunden wurde, können wir nicht rechnen
        if (!priceScale) return;

        const centerX = this.timeScale.indexToX(this.activeDrawingNode.point1.index);
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
        return;
    }
}

    // --- 3. POINT DRAGGING (Bestehende Logik für Ankerpunkte) ---
    if (this.isDraggingPoint && this.activeDrawingNode && this.draggedPointIndex && logicalCoords) {
        const pointKey = `point${this.draggedPointIndex}` as 'point1' | 'point2';
        this.activeDrawingNode[pointKey] = { index: logicalCoords.index, price: logicalCoords.price };
    }

    // --- 3.5. FREEHAND DRAWING (Stift) ---
    if (this.mode === 'draw_pen' && this.isDragging && this.activeDrawingNode && logicalCoords) {
        // Neuen Punkt hinzufügen
        this.activeDrawingNode.points.push({ index: logicalCoords.index, price: logicalCoords.price });
        return; // WICHTIG: Damit wir nicht gleichzeitig pannen!
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
    if (this.isDraggingPoint && this.activeDrawingNode) {
        
        this.manager.emit('drawingChanged', {
            id: this.activeDrawingNode.id,
            type: 'trendline',
            data: {
                point1: this.activeDrawingNode.point1,
                point2: this.activeDrawingNode.point2
            }
        });
    }

    if (this.mode === 'draw_pen' && this.activeDrawingNode) {
        this.activeDrawingNode.isSelected = true;
        
        // API benachrichtigen
        this.manager.emit('drawingCreated', {
            id: this.activeDrawingNode.id,
            type: 'pen',
            data: { points: this.activeDrawingNode.points }
        });
        
        this.activeDrawingNode = null;
        this.mode = 'crosshair_and_pan'; // Zurück zum Mauszeiger
    }

    this.isDragging = false;
    this.isScalingY = false;
    this.isDraggingPoint = false;
    this.draggedPointIndex = null;
    this.isResizingPane = false;
    this.resizeSplitterIndex = -1;

    if (this.mode !== 'draw_trendline') { // Cursor nicht zurücksetzen, wenn wir noch zeichnen
        this.canvas.style.cursor = 'default';
    }
    // NEU: Nach dem Loslassen einmal final den Chart neu zeichnen
    this.manager.isChartDirty = true;
  };

  /**
   * Hilfsfunktion für dynamische Cursor-Icons
   */
  private updateCursor(x: number, y: number) {

    // ==========================================
    // HOVER-CHECK FÜR PANE-SPLITTER
    // ==========================================
    if (typeof (this.manager as any).getPanes === 'function') {
        const panes = (this.manager as any).getPanes();
        const totalHeight = this.canvas.getBoundingClientRect().height;
        let currentY = 0;
        
        // Wir prüfen alle Panes bis auf die letzte
        for (let i = 0; i < panes.length - 1; i++) {
            currentY += totalHeight * panes[i].heightWeight;
            
            // Wenn die Maus +/- 4 Pixel an dieser Grenze ist:
            if (Math.abs(y - currentY) <= 4) {
                this.canvas.style.cursor = 'row-resize';
                return; // Cursor gesetzt, wir sind fertig
            }
        }
    }

    if (this.isDragging || this.isScalingY || this.isDraggingPoint || this.isResizingPane) return;

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
    this.manager.isChartDirty = true; 
  };

  // ==========================================
  // MOBILE TOUCH LOGIK (Phase 15)
  // ==========================================

  private onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Verhindert, dass die Webseite beim Wischen scrollt

      const rect = this.canvas.getBoundingClientRect();

      if (e.touches.length === 1) {
          // EIN FINGER: Start Panning & Crosshair aktivieren
          const touch = e.touches[0];
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;

          this.isDragging = true;
          this.startX = touch.clientX;
          this.startScrollOffset = this.timeScale.scrollOffset;

          // Crosshair platzieren
          this.manager.setMousePos(x, y);

          // Prüfen, ob wir die Preisachse stauchen wollen (am rechten Rand wischen)
          const isOverYAxis = x > (rect.width - this.manager.options.layout.axisWidth);
          if (isOverYAxis) {
              this.isScalingY = true;
              this.startY = touch.clientY;
          }
      } 
      else if (e.touches.length === 2) {
          // ZWEI FINGER: Pinch-to-Zoom initialisieren
          this.isDragging = false; // Panning sofort abbrechen
          this.isScalingY = false;

          const t1 = e.touches[0];
          const t2 = e.touches[1];
          
          // Satz des Pythagoras: Wie weit sind die Finger voneinander entfernt?
          this.initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          this.initialCandleWidth = this.timeScale.candleWidth;
      }
  };

  private onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();

      if (e.touches.length === 1) {
          // EIN FINGER: Panning & Crosshair updaten
          const touch = e.touches[0];
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;

          this.manager.setMousePos(x, y);

          // Preisachse ziehen
          if (this.isScalingY) {
              const deltaY = touch.clientY - this.startY;
              this.startY = touch.clientY;
              this.manager.zoomPrice(deltaY);
              this.manager.isChartDirty = true;
              return;
          }

          // Chart horizontal verschieben
          if (this.isDragging && !this.activeDrawingNode) {
              const deltaX = touch.clientX - this.startX;
              this.timeScale.scrollOffset = this.startScrollOffset + deltaX;
              this.manager.isChartDirty = true;
          }

          // Crosshair Live-Update für Mobile
          const logicalCoords = this.getLogicalCoordinates(x, y);
          if (logicalCoords) {
              const dataArray = this.manager.dataStore.getAllData();
              const hoveredCandle = dataArray[logicalCoords.index] || null;

              this.manager.emit('crosshairMove', {
                  x: x, y: y,
                  price: logicalCoords.price, time: logicalCoords.time,
                  index: logicalCoords.index, paneId: logicalCoords.paneId,
                  candle: hoveredCandle
              });
          }

      } 
      else if (e.touches.length === 2) {
          // ZWEI FINGER: Zoom berechnen
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

          if (this.initialPinchDistance > 0) {
              // Verhältnis aus neuer und alter Entfernung = Zoomfaktor
              const scale = currentDistance / this.initialPinchDistance;
              
              this.timeScale.candleWidth = this.initialCandleWidth * scale;
              // Zoom-Grenzen einhalten
              this.timeScale.candleWidth = Math.max(1, Math.min(this.timeScale.candleWidth, 100));
              
              this.manager.isChartDirty = true;
          }
      }
  };

  private onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length === 0) {
          // Alle Finger weg -> Alles zurücksetzen
          this.isDragging = false;
          this.isScalingY = false;
          this.initialPinchDistance = 0;
          
          this.manager.setMousePos(null, null); // Crosshair ausblenden
          this.manager.isChartDirty = true;
      } 
      else if (e.touches.length === 1) {
          // Einer von zwei Fingern wurde losgelassen -> Zurück in den Panning-Modus
          this.initialPinchDistance = 0;
          this.isDragging = true;
          this.startX = e.touches[0].clientX;
          this.startScrollOffset = this.timeScale.scrollOffset;
      }
  };

}
