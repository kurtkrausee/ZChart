// input/InputManager.ts
// Version: 4.10.0 | Updated: 2026-08-16 | By: Agent
// 4.10.0 (MSO-P3): crosshairMove-Event trägt `compares[]` (Symbol/Farbe/Preis/%-Change der sichtbaren Compare-Overlays am Cursor-Bar) fürs Datenfenster.
// ZV10-P11: Zeitachse ziehen = X-Zoom (rechts strecken, links stauchen; Anker
//   rechter Content-Rand), Touch-Griffzone +12px, ew-resize-Cursor.
// ZV10-P7c: Multi-Y — Y-Achsen-Hits (Drag + Wheel, inkl. Touch-Griffzone) laufen
//   über findAxisScaleAt (handlers/axisHitTest.ts); Zoom trifft die gegriffene
//   Spalten-Scale (scalingYScaleId → zoomPrice/zoomPriceAnchored mit scaleId).
//   Pinch bleibt Default-Scale ('pointer'/Content-Geste).
// ZV10-P6: Wheel-Zoom respektiert options.timeScale.zoomAnchor ('right_edge' =
//   Anker letzte Kerze, MetaTrader); Pinch bleibt immer 'pointer'.
// ZT-P1: Mouse-Events → Pointer-Events (pointerdown/move/up/cancel, setPointerCapture);
// Touch-Notbehelf (synthetische MouseEvents, anker-loser Pinch) ersatzlos entfernt.
// ZT-P2: Touch-Gesten — Pinch-Zoom mit Fokuspunkt-Anker (X) bzw. Preis-Anker (Y),
// Long-Press = Crosshair-Führung, Double-Tap = Fit / Multi-Click-Finalisierung.
// ZT-P3: Fingertaugliche Hit-Targets — Probe-Ring für Anchor/Body/Emoji-Zonen,
// Divider ±12px, Achsen-Griffzonen +12px (nur Touch; Maus bleibt pixelgleich).
// ZT-P4a: Long-Press auf Zeichnung → synthetisches contextmenu-Event (Flag
// zchartLongPress); natives Touch-contextmenu wird unterdrückt (ein Menü-Pfad).
// ZT-P5: window-Listener move/up/cancel passive (kein Scroll-Blocking); updateCursor
// nur noch für Maus/Pen — Touch spart die Shape-hitTest-Schleife pro Move.

import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from '../core/ChartOptions';
import { DrawingManager } from '../core/DrawingManager';
import { findAxisScaleAt } from './handlers/axisHitTest';
import { BrushNode } from '../nodes/tools/BrushNode';
import { NoteNode } from '../nodes/tools/NoteNode';
import { PolylineNode } from '../nodes/tools/PolylineNode';
import { EmojiNode } from '../nodes/tools/EmojiNode';
import { TriangleNode } from '../nodes/tools/TriangleNode';
import type { DrawableShape } from '../types/DrawableShape';
import { dispatchClick, dispatchLivePreview, dispatchDoubleClick, dispatchDoubleClickHit } from './tools';
import type { InterceptorPhase, PointerInterceptor, ZChartPointerEvent } from './PointerInterceptor';


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
export type InputMode = 'crosshair_and_pan' | 'draw_trendline' | 'draw_fibo' | 'draw_hline' | 'draw_vline' | 'draw_ray' | 'draw_extended_line' | 'draw_parallel_channel' | 'draw_disjoint_channel' | 'draw_flat_top_bottom' | 'draw_regression_trend' | 'draw_rectangle' | 'draw_text_label' | 'draw_measure' | 'draw_fibo_extension' | 'draw_arrow' | 'draw_price_label' | 'draw_ellipse' | 'draw_triangle' | 'draw_fib_time_zones' | 'draw_brush' | 'draw_emoji' | 'draw_fib_channel' | 'draw_fib_fan' | 'draw_fib_arcs' | 'draw_info_line' | 'draw_cross_line' | 'draw_hray' | 'draw_trend_angle' | 'draw_pitchfork' | 'draw_fib_trend_time' | 'draw_fib_circles' | 'draw_fib_spiral' | 'draw_fib_wedge' | 'draw_pitchfan' | 'draw_gann_box' | 'draw_gann_square_fixed' | 'draw_gann_square' | 'draw_gann_fan' | 'draw_xabcd_pattern' | 'draw_cypher_pattern' | 'draw_head_and_shoulders' | 'draw_abcd_pattern' | 'draw_triangle_pattern' | 'draw_three_drives' | 'draw_elliott_impulse' | 'draw_elliott_correction' | 'draw_elliott_triangle' | 'draw_elliott_double_combo' | 'draw_elliott_triple_combo' | 'draw_cyclic_lines' | 'draw_time_cycles' | 'draw_sine_line' | 'draw_long_position' | 'draw_short_position' | 'draw_forecast' | 'draw_bars_pattern' | 'draw_ghost_feed' | 'draw_sector' | 'draw_anchored_vwap' | 'draw_fixed_range_volume_profile' | 'draw_anchored_volume_profile' | 'draw_price_range' | 'draw_date_range' | 'draw_date_price_range' | 'draw_highlighter' | 'draw_arrow_mark_up' | 'draw_arrow_mark_down' | 'draw_circle' | 'draw_rotated_rectangle' | 'draw_arc' | 'draw_anchored_text' | 'draw_note' | 'draw_pin' | 'draw_price_note' | 'draw_table' | 'draw_polyline' | 'draw_path' | 'draw_curve' | 'draw_double_curve' | 'draw_callout' | 'draw_comment' | 'draw_signpost' | 'draw_flag' | 'draw_image_note';

// ToolId — öffentliche Werkzeug-Namen der Toolbar/API. Single source of truth ist
// InputMode: jeder Draw-Modus heißt `draw_<toolId>`, plus 'pan' → 'crosshair_and_pan'.
// Per Template-Literal-Type abgeleitet → kein zweiter, manuell gepflegter Union mehr.
export type ToolId = 'pan' | (InputMode extends `draw_${infer T}` ? T : never);

// ToolId → InputMode. 'pan' ist der einzige Sonderfall; alles andere ist `draw_<tool>`.
export function toolIdToInputMode(tool: ToolId): InputMode {
    return tool === 'pan' ? 'crosshair_and_pan' : (`draw_${tool}` as InputMode);
}


/**
 * Ein Interface beschreibt, welche Methoden der ChartManager besitzen muss.
 * So kann der InputManager mit ihm reden, ohne die ganze Datei importieren zu müssen.
 */
export interface IChartManager {
  options: ChartConfig;
  drawingManager: DrawingManager;
  zoomPrice(deltaY: number, paneId?: string, scaleId?: string): void;
  /** ZT-P2: Faktor-basierter Anker-Zoom der Preisachse (Pinch). */
  zoomPriceFactorAnchored(rangeFactor: number, paneId?: string, anchorPrice?: number, scaleId?: string): void;
  panPrice(deltaY: number, paneId?: string, scaleId?: string): void;
  /** ZV10-P7c: Zusatz-Achsen-Spalten des letzten Render-Passes (Multi-Y). */
  getAxisColumns?(): import('../core/axisLayout').AxisColumn[];
  scrollToEnd(): void;
  resetYScale(): void;
  setMousePos(x: number | null, y: number | null): void;
  getPaneAt(pixelY: number): IPane | null;
  /** MSO-P3: Panes mit Node-Liste (Compare-Werte fürs crosshairMove-Event). */
  getPanes?(): Array<{ id: string; nodes: unknown[] }>;
  emit(eventName: string, data: any): void;
  dataStore: any;
  getDividerPositions(): { y: number, aboveIdx: number, belowIdx: number }[];
  getCloseButtonAt(x: number, y: number): string | null;
  resizePanesByDivider(dividerIdx: number, deltaPixels: number): void;
  togglePaneVisibility(paneId: string): void;
  /** R-perf-100k P1: Dirty-Flag setzen — Render-Loop greift im naechsten rAF. */
  markDirty(): void;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private timeScale: TimeScale;
  public manager: IChartManager;

  // --- Aktueller Modus ---
  public mode: InputMode = 'crosshair_and_pan';

  /** Magnet mode: snap drawing points to OHLC values */
  public magnetMode: 'off' | 'close' | 'hl' | 'ohlc' = 'off';

  /** Keep drawing mode: stay in current tool after placing */
  public keepDrawing: boolean = false;

  /** Cursor mode override from React (arrow, dot, laser, eraser etc.) */
  public cursorModeOverride: string = 'crosshair';

