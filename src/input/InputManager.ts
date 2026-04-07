// input/InputManager.ts

import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from '../core/ChartOptions';

/**
 * Ein Interface beschreibt, welche Methoden der ChartManager besitzen muss.
 * So kann der InputManager mit ihm reden, ohne die ganze Datei importieren zu müssen.
 */
interface IChartManager {
  options: ChartConfig;
  zoomPrice(deltaY: number): void;
  setMousePos(x: number | null, y: number | null): void;
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

  private onMouseDown = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
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
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    // Relative Maus-Koordinaten im Canvas berechnen
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Dem Manager die aktuelle Position für das Fadenkreuz melden
    this.manager.setMousePos(x, y);

    // 2. Logik: Panning (X-Achse verschieben)
    if (this.isDragging) {
      const deltaX = e.clientX - this.startX;
      this.timeScale.scrollOffset = this.startScrollOffset + deltaX;
    }

    // 3. Logik: Y-Achsen Scaling (Preis stauchen)
    if (this.isScalingY) {
      const deltaY = e.clientY - this.startY;
      this.startY = e.clientY; // Startpunkt für den nächsten Frame aktualisieren

      // Sauberer Aufruf am Manager (Hack entfernt!)
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