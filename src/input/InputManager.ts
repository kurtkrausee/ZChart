// input/InputManager.ts

import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from '../core/ChartOptions';
import { TrendLineNode } from '../nodes/TrendLineNode';

// --- NEU (Phase 8): Interfaces für das Koordinaten-Mapping ---

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
  getPriceScale(): { yToPrice(y: number): number };
}

/**
 * Ein Interface beschreibt, welche Methoden der ChartManager besitzen muss.
 * So kann der InputManager mit ihm reden, ohne die ganze Datei importieren zu müssen.
 */
interface IChartManager {
  options: ChartConfig;
  testLine: TrendLineNode; // NEU: Damit der InputManager die Test-Linie direkt beeinflussen kann
  zoomPrice(deltaY: number): void;
  setMousePos(x: number | null, y: number | null): void;
  // NEU: Der Manager muss uns sagen können, welche Pane an Pixel-Y liegt
  getPaneAt(pixelY: number): IPane | null; 
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private timeScale: TimeScale;
  private manager: IChartManager; // Die direkte, saubere Verbindung zum ChartManager

  // Status-Variablen für das Panning (X-Achse schieben)
  private isDragging: boolean = false;
  private startX: number = 0;
  private startScrollOffset: number = 0;

  // Status-Variablen für das Y-Scaling (Preisachse stauchen)
  private isScalingY: boolean = false;
  private startY: number = 0;

  // NEU: Zählt die Klicks für unsere Test-Linie (0 = nichts, 1 = Startpunkt gesetzt)
  private testLineStep: number = 0;

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
    this.canvas.addEventListener('mouseleave', () => {
      this.manager.setMousePos(null, null);
    });
  }

  // --- NEU (Phase 8): Die zentrale Mapping-Funktion ---
  public getLogicalCoordinates(pixelX: number, pixelY: number): LogicalCoordinates | null {
    // 1. Zuständige Pane über den Manager ermitteln
    const targetPane = this.manager.getPaneAt(pixelY);
    if (!targetPane) return null;

    // 2. Zeit und Index über die TimeScale ermitteln
    // HINWEIS: Wir nehmen an, dass TimeScale eine Methode indexToTime() oder ähnlich hat.
    const index = this.timeScale.xToIndex(pixelX);
    // Fallback: Wenn indexToTime noch nicht existiert, fangen wir das hier für den Moment ab.
    const time = (this.timeScale as any).indexToTime ? (this.timeScale as any).indexToTime(index) : null;

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
    } else {
      // Modus: Chart verschieben
      this.isDragging = true;
      this.startX = e.clientX;
      this.startScrollOffset = this.timeScale.scrollOffset;
      this.canvas.style.cursor = 'grabbing';

      // --- NEU (Phase 8): Logische Koordinaten beim Klick berechnen ---
      const logicalCoords = this.getLogicalCoordinates(x, y);
      if (logicalCoords && logicalCoords.paneId === 'main') {
        
        // 1. HIT-TESTING: Haben wir auf eine bestehende Linie geklickt?
        const targetPane = this.manager.getPaneAt(y);
        if (targetPane) {
          const isHit = this.manager.testLine.hitTest(
            x, y, this.timeScale, targetPane.getPriceScale() as any
          );
          
          if (isHit) {
            // Linie auswählen/abwählen und abbrechen (nicht neu zeichnen)
            this.manager.testLine.isSelected = !this.manager.testLine.isSelected;
            return; 
          }
        }

        // 2. ZEICHNEN: Wenn wir die Linie nicht getroffen haben, zeichnen wir neu
        if (this.testLineStep === 0) {
          // Erster Klick: Startpunkt setzen, Endpunkt leeren
          this.manager.testLine.point1 = { index: logicalCoords.index, price: logicalCoords.price };
          this.manager.testLine.point2 = null;
          this.testLineStep = 1;
          return;
        } else if (this.testLineStep === 1) {
          this.manager.testLine.point2 = { index: logicalCoords.index, price: logicalCoords.price };
          this.testLineStep = 0; 
          return; // <-- Abbruch!
        }
      }
      
      // 3. PANNING (Nur wenn wir nichts anderes gemacht haben)
      this.isDragging = true;
      this.startX = e.clientX;
      this.startScrollOffset = this.timeScale.scrollOffset;
      this.canvas.style.cursor = 'grabbing';

    }
  };

  private onMouseMove = (e: MouseEvent) => {
    // Relative Maus-Koordinaten im Canvas berechnen
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Dem Manager die aktuelle Position für das Fadenkreuz melden
    this.manager.setMousePos(x, y);

    // --- NEU: Hover-Effekt (Hit-Testing bei Mausbewegung) ---
    const targetPane = this.manager.getPaneAt(y);
    if (targetPane && targetPane.getId() === 'main') {
      const isHit = this.manager.testLine.hitTest(
        x, y, this.timeScale, targetPane.getPriceScale() as any
      );
      
      // Zustand aktualisieren (Mauszeiger zu Hand ändern, falls getroffen)
      this.manager.testLine.isHovered = isHit;
      this.canvas.style.cursor = isHit ? 'pointer' : (this.isDragging ? 'grabbing' : 'default');
    }

    // 2. Logik: Panning (X-Achse verschieben)
    if (this.isDragging) {
      const deltaX = e.clientX - this.startX;
      this.timeScale.scrollOffset = this.startScrollOffset + deltaX;
    }

    // 3. Logik: Y-Achsen Scaling (Preis stauchen)
    if (this.isScalingY) {
      const deltaY = e.clientY - this.startY;
      this.startY = e.clientY; // Startpunkt für den nächsten Frame aktualisieren

      // Sauberer Aufruf am Manager
      this.manager.zoomPrice(deltaY);
    }
  };

  private onMouseUp = () => {
    // Alle Modi zurücksetzen
    this.isDragging = false;
    this.isScalingY = false;
    this.canvas.style.cursor = 'default';
  };

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