  /** Custom CSS cursor strings for each cursor mode */
  private static readonly DOT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%232962ff'/%3E%3Ccircle cx='8' cy='8' r='2' fill='white'/%3E%3C/svg%3E") 8 8, crosshair`;
  private static readonly ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, pointer`;

  /** Lock all: prevent selection/modification of existing drawings */
  public lockAll: boolean = false;

  // ── Pointer-Interceptor-Chain (Roadmap zchart-input-priority, P2) ──────
  /** Registrierte Interceptoren, absteigend nach `priority` sortiert gehalten. */
  private interceptors: PointerInterceptor[] = [];
  /** Aktiver Drag-Owner: hat in `down` konsumiert und bekommt `move`/`up`/`leave`
   *  exklusiv (mit effektiver Priorität 1000), bis er ein `up`/`leave` konsumiert. */
  private activeDragOwner: PointerInterceptor | null = null;

  /** Default style for new drawings (set from ChartSettings) */
  public defaultLineColor: string = '#2962FF';
  public defaultLineWidth: number = 2;
  // Dedicated defaults for brush / highlighter (NOT shared with line tools)
  public brushColor: string = '#FFD700';
  public brushWidth: number = 3;
  public highlighterColor: string = '#FFFF00';
  public highlighterWidth: number = 20;

  /** Active emoji character for draw_emoji mode */
  public activeEmojiChar: string = '😊';

  /** Active pitchfork variant for draw_pitchfork mode */

  /** Pinch-to-Zoom-Gate (via ZChartAPI.setPinchZoom). */
  public pinchZoomEnabled: boolean = true;

  // ── ZT-P2: Touch-Gesten (Pinch / Long-Press / Double-Tap) ────────────────
  private static readonly LONG_PRESS_MS = 500;
  private static readonly TAP_SLOP_PX = 8;
  private static readonly DOUBLE_TAP_MS = 300;
  private static readonly DOUBLE_TAP_DIST_PX = 30;
  private static readonly PINCH_MIN_DIST_PX = 10;

  // ── ZT-P3: Fingertaugliche Hit-Targets (coarse pointer) ───────────────────
  /** Zusätzlicher Radius, mit dem Touch-Taps um den Punkt herum nachgetestet
   *  werden (Probe-Ring) — wirkt wie größere Anchor-/Body-/Emoji-Targets,
   *  ohne die ANCHOR_RADIUS/HIT_TOLERANCE der ~75 Tool-Nodes anzufassen. */
  private static readonly COARSE_HIT_BONUS_PX = 12;
  /** Verbreiterung der Achsen-Griffzonen (Y-Achse links, X-Achse oben) bei Touch. */
  private static readonly COARSE_AXIS_BONUS_PX = 12;
  /** Pane-Divider-Toleranz: Maus ±4px (Bestand), Touch ±12px. */
  private static readonly DIVIDER_TOL_MOUSE_PX = 4;
  private static readonly DIVIDER_TOL_COARSE_PX = 12;

  /** Aktive Touch-/Pen-Pointer (canvas-relativ) inkl. Down-Position für Tap-/Slop-Erkennung. */
  private activeTouches: Map<number, {
    x: number; y: number; clientX: number; clientY: number;
    downX: number; downY: number; downTime: number; moved: boolean;
  }> = new Map();

  /** Der Touch-Pointer, der die Single-Pointer-Logik (Pan/Draw/Crosshair) steuert.
   *  I.d.R. der erste Finger; nach einem Pinch kann der VERBLEIBENDE Finger
   *  (auch non-primary) das Steuer übernehmen. Maus steuert immer. */
  private steeringPointerId: number | null = null;

  private isSteeringPointer(e: PointerEvent): boolean {
    if (e.pointerType === 'mouse') return true;
    if (this.steeringPointerId !== null) return e.pointerId === this.steeringPointerId;
    return e.isPrimary;
  }

  // Pinch: Achse wird beim Start aus der Finger-Geometrie klassifiziert und
  // bleibt für die Geste fix ('x' = Zeitachse mit Fokuspunkt-Anker, 'y' =
  // Preisachse der Pane unterm Fokuspunkt mit Preis-Anker).
  private isPinching: boolean = false;
  private pinchAxis: 'x' | 'y' = 'x';
  private pinchLastDist: number = 0;
  private pinchLastFocalX: number = 0;
  private pinchPaneId: string | undefined;
  private pinchAnchorPrice: number | undefined;

  // Long-Press: Finger ruht → Kontextmenü (ZT-P6; bis dahin Crosshair-Führung).
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  // Double-Tap-Erkennung (Compat-dblclick ist für Touch per preventDefault unterdrückt).
  private lastTapTime: number = 0;
  private lastTapX: number = 0;
  private lastTapY: number = 0;
  /** Modus beim ersten Tap — Fit feuert nur, wenn BEIDE Taps im Pan-Modus lagen
   *  (verhindert Überraschungs-Fit direkt nach schnellem 2-Klick-Zeichnen). */
  private lastTapMode: InputMode = 'crosshair_and_pan';

  // Pane divider resize state
  private isResizingDivider: boolean = false;
  private activeDividerIndex: number = -1;
  private dividerStartY: number = 0;

  // Status-Variablen für das Panning (X-Achse schieben)
  private isDragging: boolean = false;
  private startX: number = 0;
  private startScrollOffset: number = 0;
  /** Pane under the cursor at mousedown – used so vertical drag pans that pane's Y axis (not just 'main'). */
  private draggingPaneId: string | null = null;

  // Status-Variablen für das Y-Scaling (Preisachse stauchen)
  private isScalingY: boolean = false;
  /** ZV10-P11: Zeitachse ziehen = X-Zoom (Drag auf dem X-Achsen-Band). */
  private isScalingX: boolean = false;
  private scalingXLastX: number = 0;
  /** ZV10-P7c: Scale der gegriffenen Achsen-Spalte (null = Default 'right'). */
  private scalingYScaleId: string | null = null;
  private startY: number = 0;
  /** Pane whose Y-axis is being scaled (recorded on mousedown, used during drag) */
  private scalingYPaneId: string | null = null;

 // Status fürs Zeichnen
  public drawStep: number = 0;
  public activeDrawingNode: DrawableShape | null = null;

  // Status für das Verschieben von Punkten
  private isDraggingPoint: boolean = false;
  private draggedPointIndex: number | null = null;

  /** Emoji drag mode: 'move' = reposition, 'rotate' = free rotation, 'resize' = corner resize+flip */
  private emojiDragMode: 'move' | 'rotate' | 'resize' | null = null;
  /** Corner sign for resize flip detection (e.g., [1,1] = bottom-right) */
  private emojiResizeCornerSign: [number, number] = [1, 1];
  /** scaleX/Y at the start of resize drag (to toggle flip) */
  private emojiInitialScaleX: number = 1;
  private emojiInitialScaleY: number = 1;
  /** Angle from center to mouse at rotation drag start */
  private emojiDragStartAngle: number = 0;
  /** Node rotation at rotation drag start */
  private emojiDragStartRotation: number = 0;

  // Body-move state: drag entire shape by its body
  private isMovingBody: boolean = false;
  private bodyMoveLastIndex: number = 0;
  private bodyMoveLastPrice: number = 0;

  constructor(canvas: HTMLCanvasElement, timeScale: TimeScale, manager: IChartManager) {
    this.canvas = canvas;
    this.timeScale = timeScale;
    this.manager = manager;
    this.attachListeners();
  }

  /** Snap a price to the nearest OHLC value of the candle at the given index */
  public applyMagnet(index: number, price: number): number {
    if (this.magnetMode === 'off') return price;
    const allData = this.manager.dataStore.getAllData();
    const idx = Math.round(index);
    if (idx < 0 || idx >= allData.length) return price;
    const c = allData[idx];

    let candidates: number[];
    switch (this.magnetMode) {
      case 'close': candidates = [c.close]; break;
      case 'hl':    candidates = [c.high, c.low]; break;
      case 'ohlc':  candidates = [c.open, c.high, c.low, c.close]; break;
      default: return price;
    }
    let best = price;
    let bestDist = Infinity;
    for (const val of candidates) {
      const d = Math.abs(val - price);
      if (d < bestDist) { bestDist = d; best = val; }
    }
    return best;
  }

  private attachListeners() {
    // ZT-P1: Pointer-Events (Maus/Pen/Touch vereinheitlicht; Maus = pointerType 'mouse').
    // down auf dem Canvas; move/up/cancel window-weit — deckt Loslassen außerhalb
    // des Canvas ab und funktioniert auch mit setPointerCapture (Events retargeten
    // auf das Canvas und bubbeln bis window).
    // ZT-P5: move/up/cancel sind passive — die Handler rufen nie preventDefault
    // (Scroll-Blocking übernimmt touch-action:none auf dem Canvas). pointerdown
    // bleibt non-passive (preventDefault für Touch unterdrückt Compat-Events).
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.onPointerCancel, { passive: true });

    // Double-click: X-area → scroll to end, Y-area → reset auto-scale
    this.canvas.addEventListener('dblclick', this.onDblClick);

    // Right-click: cancel multi-click drawing in progress, OR show context menu later
    this.canvas.addEventListener('contextmenu', this.onContextMenu);

    // ESC key: cancel multi-click drawing in progress
    window.addEventListener('keydown', this.onKeyDown);

    // Zooming via Mausrad
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Wenn der Pointer das Canvas verlässt, setzen wir das Fadenkreuz im Manager auf null
    // (R2-P4: benannte Methode statt Inline-Lambda — abmeldbar + Interceptor-leave-Phase).
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  /**
   * Cancel any in-progress drawing and remove its partial node from the canvas.
   * Used by ESC key and right-click for multi-click tools (Forecast, Polyline, etc.).
   */
  private cancelInProgressDrawing(): boolean {
    if (this.activeDrawingNode && this.drawStep > 0) {
      this.manager.drawingManager.removeDrawing(this.activeDrawingNode.id);
      this.drawStep = 0;
      this.activeDrawingNode = null;
      this.mode = 'crosshair_and_pan';
      this.manager.emit('toolReset', null);
      this.manager.markDirty();
      return true;
    }
    return false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // Tasten nie abgreifen, wenn der Fokus in einem Eingabefeld liegt.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.key === 'Escape') {
      if (this.cancelInProgressDrawing()) { e.preventDefault(); return; }
      if (this.manager.options.interaction.escDeselect === false) return;
      const hadSelection = this.manager.drawingManager.shapes.some(sh => sh.isSelected);
      if (hadSelection) {
        this.manager.drawingManager.deselectAll();
        this.manager.emit('drawingDeselected', { id: null });
        this.manager.markDirty();
        e.preventDefault();
        return;
      }
      if (this.mode !== 'crosshair_and_pan') {
        this.mode = 'crosshair_and_pan';
        this.manager.emit('toolReset', null);
        e.preventDefault();
      }
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && this.manager.options.interaction.deleteKey !== false) {
      const selected = this.manager.drawingManager.shapes.filter(sh => sh.isSelected && !sh.isLocked);
      if (selected.length === 0) return;
      for (const sh of selected) {
        this.manager.drawingManager.removeDrawing(sh.id);
        this.manager.emit('drawingDeleted', { id: sh.id, type: sh.shapeType });
      }
      this.manager.markDirty();
      e.preventDefault();
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    // ZT-P4: Natives Touch-contextmenu (Browser-Long-Press, z.B. Android)
    // unterdrücken — der eigene Long-Press-Pfad dispatcht ein synthetisches
    // Event mit Flag. So gibt es genau EINEN deterministischen Menü-Pfad.
    const isSynthetic = (e as any).zchartLongPress === true;
    if (!isSynthetic && (e as PointerEvent).pointerType === 'touch') {
      e.preventDefault();
      e.stopPropagation(); // React-Root-Delegation (onContextMenu) nicht erreichen
      return;
    }
    // Rechtsklick bricht aktives Zeichnen ab; sonst Kontextmenue-Event fuer die
    // Host-App (die Engine rendert selbst nie ein Menue).
    e.preventDefault();
    if (this.cancelInProgressDrawing()) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.manager.emit('contextMenuRequested', {
      x, y,
      clientX: e.clientX,
      clientY: e.clientY,
      logical: this.getLogicalCoordinates(x, y),
      hit: this.buildContextHit(x, y),
    });
  };

  /** Hit-Info fuer contextMenuRequested: Zeichnung > Achse > Pane. */
  private buildContextHit(x: number, y: number):
    | { type: 'drawing'; id: string; shapeType: string; isLocked: boolean }
    | { type: 'xAxis' }
    | { type: 'yAxis' }
    | { type: 'pane'; paneId: string | null } {
    const rect = this.canvas.getBoundingClientRect();
    if (y > rect.height - this.manager.options.layout.axisHeight) return { type: 'xAxis' };
    if (x > rect.width - this.manager.options.layout.axisWidth) return { type: 'yAxis' };
    const targetPane = this.manager.getPaneAt(y);
    const priceScale = targetPane?.getPriceScale() as any;
    if (priceScale) {
      for (let i = this.manager.drawingManager.shapes.length - 1; i >= 0; i--) {
        const shape = this.manager.drawingManager.shapes[i];
        if (shape.isVisible === false) continue;
        if (shape.hitTest(x, y, this.timeScale, priceScale) || (shape.isSelected && shape.hitTestAnchor(x, y, this.timeScale, priceScale))) {
          return { type: 'drawing', id: shape.id, shapeType: shape.shapeType, isLocked: !!shape.isLocked };
        }
      }
    }
    return { type: 'pane', paneId: targetPane?.getId() ?? null };
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

  // ── Pointer-Interceptor-Chain (Roadmap zchart-input-priority, P2) ──────

  /**
   * Registriert einen Interceptor und hält die Liste absteigend nach
   * `priority` sortiert. Stabil bei gleicher Priorität (Einfügereihenfolge).
   * @returns Dispose-Funktion, die genau diesen Interceptor wieder entfernt.
   */
  public registerPointerInterceptor(i: PointerInterceptor): () => void {
    if (this.interceptors.some(x => x.label === i.label)) {
      console.warn(`[InputManager] Pointer-Interceptor mit Label "${i.label}" bereits registriert — wird ersetzt.`);
      this.removeInterceptor(i.label);
    }
    this.interceptors.push(i);
    // Stabile Sortierung: höhere priority zuerst; bei Gleichstand bestehende Reihenfolge.
    this.interceptors = this.interceptors
      .map((x, idx) => ({ x, idx }))
      .sort((a, b) => (b.x.priority - a.x.priority) || (a.idx - b.idx))
      .map(e => e.x);
    return () => this.removeInterceptor(i.label);
  }

  /** Meldet einen Interceptor anhand seines `label` ab. */
  public unregisterPointerInterceptor(label: string): void {
    this.removeInterceptor(label);
  }

  private removeInterceptor(label: string): void {
    const owner = this.activeDragOwner;
    if (owner && owner.label === label) this.activeDragOwner = null;
    this.interceptors = this.interceptors.filter(x => x.label !== label);
  }

  /**
   * Baut aus einem rohen DOM-PointerEvent ein `ZChartPointerEvent`.
   * Stützt sich auf `getLogicalCoordinates()` (liefert paneId/index/price/time)
   * und ergänzt nur die Raw-Felder + Control-Closures.
   */
  public buildPointerEvent(e: PointerEvent): ZChartPointerEvent {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const logical = this.getLogicalCoordinates(x, y); // null wenn außerhalb aller Panes
    return {
      x,
      y,
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
      buttons: e.buttons,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      pointerId: e.pointerId,
      pointerType: e.pointerType || 'mouse',
      paneId: logical ? logical.paneId : null,
      index: logical ? logical.index : NaN,
      price: logical ? logical.price : NaN,
      time: logical ? logical.time : null,
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
    };
  }

  /**
   * Reicht ein Pointer-Event durch die Interceptor-Chain.
   *
   * Regeln (§2.2):
   * - **Active drag wins:** Gibt es einen `activeDragOwner` (hat in `down`
   *   konsumiert), bekommt NUR er die Phasen `move`/`up`/`leave` — alle anderen,
   *   auch höher-priorisierte, werden übersprungen. Konsumiert er ein `up`/`leave`,
   *   wird der Lock gelöst.
   * - **Sonst:** Iteration absteigend nach Priorität; erster `handle === true`
   *   konsumiert (Chain-Abbruch). Konsumiert ein Interceptor ein `down`, wird er
   *   zum `activeDragOwner`.
   * - **phases-Filter:** Interceptor wird nur gefragt, wenn er die Phase abonniert
   *   hat (Default: alle vier).
   * - **paneId-Filter:** gesetzt → nur wenn `ev.paneId` exakt matcht.
   *
   * @returns `true`, wenn das Event konsumiert wurde (interne Logik überspringen).
   */
  public dispatchToInterceptors(phase: InterceptorPhase, ev: ZChartPointerEvent): boolean {
    // 1) Aktiver Drag-Owner hat während move/up/leave exklusiven Zugriff.
    const owner = this.activeDragOwner;
    if (owner && phase !== 'down') {
      if (!this.interceptorWants(owner, phase, ev)) {
        // Owner will diese Phase nicht — Event verfällt still (Lock bleibt bestehen).
        return false;
      }
      const consumed = owner.handle(phase, ev);
      if (consumed && (phase === 'up' || phase === 'leave')) {
        this.activeDragOwner = null; // Drag beendet → Lock lösen.
      }
      return consumed;
    }

    // 2) Normale Chain (sortiert nach Priorität).
    for (const i of this.interceptors) {
      if (!this.interceptorWants(i, phase, ev)) continue;
      if (i.handle(phase, ev)) {
        if (phase === 'down') {
          if (this.activeDragOwner && this.activeDragOwner !== i) {
            // Bereits ein aktiver Drag — zweiter down-Owner unzulässig (dev-Log).
            console.warn(`[InputManager] down konsumiert von "${i.label}", aber "${this.activeDragOwner.label}" hält bereits den Drag-Lock — ignoriert.`);
            return true;
          }
          this.activeDragOwner = i; // dieser Interceptor besitzt jetzt den Drag.
        }
        return true; // konsumiert → Chain-Abbruch.
      }
    }
    return false;
  }

  /** phases- + paneId-Filter für einen einzelnen Interceptor. */
  private interceptorWants(i: PointerInterceptor, phase: InterceptorPhase, ev: ZChartPointerEvent): boolean {
    if (i.phases && !i.phases.includes(phase)) return false;
    if (i.paneId != null && i.paneId !== ev.paneId) return false;
    return true;
  }

  /** Debug-Helper (vollständig in P7 ausgebaut). */
  public getRegisteredInterceptors(): { label: string; priority: number; paneId: string | null; phases: InterceptorPhase[] }[] {
    return this.interceptors.map(i => ({
      label: i.label,
      priority: i.priority,
      paneId: i.paneId ?? null,
      phases: i.phases ?? ['down', 'move', 'up', 'leave'],
    }));
  }

  private onPointerDown = (e: PointerEvent) => {
    // ZT-P1: Touch/Pen an das Canvas binden — move/up kommen dann auch, wenn der
    // Finger das Canvas verlässt. preventDefault unterdrückt die Compatibility-
    // MouseEvents des Browsers. Maus bleibt unangetastet (Desktop pixelgleich).
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* Pointer bereits weg */ }
      const rect = this.canvas.getBoundingClientRect();
      const tx = e.clientX - rect.left;
      const ty = e.clientY - rect.top;
      this.activeTouches.set(e.pointerId, {
        x: tx, y: ty, clientX: e.clientX, clientY: e.clientY,
        downX: tx, downY: ty, downTime: performance.now(), moved: false,
      });
      // Erster Finger übernimmt das Steuer (Pan/Draw/Crosshair).
      if (this.steeringPointerId === null && this.activeTouches.size === 1) {
        this.steeringPointerId = e.pointerId;
      }
    }

    // ZT-P2: Weitere Finger starten ggf. den Pinch; sie erreichen nie die
    // Interceptor-Chain oder die interne Pan/Draw-Logik.
    if (!this.isSteeringPointer(e)) {
      this.maybeStartPinch();
      return;
    }

    // Pointer-Interceptor-Chain (R2-P3): konsumiert ein Interceptor das down,
    // wird die interne Logik (Pan/Draw/Scale) übersprungen.
    if (this.dispatchToInterceptors('down', this.buildPointerEvent(e))) return;

    // R-perf-100k P1: MouseDown kann Selection/Drawing-State ändern — sicher dirty.
    this.manager.markDirty();

    // ZT-P6-Fund (iPad): Long-Press hier armen — NICHT erst im Panning-
    // Fallthrough. Trifft der Down eine Zeichnung (Selektion/Anchor/Body-Move),
    // returnen diese Pfade früher und der Timer wurde nie gestellt → Long-Press
    // auf einer Zeichnung öffnete kein Kontextmenü. Der Timer-Callback guarded
    // selbst gegen Achsen-/Divider-Drag und Bewegung.
    if (e.pointerType === 'touch' && this.mode === 'crosshair_and_pan') {
      this.armLongPress(e.pointerId);
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ZT-P3: Touch bekommt größere Griffzonen (Achsen, Divider, Anchors).
    const coarse = e.pointerType === 'touch';

    // Prüfen: Ist der Pointer über einer Preisachsen-Spalte? (Touch: +12px Griffzone)
    // ZV10-P7c: Multi-Y — Hit-Test pro Spalte, Zoom trifft die gegriffene Scale.
    const hitScaleId = findAxisScaleAt(
      x, rect.width, this.manager.options.layout.axisWidth,
      this.manager.getAxisColumns?.() ?? [],
      coarse ? InputManager.COARSE_AXIS_BONUS_PX : 0);
    if (hitScaleId !== null) {
      this.isScalingY = true;
      this.startY = e.clientY;
      // Remember which pane's Y-axis is being scaled so all sub-panes (RSI/ATR/…)
      // can be stretched independently.
      const paneHit = this.manager.getPaneAt(y);
      this.scalingYPaneId = paneHit?.getId() ?? null;
      this.scalingYScaleId = hitScaleId;
      this.canvas.style.cursor = 'ns-resize';
      return;
    }

    // ZV10-P11: Zeitachsen-Band (unterhalb des Contents) → X-Zoom per Ziehen.
    // Rechts = strecken (hineinzoomen), links = stauchen; Anker = rechter
    // Content-Rand (TradingView-Verhalten). Touch: Band nach oben um +12px.
    const xAxisTop = rect.height - this.manager.options.layout.axisHeight
      - (coarse ? InputManager.COARSE_AXIS_BONUS_PX : 0);
    if (y > xAxisTop) {
      this.isScalingX = true;
      this.scalingXLastX = e.clientX;
      this.canvas.style.cursor = 'ew-resize';
      return;
    }

    // Pane close button
    const closePaneId = this.manager.getCloseButtonAt(x, y);
    if (closePaneId) {
      this.manager.togglePaneVisibility(closePaneId);
      return;
    }

    // Pane divider resize (Touch: ±12px statt ±4px)
    const dividerIdx = this.findDividerAt(
      y, coarse ? InputManager.DIVIDER_TOL_COARSE_PX : InputManager.DIVIDER_TOL_MOUSE_PX);
    if (dividerIdx !== null) {
      this.isResizingDivider = true;
      this.activeDividerIndex = dividerIdx;
      this.dividerStartY = y;
      this.canvas.style.cursor = 'ns-resize';
      return;
    }

    // --- Logische Koordinaten beim Klick berechnen ---
    const logicalCoords = this.getLogicalCoordinates(x, y);

    if (!logicalCoords) return;

    const hitPaneId = logicalCoords.paneId;
    const targetPane = this.manager.getPaneAt(y);
    const priceScale = targetPane?.getPriceScale() as any;

    // B2: Sub-pane drawings – currently only 'draw_hline' is pane-aware.
    // All other draw/edit modes remain main-pane-only.
    const paneAwareModes = new Set(['draw_hline', 'crosshair_and_pan']);
    if (hitPaneId !== 'main' && !paneAwareModes.has(this.mode)) return;

    // ==========================================
    // MODUS: STANDARD (Auswählen & Modifizieren)
    // ==========================================
    if (this.mode === 'crosshair_and_pan') {

        // When locked, skip all shape interaction
        if (this.lockAll) {
            // fall through to panning
        } else {

        // 1. Prüfen: Haben wir einen Ankerpunkt von einer SELEKTIERTEN Linie getroffen?
        // (ZT-P3: Touch testet per Probe-Ring — wirkt wie größere Anchor-Targets)
        for (const shape of this.manager.drawingManager.shapes) {
            if ((shape.paneId ?? 'main') !== hitPaneId) continue; // B2 – nur Shapes der getroffenen Pane
            if (shape.isSelected && !shape.isLocked) {
                const anchorHit = this.hitTestAnchorProbed(shape, x, y, priceScale, coarse);
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
            if ((shape.paneId ?? 'main') !== hitPaneId) continue; // B2 – pane-gefiltertes Hit-Testing
            if (!hitFound && this.hitTestShapeProbed(shape, x, y, priceScale, coarse)) {
                // If already selected emoji clicked → TV-style zone detection
                if (shape.isSelected && !shape.isLocked && shape instanceof EmojiNode && shape.point1 && priceScale) {
                    const zone = this.hitTestEmojiZoneProbed(shape, x, y, priceScale, coarse);
                    if (zone) {
                        this.emojiDragMode = zone.mode;
                        if (zone.mode === 'resize') {
                            const signs: [number, number][] = [[-1,-1],[1,-1],[1,1],[-1,1]];
                            this.emojiResizeCornerSign = signs[zone.cornerIdx];
                            this.emojiInitialScaleX = shape.scaleX;
                            this.emojiInitialScaleY = shape.scaleY;
                        }
                        if (zone.mode === 'rotate') {
                            const cx = this.timeScale.indexToX(shape.point1.index);
                            const cy = priceScale.priceToY(shape.point1.price);
                            this.emojiDragStartAngle = Math.atan2(y - cy, x - cx);
                            this.emojiDragStartRotation = shape.rotation;
                        }
                        this.isDragging = true;
                        this.activeDrawingNode = shape;
                        this.startX = e.clientX;
                        hitFound = true;
                    }
                } else {
                    if (shape.isSelected && !shape.isLocked && logicalCoords) {
                        // Already selected → start body move
                        this.isMovingBody = true;
                        this.activeDrawingNode = shape;
                        this.bodyMoveLastIndex = logicalCoords.index;
                        this.bodyMoveLastPrice = logicalCoords.price;
                        hitFound = true;
                    } else {
                        shape.isSelected = !shape.isSelected;
                        hitFound = true;
                        // Emit selection event for floating toolbar
                        if (shape.isSelected) {
                            // Compute shape center for toolbar positioning
                            const sx = shape.point1 ? this.timeScale.indexToX(shape.point1.index) : x;
                            const sy = shape.point1 ? priceScale.priceToY(shape.point1.price) : y;
                            this.manager.emit('drawingSelected', {
                                id: shape.id, shapeType: shape.shapeType,
                                pixelX: sx, pixelY: sy,
                                shape,
                            });
                        } else {
                            this.manager.emit('drawingDeselected', { id: shape.id });
                        }
                    }
                }
            } else {
                shape.isSelected = false;
            }
        }
        
        if (hitFound) return;
        
        this.manager.drawingManager.deselectAll();
        this.manager.emit('drawingDeselected', { id: null });

        } // end of !lockAll block
    }

    // ==========================================
    // ZEICHNUNG-ROUTING — dispatchClick() für alle registrierten Tools
    // ==========================================
    else if (this.mode.startsWith('draw_')) {
        const logical = this.getLogicalCoordinates(x, y);
        if (logical && dispatchClick(this.mode, logical, e, this)) return;

    }

    // ==========================================
    // DEFAULT: PANNING
    // ==========================================
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startScrollOffset = this.timeScale.scrollOffset;
    // Record which pane the drag originated in, so vertical panning moves
    // that pane's Y-axis (fixes "can't drag MACD sub-pane up/down").
    {
      const rect2 = this.canvas.getBoundingClientRect();
      const localY = e.clientY - rect2.top;
      const paneHit = this.manager.getPaneAt?.(localY);
      this.draggingPaneId = paneHit?.getId() ?? null;
    }
    this.canvas.style.cursor = 'grabbing';
    // (Long-Press-Arming passiert bereits oben direkt nach der Interceptor-Chain.)
  };

private onPointerMove = (e: PointerEvent) => {
    // ZT-P2: Touch-Bookkeeping (Position, Slop → Long-Press-Abbruch) + Pinch.
    if (e.pointerType !== 'mouse') {
      const t = this.activeTouches.get(e.pointerId);
      if (t) {
        const rect = this.canvas.getBoundingClientRect();
        t.x = e.clientX - rect.left;
        t.y = e.clientY - rect.top;
        t.clientX = e.clientX;
        t.clientY = e.clientY;
        if (!t.moved && Math.hypot(t.x - t.downX, t.y - t.downY) > InputManager.TAP_SLOP_PX) {
          t.moved = true;
          this.clearLongPress(); // bewegt → kein Long-Press mehr
        }
      }
      if (this.isPinching) {
        this.updatePinch();
        return; // Pinch besitzt beide Finger exklusiv
      }
    }
    if (!this.isSteeringPointer(e)) return; // Nicht-Pinch-Zweitfinger steuert nichts

    // Pointer-Interceptor-Chain (R2-P4): aktiver Drag-Owner bekommt move exklusiv.
    if (this.dispatchToInterceptors('move', this.buildPointerEvent(e))) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.manager.setMousePos(x, y);

    // Divider resize in progress
    if (this.isResizingDivider) {
      const deltaY = y - this.dividerStartY;
      this.manager.resizePanesByDivider(this.activeDividerIndex, deltaY);
      this.dividerStartY = y;
      return;
    }

    const logicalCoords = this.getLogicalCoordinates(x, y);

    // --- 0. CROSSHAIR DATA EVENT (für React Data Window) ---
    if (logicalCoords && logicalCoords.paneId === 'main') {
      const allData = this.manager.dataStore.getAllData();
      const idx = Math.round(logicalCoords.index);
      if (idx >= 0 && idx < allData.length) {
        const c = allData[idx];
        this.manager.emit('crosshairMove', {
          timestamp: c.timestamp, open: c.open, high: c.high,
          low: c.low, close: c.close, volume: c.volume,
          rsi: c.rsi, sma20: c.sma20, sma50: c.sma50,
          ema20: c.ema20, ema50: c.ema50,
          stoch_k: c.stoch_k, stoch_d: c.stoch_d, atr: c.atr,
          vwap: c.vwap,
        });
      }
    }

    // --- 1. LIVE PREVIEWS (Beim ersten Zeichnen) ---
    if (this.drawStep >= 1 && this.activeDrawingNode && logicalCoords) {
        // Registrierte Tool-eigene Preview (Plugin-Pakete) hat Vorrang.
        if (dispatchLivePreview(this.mode, logicalCoords, e, this)) {
            this.manager.setMousePos(x, y);
        } else {
        // Brush freehand: continuous point collection
        if (this.mode === 'draw_brush' && this.drawStep === 1 && this.activeDrawingNode instanceof BrushNode) {
            this.activeDrawingNode.points.push({ index: logicalCoords.index, price: logicalCoords.price });
        }
        if (this.mode === 'draw_highlighter' && this.drawStep === 1 && this.activeDrawingNode instanceof BrushNode) {
            this.activeDrawingNode.points.push({ index: logicalCoords.index, price: logicalCoords.price });
        }
        // Vorschau für 2-Klick-Tools (point2-Folge)
        if (this.drawStep === 1 && (this.mode === 'draw_trendline' || this.mode === 'draw_fibo' || this.mode === 'draw_ray' || this.mode === 'draw_extended_line'
            || this.mode === 'draw_rectangle' || this.mode === 'draw_measure'
            || this.mode === 'draw_fibo_extension' || this.mode === 'draw_arrow'
            || this.mode === 'draw_ellipse' || this.mode === 'draw_circle' || this.mode === 'draw_triangle'
            || this.mode === 'draw_fib_fan' || this.mode === 'draw_fib_arcs'
            || this.mode === 'draw_fib_channel'
            || this.mode === 'draw_info_line' || this.mode === 'draw_trend_angle'
            || this.mode === 'draw_regression_trend'
            || this.mode === 'draw_fib_circles' || this.mode === 'draw_fib_spiral'
            || this.mode === 'draw_fib_trend_time' || this.mode === 'draw_pitchfan'
            || this.mode === 'draw_fib_time_zones'
            || this.mode === 'draw_gann_box' || this.mode === 'draw_gann_square_fixed' || this.mode === 'draw_gann_square' || this.mode === 'draw_gann_fan'
            || this.mode === 'draw_cyclic_lines' || this.mode === 'draw_time_cycles' || this.mode === 'draw_sine_line'
            || this.mode === 'draw_long_position' || this.mode === 'draw_short_position'
            || this.mode === 'draw_price_range' || this.mode === 'draw_date_range' || this.mode === 'draw_date_price_range')) {
            this.activeDrawingNode.point2 = { index: logicalCoords.index, price: logicalCoords.price };
        }
        // Note: live preview of text-box position
        if (this.mode === 'draw_note' && this.activeDrawingNode instanceof NoteNode) {
            if (this.drawStep === 1) {
                this.activeDrawingNode.point2 = { index: logicalCoords.index, price: logicalCoords.price };
            }
        }
        // Polyline/Path: live preview of last segment
        if ((this.mode === 'draw_polyline' || this.mode === 'draw_path') && this.activeDrawingNode instanceof PolylineNode) {
            if (this.drawStep >= 1) {
                const pts = this.activeDrawingNode.points;
                pts[pts.length - 1] = { index: logicalCoords.index, price: logicalCoords.price };
                this.activeDrawingNode.point2 = pts[pts.length - 1];
            }
        }
        // Triangle: Step 2 = point3 preview
        if (this.mode === 'draw_triangle' && this.drawStep === 2 && this.activeDrawingNode instanceof TriangleNode) {
            this.activeDrawingNode.point3 = { index: logicalCoords.index, price: logicalCoords.price };
        }
        }
    }

    // --- 2. ADVANCED NODE INTERACTION (Rotation / Spiegeln / Skalieren / Verschieben) ---
    if (this.isDragging && this.activeDrawingNode instanceof EmojiNode && this.activeDrawingNode.point1) {
        
        const targetPane = this.manager.getPaneAt(y);
        const priceScale = targetPane?.getPriceScale() as any;
        if (!priceScale) return;

        const emoji = this.activeDrawingNode;
        const p1 = emoji.point1!;
        const centerX = this.timeScale.indexToX(p1.index);
        const centerY = priceScale.priceToY(p1.price);

        if (this.emojiDragMode === 'rotate') {
            // Free rotation: delta angle from drag start
            const currentAngle = Math.atan2(y - centerY, x - centerX);
            emoji.rotation = this.emojiDragStartRotation + (currentAngle - this.emojiDragStartAngle);
        } else if (this.emojiDragMode === 'resize') {
            // Transform mouse to local space, detect independent X/Y axis flips
            const local = emoji.pixelToLocal(x, y, this.timeScale, priceScale);
            if (local) {
                const [sx, sy] = this.emojiResizeCornerSign;
                // Size from the larger axis distance (keeps square aspect)
                const newHalf = Math.max(Math.abs(local.lx), Math.abs(local.ly));
                emoji.size = Math.max(12, Math.round((newHalf - 5) * 2));
                // Flip X: did mouse cross center on X axis relative to original corner?
                const curSignX = local.lx >= 0 ? 1 : -1;
                emoji.scaleX = (curSignX === sx) ? this.emojiInitialScaleX : -this.emojiInitialScaleX;
                // Flip Y: did mouse cross center on Y axis relative to original corner?
                const curSignY = local.ly >= 0 ? 1 : -1;
                emoji.scaleY = (curSignY === sy) ? this.emojiInitialScaleY : -this.emojiInitialScaleY;
            }
        } else if (this.emojiDragMode === 'move') {
            if (logicalCoords) {
                emoji.point1 = { index: logicalCoords.index, price: logicalCoords.price };
            }
        }
    }

    // --- 2b. BODY MOVE (Entire shape drag) ---
    if (this.isMovingBody && this.activeDrawingNode && logicalCoords) {
        const deltaIndex = logicalCoords.index - this.bodyMoveLastIndex;
        const deltaPrice = logicalCoords.price - this.bodyMoveLastPrice;
        if (deltaIndex !== 0 || deltaPrice !== 0) {
            const shape = this.activeDrawingNode;
                // Generic: move point1..point4
                if (shape.point1) { shape.point1.index += deltaIndex; shape.point1.price += deltaPrice; }
                if (shape.point2) { shape.point2.index += deltaIndex; shape.point2.price += deltaPrice; }
                if ((shape as any).point3) { (shape as any).point3.index += deltaIndex; (shape as any).point3.price += deltaPrice; }
                if ((shape as any).point4) { (shape as any).point4.index += deltaIndex; (shape as any).point4.price += deltaPrice; }
            this.bodyMoveLastIndex = logicalCoords.index;
            this.bodyMoveLastPrice = logicalCoords.price;
        }
    }

    // --- 3. POINT DRAGGING (Bestehende Logik für Ankerpunkte) ---
    if (this.isDraggingPoint && this.activeDrawingNode && this.draggedPointIndex && logicalCoords) {
        if (this.activeDrawingNode instanceof PolylineNode) {
            const pi = this.draggedPointIndex - 1;
            if (pi >= 0 && pi < this.activeDrawingNode.points.length) {
                this.activeDrawingNode.points[pi] = { index: logicalCoords.index, price: logicalCoords.price };
                if (pi === 0) this.activeDrawingNode.point1 = this.activeDrawingNode.points[0];
                if (pi === 1) this.activeDrawingNode.point2 = this.activeDrawingNode.points[1];
            }
        } else {
            const pointKey = `point${this.draggedPointIndex}`;
            (this.activeDrawingNode as Record<string, any>)[pointKey] = { index: logicalCoords.index, price: logicalCoords.price };
        }
    }

    // --- 4. PANNING (Verschieben des Charts) ---
    if (this.isDragging && !this.activeDrawingNode) { // Nur pannen, wenn kein Objekt bewegt wird
      const deltaX = e.clientX - this.startX;
      this.timeScale.scrollOffset = this.startScrollOffset + deltaX;
      // Vertikales Panning (Preisachse verschieben) – für die Pane unter der Maus,
      // nicht mehr hart auf 'main', damit man MACD & Co. hochziehen kann.
      const deltaY = e.clientY - this.startY;
      if (Math.abs(deltaY) > 1) {
        this.manager.panPrice(deltaY, this.draggingPaneId ?? undefined);
        this.startY = e.clientY;
      }
      // R-perf-100k P1: Pan ändert die View — sofort dirty.
      this.manager.markDirty();
    }

    // --- 4b. ZV10-P11: TIME SCALING (X-Achse ziehen) ---
    if (this.isScalingX) {
      const dx = e.clientX - this.scalingXLastX;
      this.scalingXLastX = e.clientX;
      if (dx !== 0) {
        // ±0.5 % candleWidth je Pixel, geklemmt wie der Wheel-Zoom (1..100).
        const factor = Math.max(0.5, Math.min(2, 1 + dx * 0.005));
        this.timeScale.zoomAroundX(this.timeScale.width, factor);
        this.manager.markDirty();
      }
    }

    // --- 5. PRICE SCALING (Y-Achse ziehen) ---
    if (this.isScalingY) {
      const deltaY = e.clientY - this.startY;
      this.startY = e.clientY;
      this.manager.zoomPrice(deltaY, this.scalingYPaneId ?? undefined, this.scalingYScaleId ?? undefined);
    }

    // ZT-P5: Cursor-Styling ist ein Hover-Konzept — für Touch überspringen.
    // updateCursor läuft sonst pro Move die komplette Shape-hitTest-Schleife.
    if (e.pointerType !== 'touch') this.updateCursor(x, y);
  };

private onPointerUp = (e: PointerEvent) => {
    // ZT-P2: Touch-Bookkeeping + Pinch-Ende.
    const steering = this.isSteeringPointer(e);
    let tap: { x: number; y: number; downTime: number; moved: boolean } | undefined;
    if (e.pointerType !== 'mouse') {
      tap = this.activeTouches.get(e.pointerId);
      this.activeTouches.delete(e.pointerId);
      if (this.isPinching) {
        if (this.activeTouches.size < 2) this.endPinch(); // vergibt ggf. das Steuer neu
        return; // Pinch-Finger erreichen weder Interceptoren noch Tap-Logik
      }
      if (steering) {
        this.clearLongPress();
        this.steeringPointerId = null;
      }
    }
    if (!steering) return;

    // Pointer-Interceptor-Chain (R2-P4): aktiver Drag-Owner committet im up.
    if (this.dispatchToInterceptors('up', this.buildPointerEvent(e))) return;

    // ZT-P2: Tap-/Double-Tap-Erkennung (Compat-dblclick ist für Touch unterdrückt).
    if (tap && !tap.moved && performance.now() - tap.downTime < InputManager.LONG_PRESS_MS) {
      this.registerTap(tap.x, tap.y);
    }

    // R-perf-100k P1: MouseUp finalisiert Drawing/Drag — sicher dirty.
    this.manager.markDirty();
    // Brush / Highlighter: finalize freehand drawing on mouseup; keep tool active for next stroke
    if ((this.mode === 'draw_brush' || this.mode === 'draw_highlighter') && this.drawStep === 1 && this.activeDrawingNode instanceof BrushNode) {
        const isHL = this.mode === 'draw_highlighter';
        this.activeDrawingNode.isSelected = false;
        this.manager.emit('drawingCreated', {
            id: this.activeDrawingNode.id, type: isHL ? 'highlighter' : 'brush',
            data: { point1: this.activeDrawingNode.point1 }
        });
        this.drawStep = 0;
        this.activeDrawingNode = null;
        // Tool stays active; do NOT reset mode or fire toolReset
        return;
    }

    // Wenn wir gerade einen Punkt verschoben haben...
    if (this.isDraggingPoint && this.activeDrawingNode) {
        // ...feuern wir ein Event mit den neuen Daten!
        const evtData: Record<string, any> = {
            point1: this.activeDrawingNode.point1,
            point2: this.activeDrawingNode.point2
        };
        this.manager.emit('drawingChanged', {
            id: this.activeDrawingNode.id,
            type: 'trendline',
            data: evtData
        });
    }

    // Body move finished → emit drawingChanged
    if (this.isMovingBody && this.activeDrawingNode) {
        const evtData: Record<string, any> = {
            point1: this.activeDrawingNode.point1,
            point2: this.activeDrawingNode.point2
        };
        this.manager.emit('drawingChanged', {
            id: this.activeDrawingNode.id,
            type: this.activeDrawingNode.shapeType,
            data: evtData
        });
    }

    // ZIP-P5-Fix7: Emoji-Rotate/Resize/Move beendet → drawingChanged feuern.
    // Ohne das Event blieb der drawingCount unverändert (die Anzahl der Shapes
    // ändert sich ja nicht), der Debounce-Save lief nie an und Rotation/Größe
    // gingen beim Neuladen verloren (Befund Abnahme 2026-08-11, Bild 1 vs. 2).
    if (this.emojiDragMode && this.activeDrawingNode) {
        this.manager.emit('drawingChanged', {
            id: this.activeDrawingNode.id,
            type: this.activeDrawingNode.shapeType,
            data: { point1: this.activeDrawingNode.point1 },
        });
    }

    this.isDragging = false;
    this.isScalingY = false;
    this.isScalingX = false;
    this.scalingYPaneId = null;
    this.scalingYScaleId = null;
    this.draggingPaneId = null;
    this.isDraggingPoint = false;
    this.isMovingBody = false;
    this.draggedPointIndex = null;
    this.emojiDragMode = null;
    // Only clear activeDrawingNode if we're NOT mid-drawing (multi-click tools)
    if (this.drawStep === 0) {
        this.activeDrawingNode = null;
    }
    this.isResizingDivider = false;
    this.activeDividerIndex = -1;

    if (this.mode === 'crosshair_and_pan') {
        this.canvas.style.cursor = 'default';
    }
  };

  // R2-P4: aus Inline-Lambda (mouseleave) zur benannten Methode promotet —
  // abmeldbar in destroy() + speist die Interceptor-`leave`-Phase.
  // ZT-P1: pointerleave statt mouseleave.
  private onPointerLeave = (e: PointerEvent) => {
    // Interceptor-Chain zuerst: aktiver Drag-Owner kann leave als Abbruch behandeln.
    if (this.dispatchToInterceptors('leave', this.buildPointerEvent(e))) {
      this.manager.setMousePos(null, null);
      return;
    }
    this.manager.setMousePos(null, null);
  };

  // ZT-P1: pointercancel — der Browser hat die Geste übernommen/abgebrochen
  // (z.B. System-Geste). Kein Commit: Interceptoren bekommen die `leave`-Phase
  // (Abbruch-Semantik), danach wird der Drag-Lock in jedem Fall gelöst und der
  // interne Drag-State zurückgesetzt. In-progress-Zeichnungen (drawStep>0)
  // bleiben stehen — der User kann mit dem nächsten Tap weitermachen (ESC bricht ab).
  private onPointerCancel = (e: PointerEvent) => {
    // ZT-P2: Gesten-Cleanup — Pinch stoppt hart (kein Pan-Resume), Long-Press verfällt.
    this.activeTouches.delete(e.pointerId);
    if (this.steeringPointerId === e.pointerId) this.steeringPointerId = null;
    this.isPinching = false;
    this.clearLongPress();
    this.lastTapTime = 0;

    this.dispatchToInterceptors('leave', this.buildPointerEvent(e));
    this.activeDragOwner = null;

    this.isDragging = false;
    this.isScalingY = false;
    this.isScalingX = false;
    this.scalingYPaneId = null;
    this.scalingYScaleId = null;
    this.draggingPaneId = null;
    this.isDraggingPoint = false;
    this.isMovingBody = false;
    this.draggedPointIndex = null;
    this.emojiDragMode = null;
    if (this.drawStep === 0) {
      this.activeDrawingNode = null;
    }
    this.isResizingDivider = false;
    this.activeDividerIndex = -1;

    this.manager.setMousePos(null, null);
    this.manager.markDirty();
  };

  // ── ZT-P3: Coarse-Hit-Helper (Probe-Ring um den Tap-Punkt) ────────────────

  /**
   * Offsets, an denen ein Touch-Tap nachgetestet wird: Zentrum zuerst, dann
   * ein innerer (r/2) und ein äußerer (r) Ring aus je 8 Punkten. Für Maus/Pen
   * (präzise Pointer) nur das Zentrum — Desktop-Verhalten bleibt pixelgleich.
   */
  private probeOffsets(coarse: boolean): ReadonlyArray<readonly [number, number]> {
    if (!coarse) return InputManager.PROBE_CENTER;
    return InputManager.PROBE_RING;
  }

  private static readonly PROBE_CENTER: ReadonlyArray<readonly [number, number]> = [[0, 0]];
  private static readonly PROBE_RING: ReadonlyArray<readonly [number, number]> = (() => {
    const pts: [number, number][] = [[0, 0]];
    for (const r of [InputManager.COARSE_HIT_BONUS_PX / 2, InputManager.COARSE_HIT_BONUS_PX]) {
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k;
        pts.push([Math.round(Math.cos(a) * r * 100) / 100, Math.round(Math.sin(a) * r * 100) / 100]);
      }
    }
    return pts;
  })();

  /** hitTestAnchor mit Probe-Ring (Touch) bzw. exakt (Maus/Pen). */
  private hitTestAnchorProbed(
    shape: DrawableShape, x: number, y: number, priceScale: any, coarse: boolean,
  ): number | null {
    for (const [dx, dy] of this.probeOffsets(coarse)) {
      const hit = shape.hitTestAnchor(x + dx, y + dy, this.timeScale, priceScale);
      if (hit) return hit;
    }
    return null;
  }

  /** hitTest (Shape-Body) mit Probe-Ring (Touch) bzw. exakt (Maus/Pen). */
  private hitTestShapeProbed(
    shape: DrawableShape, x: number, y: number, priceScale: any, coarse: boolean,
  ): boolean {
    for (const [dx, dy] of this.probeOffsets(coarse)) {
      if (shape.hitTest(x + dx, y + dy, this.timeScale, priceScale)) return true;
    }
    return false;
  }

  /** hitTestEmojiZone mit Probe-Ring (Touch) bzw. exakt (Maus/Pen). */
  private hitTestEmojiZoneProbed(
    shape: EmojiNode, x: number, y: number, priceScale: any, coarse: boolean,
  ): ReturnType<EmojiNode['hitTestEmojiZone']> {
    for (const [dx, dy] of this.probeOffsets(coarse)) {
      const zone = shape.hitTestEmojiZone(x + dx, y + dy, this.timeScale, priceScale);
      if (zone) return zone;
    }
    return null;
  }

  // ── ZT-P2: Gesten-Helper (Pinch / Long-Press / Double-Tap) ────────────────

  /**
   * Startet den Pinch, sobald zwei Touch-Pointer aktiv sind und keine andere
   * Interaktion (Interceptor-Drag, laufendes Zeichnen, Achsen-/Divider-Drag)
   * das Eingaberecht hält. Die Achse wird aus der Finger-Geometrie klassifiziert
   * und bleibt für die gesamte Geste fix.
   */
  private maybeStartPinch(): void {
    if (this.isPinching || !this.pinchZoomEnabled) return;
    if (this.activeTouches.size !== 2) return;
    if (this.activeDragOwner) return;
    if (this.drawStep > 0 || this.isDraggingPoint || this.isMovingBody) return;
    if (this.isScalingY || this.isScalingX || this.isResizingDivider) return;

    const [a, b] = [...this.activeTouches.values()];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < InputManager.PINCH_MIN_DIST_PX) return;

    // Laufenden 1-Finger-Pan/Long-Press beenden — Pinch übernimmt exklusiv.
    this.clearLongPress();
    this.isDragging = false;
    this.draggingPaneId = null;
    a.moved = true;
    b.moved = true; // Pinch-Finger erzeugen beim Loslassen keine Taps

    this.isPinching = true;
    this.pinchAxis = Math.abs(dy) > Math.abs(dx) * 1.5 ? 'y' : 'x';
    this.pinchLastDist = dist;
    const focalX = (a.x + b.x) / 2;
    const focalY = (a.y + b.y) / 2;
    this.pinchLastFocalX = focalX;
    if (this.pinchAxis === 'y') {
      const paneHit = this.manager.getPaneAt(focalY);
      this.pinchPaneId = paneHit?.getId();
      this.pinchAnchorPrice = paneHit
        ? paneHit.getPriceScale().yToPrice(focalY - paneHit.getTopOffset())
        : undefined;
    }
    this.manager.setMousePos(null, null); // kein Crosshair während der Geste
    this.manager.markDirty();
  }

  /** Wendet die aktuelle Finger-Geometrie auf Zeit- bzw. Preisachse an. */
  private updatePinch(): void {
    if (this.activeTouches.size < 2) return;
    const [a, b] = [...this.activeTouches.values()];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist < InputManager.PINCH_MIN_DIST_PX || this.pinchLastDist < InputManager.PINCH_MIN_DIST_PX) return;

    const focalX = (a.x + b.x) / 2;
    if (this.pinchAxis === 'x') {
      // Fokuspunkt folgt den Fingern (Pan-Anteil), Zoom ankert am Fokuspunkt —
      // identische Mathematik wie der Wheel-Zoom (TimeScale.zoomAroundX).
      this.timeScale.scrollOffset += focalX - this.pinchLastFocalX;
      this.timeScale.zoomAroundX(focalX, dist / this.pinchLastDist);
    } else {
      // Vertikaler Pinch: Preis-Range invers zum Finger-Abstand, Anker = Preis
      // unterm Fokuspunkt beim Gesten-Start (Pane bleibt fix).
      this.manager.zoomPriceFactorAnchored(this.pinchLastDist / dist, this.pinchPaneId, this.pinchAnchorPrice);
    }
    this.pinchLastDist = dist;
    this.pinchLastFocalX = focalX;
    this.manager.markDirty();
  }

  /** Pinch beendet: verbleibender Finger übernimmt Steuer + nahtlosen Pan —
   *  auch wenn er nicht der Primary-Pointer ist. */
  private endPinch(): void {
    this.isPinching = false;
    const first = this.activeTouches.entries().next().value as
      [number, { x: number; y: number; clientX: number; clientY: number }] | undefined;
    if (!first) {
      this.steeringPointerId = null;
      return;
    }
    const [restId, rest] = first;
    this.steeringPointerId = restId;
    if (this.mode === 'crosshair_and_pan') {
      this.isDragging = true;
      this.startX = rest.clientX;
      this.startY = rest.clientY;
      this.startScrollOffset = this.timeScale.scrollOffset;
      const paneHit = this.manager.getPaneAt(rest.y);
      this.draggingPaneId = paneHit?.getId() ?? null;
    }
  }

  /** Long-Press armen: ruht der Finger LONG_PRESS_MS, wird aus dem Pan eine
   *  Crosshair-Führung (Pan stoppt, Finger bewegt nur noch das Fadenkreuz). */
  private armLongPress(pointerId: number): void {
    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      const t = this.activeTouches.get(pointerId);
      if (!t || t.moved || this.isPinching || this.activeTouches.size !== 1) return;
      if (this.activeDragOwner) return;
      // Achsen-Skalierung/Divider-Drag behalten den Finger — kein Menü.
      if (this.isScalingY || this.isScalingX || this.isResizingDivider) return;

      // ZT-P6-Fund (iPad): Long-Press öffnet das Kontextmenü ÜBERALL — auch auf
      // leerer Chart-Fläche (vorher nur auf Zeichnungen; leere Fläche war
      // Crosshair-Führung, die kaum Mehrwert hat: das Crosshair folgt dem
      // Finger ohnehin bei jedem Pan). Synthetisches contextmenu-Event nutzt
      // die bestehende React-Verdrahtung (ZChartTab + SplitPane); der
      // React-Handler macht selbst den Zeichnungs-HitTest für die Menü-Sektion.
      // Alle beim Down gestarteten Drag-Pfade beenden (Pan, Body-Move,
      // Anchor-Drag, Emoji) — der Finger gehört jetzt dem Menü.
      this.isDragging = false;
      this.draggingPaneId = null;
      this.isMovingBody = false;
      this.isDraggingPoint = false;
      this.draggedPointIndex = null;
      this.emojiDragMode = null;
      t.moved = true; // Folge-Up erzeugt keinen Tap (Double-Tap-Schutz)
      const ev = new MouseEvent('contextmenu', {
        clientX: t.clientX, clientY: t.clientY, bubbles: true, cancelable: true,
      });
      (ev as any).zchartLongPress = true;
      this.canvas.dispatchEvent(ev);
    }, InputManager.LONG_PRESS_MS);
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /** Tap-Bookkeeping; erkennt Double-Taps (Zeit + Distanz). */
  private registerTap(x: number, y: number): void {
    const now = performance.now();
    const isDouble = (now - this.lastTapTime) < InputManager.DOUBLE_TAP_MS
      && Math.hypot(x - this.lastTapX, y - this.lastTapY) < InputManager.DOUBLE_TAP_DIST_PX;
    if (isDouble) {
      this.lastTapTime = 0;
      this.handleDoubleTap(x, y, this.lastTapMode);
    } else {
      this.lastTapTime = now;
      this.lastTapX = x;
      this.lastTapY = y;
      this.lastTapMode = this.mode;
    }
  }

  /**
   * Double-Tap (Touch): Multi-Click-Tools finalisieren wie Desktop-dblclick;
   * sonst Fit — Y-Achse → Auto-Scale, X-Achse → ans Ende, Chart-Fläche → beides.
   */
  private handleDoubleTap(x: number, y: number, firstTapMode: InputMode): void {
    if ((this.mode === 'draw_polyline' || this.mode === 'draw_path') && this.activeDrawingNode instanceof PolylineNode) {
      this.finalizePolyline();
      return;
    }
    if (this.mode.startsWith('draw_') && this.activeDrawingNode) {
      const lg = this.getLogicalCoordinates(x, y);
      if (lg && dispatchDoubleClick(this.mode, lg, this)) return;
    }

    // Fit nur, wenn beide Taps im Pan-Modus lagen (kein Zeichnen im Spiel).
    if (firstTapMode !== 'crosshair_and_pan' || this.mode !== 'crosshair_and_pan') return;

    // ZT-P3: Double-Tap ist touch-only → Achsen-Zonen immer mit Coarse-Bonus.
    const rect = this.canvas.getBoundingClientRect();
    const chartH = rect.height - this.manager.options.layout.axisHeight
      - InputManager.COARSE_AXIS_BONUS_PX;
    if (x > rect.width - this.manager.options.layout.axisWidth - InputManager.COARSE_AXIS_BONUS_PX) {
      this.manager.resetYScale();
      return;
    }
    if (y >= chartH) {
      this.manager.scrollToEnd();
      return;
    }
    this.manager.resetYScale();
    this.manager.scrollToEnd();
  }

  // Rotation cursor as data URI SVG (curved arrow with arrowheads at both ends)
  private static readonly ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'%3E%3Cpath d='M7 3.5A9 9 0 0 1 20.5 7' stroke='%23333' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M18.2 3.2l2.5 3.8-4 1' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M17 20.5A9 9 0 0 1 3.5 17' stroke='%23333' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M5.8 20.8l-2.5-3.8 4-1' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, auto`;

  /**
   * Hilfsfunktion für dynamische Cursor-Icons
   */
  private updateCursor(x: number, y: number) {
    if (this.isDragging || this.isScalingY || this.isScalingX || this.isDraggingPoint || this.isResizingDivider) return;
    if (this.isMovingBody) { this.canvas.style.cursor = 'grabbing'; return; }

    // Pane divider cursor
    if (this.findDividerAt(y) !== null) {
      this.canvas.style.cursor = 'ns-resize';
      return;
    }
    // Close button cursor
    if (this.manager.getCloseButtonAt(x, y)) {
      this.canvas.style.cursor = 'pointer';
      return;
    }
    // ZV10-P11: Zeitachsen-Band → ew-resize (X-Zoom per Ziehen)
    if (y > this.canvas.getBoundingClientRect().height - this.manager.options.layout.axisHeight) {
      this.canvas.style.cursor = 'ew-resize';
      return;
    }

    if (this.mode !== 'crosshair_and_pan') {
        this.canvas.style.cursor = 'crosshair';
        return;
    }

    // Respect cursor mode override from React (arrow, dot, eraser, laser)
    if (this.cursorModeOverride === 'arrow') {
        // Arrow mode: use default cursor unless hovering a drawing
    } else if (this.cursorModeOverride === 'dot') {
        // Check for drawing hover first, then fall through to dot cursor
    } else if (this.cursorModeOverride === 'eraser') {
        // Eraser mode: show eraser cursor, pointer on hover
    } else if (this.cursorModeOverride === 'laser' || this.cursorModeOverride === 'spray') {
        this.canvas.style.cursor = 'none';
        return;
    }

    const targetPane = this.manager.getPaneAt(y);
    const priceScale = targetPane?.getPriceScale() as any;

    if (targetPane && targetPane.getId() === 'main') {
        for (let i = this.manager.drawingManager.shapes.length - 1; i >= 0; i--) {
            const shape = this.manager.drawingManager.shapes[i];

            // Emoji-specific cursor zones (selected only)
            if (shape.isSelected && shape instanceof EmojiNode) {
                const zone = shape.hitTestEmojiZone(x, y, this.timeScale, priceScale);
                if (zone) {
                    if (zone.mode === 'rotate') {
                        this.canvas.style.cursor = InputManager.ROTATE_CURSOR;
                    } else if (zone.mode === 'resize') {
                        // Corner-appropriate resize cursor
                        const diag = zone.cornerIdx === 0 || zone.cornerIdx === 2 ? 'nwse-resize' : 'nesw-resize';
                        this.canvas.style.cursor = diag;
                    } else {
                        this.canvas.style.cursor = 'grab';
                    }
                    shape.isHovered = true;
                    return;
                }
                shape.isHovered = false;
                continue;
            }

            if (shape.isSelected && shape.hitTestAnchor(x, y, this.timeScale, priceScale)) {
                this.canvas.style.cursor = 'move';
                shape.isHovered = false;
                return;
            }
            if (shape.hitTest(x, y, this.timeScale, priceScale)) {
                this.canvas.style.cursor = (shape.isSelected && !shape.isLocked) ? 'grab' : 'pointer';
                shape.isHovered = true;
                return;
            }
            shape.isHovered = false;
        }
    }
    // Apply cursor mode override for the default (no hover) case
    switch (this.cursorModeOverride) {
      case 'dot': this.canvas.style.cursor = InputManager.DOT_CURSOR; break;
      case 'eraser': this.canvas.style.cursor = InputManager.ERASER_CURSOR; break;
      case 'arrow': this.canvas.style.cursor = 'default'; break;
      default: this.canvas.style.cursor = 'crosshair'; break;
    }
  }

  private onDblClick = (e: MouseEvent) => {
    // Polyline / Path finalisieren (ZT-P2: Logik nach finalizePolyline() extrahiert,
    // damit Touch-Double-Tap denselben Pfad nutzt)
    if ((this.mode === 'draw_polyline' || this.mode === 'draw_path') && this.activeDrawingNode instanceof PolylineNode) {
        this.finalizePolyline();
        return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartH = rect.height - this.manager.options.layout.axisHeight;

    // Registrierte Multi-Click-Tools (steps: -1) via Registry finalisieren
    if (this.mode.startsWith('draw_') && this.activeDrawingNode) {
        const lg = this.getLogicalCoordinates(x, y);
        if (lg && dispatchDoubleClick(this.mode, lg, this)) return;
    }


    // Registrierter Dblclick-Hit-Hook (z.B. Tabellen-Zell-Editor eines Plugins)
    {
      const targetPane = this.manager.getPaneAt(y);
      const priceScale = targetPane?.getPriceScale() as any;
      const lg = this.getLogicalCoordinates(x, y);
      if (priceScale && lg) {
        for (let i = this.manager.drawingManager.shapes.length - 1; i >= 0; i--) {
          const shape = this.manager.drawingManager.shapes[i];
          if (shape.isVisible === false) continue;
          if (shape.hitTest(x, y, this.timeScale, priceScale) && dispatchDoubleClickHit(shape, lg, this)) return;
        }
      }
    }

    // Double-click on Y-axis → reset auto-scale
    if (x > (rect.width - this.manager.options.layout.axisWidth)) {
      this.manager.resetYScale();
      return;
    }
    // Double-click below chart area (X-axis) → scroll to latest
    if (y >= chartH) {
      this.manager.scrollToEnd();
      return;
    }
  };


  private finalizePolyline(): void {
    if (!(this.activeDrawingNode instanceof PolylineNode)) return;
    const pl = this.activeDrawingNode;
    // Letzten Preview-Punkt entfernen, falls Duplikat
    if (pl.points.length >= 3) {
        const last = pl.points[pl.points.length - 1];
        const prev = pl.points[pl.points.length - 2];
        if (last.index === prev.index && last.price === prev.price) pl.points.pop();
    }
    if (pl.points.length < 2) {
        this.manager.drawingManager.removeDrawing(pl.id);
    } else {
        pl.point1 = pl.points[0];
        pl.point2 = pl.points[pl.points.length - 1];
        pl.isSelected = true;
        this.manager.emit('drawingCreated', { id: pl.id, type: pl.shapeType, data: { points: pl.points } });
    }
    this.drawStep = 0; this.activeDrawingNode = null;
    if (!this.keepDrawing) { this.mode = 'crosshair_and_pan'; this.manager.emit('toolReset', null); }
  }


  /** ZT-P3: Toleranz parametrisiert — Maus ±4px (Default/Hover), Touch ±12px. */
  private findDividerAt(y: number, tolerance: number = InputManager.DIVIDER_TOL_MOUSE_PX): number | null {
    const dividers = this.manager.getDividerPositions();
    for (let i = 0; i < dividers.length; i++) {
      if (Math.abs(y - dividers[i].y) <= tolerance) return i;
    }
    return null;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Y-Achsen-Zoom: Maus über einer Preisachsen-Spalte → deren Skala skalieren
    // ZV10-P7c: Multi-Y — Spalten-Hit + Anker-Preis aus der getroffenen Scale.
    const wheelScaleId = findAxisScaleAt(
      mouseX, rect.width, this.manager.options.layout.axisWidth,
      this.manager.getAxisColumns?.() ?? []);
    if (wheelScaleId !== null) {
      const paneHit = this.manager.getPaneAt(mouseY);
      const paneId = paneHit?.getId() ?? undefined;
      // Anchor: Preis unter Mauszeiger bleibt fixiert beim Zoom
      const hitScale = (paneHit as any)?.pane?.resolveScale?.(wheelScaleId)
        ?? (paneHit as any)?.getPriceScale();
      const anchorPrice = hitScale?.yToPrice(mouseY - ((paneHit as any)?.pane?.topOffset ?? 0)) ?? undefined;
      // Fixer 10%-Schritt pro Tick (kein roher deltaY) — identisch zum X-Zoom
      const normalizedDelta = e.deltaY < 0 ? -10 : 10;
      (this.manager as any).zoomPriceAnchored(normalizedDelta, paneId, anchorPrice, wheelScaleId);
      return;
    }

    // X-Achsen-Zoom um den Fokuspunkt (ZT-P2: gemeinsamer Anker-Helper mit Pinch;
    // Mathematik unverändert: ±10% pro Tick, candleWidth-Clamp 1..100).
    // ZV10-P6: zoomAnchor 'right_edge' ankert an der letzten Kerze (MetaTrader-
    // Verhalten) statt am Mauszeiger; Pinch bleibt immer 'pointer'.
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    let focalX = mouseX;
    if (this.manager.options.timeScale?.zoomAnchor === 'right_edge') {
      const totalCount = this.manager.dataStore.getAllData().length;
      if (totalCount > 0) focalX = this.timeScale.indexToX(totalCount - 1);
    }
    this.timeScale.zoomAroundX(focalX, zoomFactor);
    // R-perf-100k P1: Wheel-Zoom hat die View verändert — dirty.
    this.manager.markDirty();
  };

  /**
   * Cleanup: Remove all event listeners for React unmount.
   */
  public destroy() {
    this.clearLongPress(); // ZT-P2: schwebenden Long-Press-Timer entschärfen
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
