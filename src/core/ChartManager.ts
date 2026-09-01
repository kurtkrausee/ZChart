// core/ChartManager.ts
// Version: 1.41.0 | Updated: 2026-08-16 | By: Agent
// 1.41.0 (ZV10-d): NearStart-Prefetch bereits eine sichtbare Breite (>=50 Bars) vor dem
//   Datenanfang statt bei start<=5; scrollToEnd(flushEdge) + scrollToStart (P12).
// 1.40.0 (ZV10-P8): drawMainPaneUnified löst Scale je Node auf (Multi-Y-Fix)
// 1.39.0 (ZV10-P7c): zoomPrice/zoomPriceAnchored/zoomPriceFactorAnchored/panPrice
//   nehmen optional scaleId (Default-Scale wenn undefined) — Multi-Y-Input.
// 1.38.0 (ZV10-P7b): Multi-Y-Achse — Achsen-Spalten-Layout (axisLayout.ts) für
//   Zusatz-Scales rechts, Content-Breite schrumpft; alle Scale-Höhen je Pane;
//   YAxisNode/Crosshair erhalten die Spalten. getAxisColumns() für P7c-Input.
// 1.37.0 (ZV10-P5): emittet 'visibleRangeNearStart' (throttled, 300ms) nach
//   View-Changes mit start <= 5 — ersetzt den 500-ms-History-Poll im React-Layer.
// 1.36.0: setData emittiert 'dataReplaced' — OverlayIndicatorController rechnet
//   Pattern-Overlays (keine BaseIndicatorNodes) gegen den frischen Datensatz neu.
// ZV10-P3: Grid-Vertikalen bis zum rechten Viewport-Rand (Zukunftsbereich)
// P4.6: Background-Gradient-Branch (solid vs. top-to-bottom gradient)
// P4.8: scrollToEnd + setData use options.layout.rightBars; autoScale passes options
// P6.1: StatusLineNode registered + drawn as top-left overlay
// P7.3: DayHighLowNode in FIXED_ROLES ('dayhighlow')
// R-perf-100k P1 (2026-05-20): Dirty-Flag im Render-Loop. `startRenderLoop`
//   rendert nur noch, wenn `_needsRender === true`. Idle-Frame-Time fällt damit
//   bei 100k-Bar-Charts von ~197 ms auf ~0 ms. Alle internen Mutationspunkte
//   rufen `markDirty()`. Externe Aufrufer (Hooks, Drawing-Manager, Bridge-
//   Hooks) MÜSSEN `manager.markDirty()` rufen, wenn sie Daten/Zustand mutieren.
//   Notfall-Rollback: `setForceRender(true)` rendert wieder jeden Frame.

import { Pane } from './Pane';
import { collectExtraScaleIds, computeAxisColumns, type AxisColumn } from './axisLayout';
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
import { StatusLineNode } from '../nodes/core/StatusLineNode';
import { BaseIndicatorNode } from '../nodes/indicators/BaseIndicatorNode';
import { SceneNode } from '../nodes/core/SceneNode';

const SUB_PANE_HEADER_LABELS: Record<string, string> = {
  volume: 'Vol',
  rsi: 'RSI',
  stochastic: 'Stochastic',
  stochastic_rsi: 'Stoch RSI',
  atr: 'ATR',
  adx: 'ADX',
  cci: 'CCI',
  woodies_cci: 'Woodies CCI',
  macd: 'MACD',
  ppo: 'PPO',
  price_momentum_oscillator: 'PMO',
  pvo: 'PVO',
  volume_24h: '24h Volume',
  volume_delta: 'Volume Delta',
  cumulative_volume_delta: 'CVD',
  cumulative_volume_index: 'CVI',
  relative_volume_at_time: 'Relative Volume',
  advance_decline_line: 'Advance/Decline Line',
  advance_decline_ratio: 'Advance/Decline Ratio',
  advance_decline_ratio_bars: 'A/D Ratio Bars',
  open_interest: 'Open Interest',
  seasonality: 'Seasonality',
  net_volume: 'Net Volume',
  up_down_volume: 'Up/Down Volume',
  volume_roc: 'Volume ROC',
  obv: 'OBV',
  price_volume_trend: 'PVT',
  klinger_oscillator: 'Klinger',
  accumulation_distribution: 'Accum/Dist',
  chaikin_money_flow: 'Chaikin Money Flow',
  chaikin_oscillator: 'Chaikin Oscillator',
  roc: 'ROC',
  momentum: 'Momentum',
  correlation_coefficient: 'Corr Coeff',
  rank_correlation_index: 'RCI',
  rci_ribbon: 'RCI Ribbon',
  connors_rsi: 'CRSI',
  performance: 'Performance',
  aroon: 'Aroon',
  aroon_oscillator: 'Aroon Oscillator',
  balance_of_power: 'Balance of Power',
  awesome_oscillator: 'Awesome Oscillator',
  bull_bear_power: 'Bull Bear Power',
  bollinger_percent_b: 'Bollinger %b',
  bollinger_bandwidth: 'Bollinger BandWidth',
  chop_zone: 'Chop Zone',
  technical_ratings: 'Technical Ratings',
  money_flow_index: 'Money Flow Index',
  williams_r: 'Williams %R',
  vortex_indicator: 'Vortex',
  average_daily_range: 'ADR',
  relative_vigor_index: 'RVI',
  relative_volatility_index: 'RVolI',
  know_sure_thing: 'KST',
  pring_special_k: 'Special K',
  stochastic_momentum_index: 'SMI',
  true_strength_index: 'TSI',
  smi_ergodic_indicator: 'SMI Ergodic',
  smi_ergodic_oscillator: 'SMI Ergodic Osc',
  trend_strength_index: 'Trend Strength',
  bbtrend: 'BBTrend',
  mass_index: 'Mass Index',
};

export class ChartManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private panes: Pane[] = [];
  private dpr: number = window.devicePixelRatio || 1;
  private isAutoScaling: boolean = true;
  private animationFrameId: number = 0;
  private resizeObserver: ResizeObserver | null = null;
  
  public options: ChartConfig;

  // Mathematik, Daten & Engines
  public timeScale: TimeScale = new TimeScale();
  public dataStore: DataStore = new DataStore();
  private autoScaleEngine = new AutoScaleEngine();

  // Globale Nodes
  private yAxisNode: YAxisNode = new YAxisNode();
  private xAxisNode: XAxisNode;
  private crosshairNode: CrosshairNode = new CrosshairNode();
  public getCrosshairNode() { return this.crosshairNode; }
  private gridNode: GridNode = new GridNode();

  // Interaktion
  public inputManager!: InputManager;
  private mousePos: { x: number, y: number } | null = null;

  public drawingManager: DrawingManager = new DrawingManager();
  public watermarkNode: WatermarkNode = new WatermarkNode();
  public statusLineNode: StatusLineNode;

  // ── Unified Layer Order (main pane) ──
  // Index 0 = background (drawn first), last = foreground (drawn last).
  // Entries are either DrawableShape IDs or SceneNode role strings.
  public mainLayerOrder: string[] = [];
  /**
   * ZIP-P5-Fix10: Zuletzt geladene Wunsch-Reihenfolge (Persistenz-Stand).
   * Dient als Referenz, wenn Layer NACH dem Restore auftauchen (Indikator-Nodes
   * mounten asynchron): sie werden dann an ihrer gespeicherten Position
   * eingefügt statt hinten angehängt. Bleibt gesetzt, bis der User die
   * Reihenfolge selbst ändert.
   */
  private _desiredLayerOrder: string[] | null = null;
  /** SceneNode roles excluded from user-reordering (always drawn last). */
  // trading_overlay: drawn outside clip so Y-axis labels can render into axis area
  private static readonly FIXED_ROLES = new Set(['lastprice', 'dayhighlow', 'trading_overlay']);

  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  // ZV10-P7b: Zusatz-Achsen-Spalten des letzten Render-Passes — eine Quelle
  // für YAxisNode/Crosshair und (P7c) Input-Hit-Testing.
  private _axisColumns: AxisColumn[] = [];
  public getAxisColumns(): AxisColumn[] { return this._axisColumns; }
  private _dividerPositions: { y: number, aboveIdx: number, belowIdx: number }[] = [];
  private _closeButtons: { paneId: string, x: number, y: number, w: number, h: number }[] = [];
  private _originalWeights: Map<string, number> = new Map();

  // ── R-perf-100k P1: Dirty-Flag ─────────────────────────────────────────────
  /** Render-Loop läuft nur einen Draw aus, wenn `true`. Initial `true`, damit
   *  der erste Frame nach Mount immer rendert. Wird nach jedem Draw zurück-
   *  gesetzt; jede Mutation MUSS `markDirty()` rufen. */
  private _needsRender: boolean = true;
  /** Notfall-Schalter: rendert wieder jeden Frame (für Debug/Rollback). */
  private _forceRender: boolean = false;
  /**
   * Bug-A: Sobald `destroy()` lief, darf die rAF-Loop sich NICHT mehr selbst
   * neu einplanen. `cancelAnimationFrame` allein reicht nicht — die Loop ist
   * selbst-rearmend (requestAnimationFrame am Ende jedes Frames), und wenn
   * destroy() zwischen Dispatch und Re-Arm fällt, überlebt die Loop den Cancel
   * und zeichnet als Geister-Instanz (h=0/Scale -30) endlos weiter. Dieses Flag
   * stoppt sie hart.
   */
  private _destroyed: boolean = false;
  /** Markiert den Chart als dirty — wird beim nächsten rAF gerendert. */
  public markDirty(): void { this._needsRender = true; }
  /** Notfall: wieder jeden Frame rendern (Debug). */
  public setForceRender(on: boolean): void { this._forceRender = on; if (on) this._needsRender = true; }

  // ── viewChanged-Event-Tracking ───────────────────────────
  // Nach jedem Render-Pass pruefen wir, ob sich der sichtbare Range geaendert
  // hat. Wenn ja -> emit('viewChanged', {dateRange, priceRange, indexRange}).
  // Deckt alle Mutationsquellen ab (zoom/pan/scrollToEnd/setData/prependData).
  private _lastEmittedView: {
    scrollOffset: number;
    candleWidth: number;
    width: number;
    dataLen: number;
    priceMin: number;
    priceMax: number;
  } | null = null;

  // ── ZV10-P5: visibleRangeNearStart-Event ──────────────────────────────────
  // Reaktives History-Loading: Statt eines 500-ms-Polls im React-Layer emittet
  // die Engine nach jedem View-Change ein throttled Event, sobald der sichtbare
  // Bereich nahe dem Datenanfang liegt (start <= THRESHOLD). Payload enthält
  // den earliestTimestamp für den Nachlade-Fetch.
  // ZV10-d (Prefetch): Schwelle = eine sichtbare Breite (mind. 50 Bars) VOR dem
  // Datenanfang statt 5 Bars — die Historie kommt an, bevor der User die Kante
  // überhaupt sieht (Befund Abnahme: „kurze Wartezeit am Anfang").
  private static readonly NEAR_START_MIN_BARS = 50;
  private static readonly NEAR_START_THROTTLE_MS = 300;
  private _lastNearStartEmit = 0;

  /**
   * Accepts either a container ID string or an HTMLElement directly (for React refs).
   */
  constructor(containerOrId: string | HTMLElement, userOptions?: DeepPartial<ChartConfig>) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;
    if (!container) throw new Error(`Container nicht gefunden.`);
    this.container = container;

    this.container.innerHTML = '';
    this.options = mergeOptions(defaultOptions, userOptions);
    this.xAxisNode = new XAxisNode(this.dataStore);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    // ZT-P1: Browser-Gesten (Scroll/Pinch-Zoom der Seite) auf dem Chart-Canvas
    // deaktivieren — Pointer-Events erreichen so ungefiltert den InputManager.
    // Das umgebende Seiten-Layout bleibt normal scrollbar.
    this.canvas.style.touchAction = 'none';
    // ZT-P6-Fund (iPad): iOS-Safari startet trotz touch-action:none bei
    // gehaltenem Finger die Text-Selektion (blauer Overlay) und feuert dabei
    // pointercancel — Brush-/Highlighter-Striche starben sofort. preventDefault
    // auf pointerdown reicht auf iOS nicht; Selektion muss per CSS aus.
    for (const el of [this.canvas, this.container]) {
      el.style.userSelect = 'none';
      (el.style as any).webkitUserSelect = 'none';
      (el.style as any).webkitTouchCallout = 'none';
      (el.style as any).webkitTapHighlightColor = 'transparent';
    }
    this.container.appendChild(this.canvas);

    this.statusLineNode = new StatusLineNode(this.dataStore);

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

  public off(event: string, callback: (data: any) => void) {
    const arr = this.eventListeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(callback);
    if (idx !== -1) arr.splice(idx, 1);
  }

  public addPane(pane: Pane) {
    // Dedupe: if a pane with the same id already exists, replace it.
    const existingIdx = this.panes.findIndex(p => p.id === pane.id);
    if (existingIdx >= 0) {
      this.panes.splice(existingIdx, 1);
    }
    this.panes.push(pane);
    this.rebalancePaneWeights();
    this._needsRender = true;
  }

  /** Remove a pane by id (used for dynamic server-indicator sub-panes) */
  public removePane(paneId: string): boolean {
    const idx = this.panes.findIndex(p => p.id === paneId);
    if (idx < 0) return false;
    this.panes.splice(idx, 1);
    this._originalWeights.delete(paneId);
    this.rebalancePaneWeights();
    this._needsRender = true;
    return true;
  }

  /**
   * Normalise visible pane weights so they always sum to 1.
   * Ensures multiple dynamically added sub-panes coexist without pushing
   * later panes off the bottom of the canvas.
   *
   * Rules:
   *  - Main pane gets at least 40% of the available weight.
   *  - Sub-panes keep their relative ratios to each other.
   *  - Panes with weight <= 0 stay hidden.
   */
  private rebalancePaneWeights() {
    const visible = this.panes.filter(p => p.heightWeight > 0);
    if (visible.length === 0) return;
    const mainPane = visible.find(p => p.id === 'main');
    const subs = visible.filter(p => p.id !== 'main');

    if (!mainPane) return;

    if (subs.length === 0) {
      mainPane.heightWeight = 1.0;
      return;
    }

    const MAIN_MIN = 0.4;
    const SUB_MIN = 0.08;
    // Ensure every sub pane has at least SUB_MIN before normalisation
    subs.forEach(p => { if (p.heightWeight < SUB_MIN) p.heightWeight = SUB_MIN; });

    const subSum = subs.reduce((s, p) => s + p.heightWeight, 0);
    const availableForSubs = 1 - MAIN_MIN;

    if (subSum > availableForSubs) {
      // Scale subs down to fit, main gets MAIN_MIN
      const scale = availableForSubs / subSum;
      subs.forEach(p => { p.heightWeight *= scale; });
      mainPane.heightWeight = MAIN_MIN;
    } else {
      // Main takes the rest
      mainPane.heightWeight = 1 - subSum;
    }
  }

  /** Read-only access to panes array for API layer */
  public getPanes(): Pane[] {
    return this.panes;
  }

  public setMousePos(x: number | null, y: number | null) {
    // R-perf-100k P1: Nur dirty markieren, wenn sich die Position tatsaechlich
    // aendert. Sonst feuert jeder noise-event (mousemove ohne Pixel-Bewegung,
    // ResizeObserver-Stoeße) einen 161-ms-Render bei 100k Bars.
    const prev = this.mousePos;
    const next = (x === null || y === null) ? null : { x, y };
    const changed = (prev === null && next !== null)
                 || (prev !== null && next === null)
                 || (prev !== null && next !== null && (prev.x !== next.x || prev.y !== next.y));
    this.mousePos = next;
    if (changed) this._needsRender = true;
  }

  /** Public accessor for current canvas-local mouse position (Batch H+: tooltip-fähige Renderer). */
  public getMousePos(): { x: number; y: number } | null {
    return this.mousePos;
  }

  /** Zoom the X-axis (time). factor > 1 = zoom in, < 1 = zoom out. Anchor: center of visible area. */
  public zoomTime(factor: number) {
    const centerX = this.timeScale.width / 2;
    const indexAtCenter = this.timeScale.xToIndex(centerX);
    const newCandleWidth = Math.max(2, Math.min(50, this.timeScale.candleWidth * factor));
    this.timeScale.candleWidth = newCandleWidth;
    // Keep center pinned
    this.timeScale.scrollOffset = centerX - (indexAtCenter * newCandleWidth);
    this._needsRender = true;
  }

  /** Zoom so that the pixel range [xLeft, xRight] fills the visible width. */
  public zoomToPixelRange(xLeft: number, xRight: number) {
    if (xRight - xLeft < 4) return;
    const idxLeft = this.timeScale.xToIndex(xLeft);
    const idxRight = this.timeScale.xToIndex(xRight);
    const span = Math.max(1, idxRight - idxLeft);
    const newCandleWidth = Math.max(1, Math.min(100, this.timeScale.width / span));
    this.timeScale.candleWidth = newCandleWidth;
    this.timeScale.scrollOffset = -idxLeft * newCandleWidth;
    this._needsRender = true;
  }

  /** Export canvas as PNG data-URL for snapshots */
  public toDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  // ZV10-P7c: scaleId-Parameter — Zoom/Pan trifft die gebundene Scale der Pane
  // (undefined = Default-Scale 'right', rückwärtskompatibel).
  public zoomPrice(deltaY: number, paneId?: string, scaleId?: string) {
    const pane = paneId
      ? this.panes.find(p => p.id === paneId)
      : this.panes.find(p => p.id === 'main');
    if (pane) {
      this.isAutoScaling = false;
      pane.resolveScale(scaleId).zoom(deltaY);
      this._needsRender = true;
    }
  }

  /** Zoom the price axis while keeping the price at anchorPrice fixed (mouse-wheel Y-zoom, TradingView-style) */
  public zoomPriceAnchored(deltaY: number, paneId?: string, anchorPrice?: number, scaleId?: string) {
    const pane = paneId
      ? this.panes.find(p => p.id === paneId)
      : this.panes.find(p => p.id === 'main');
    if (pane) {
      this.isAutoScaling = false;
      pane.resolveScale(scaleId).zoomAnchored(deltaY, anchorPrice);
      this._needsRender = true;
    }
  }

  /** ZT-P2: Faktor-basierter Anker-Zoom der Preisachse (Pinch-Geste).
   *  rangeFactor >1 = herauszoomen; anchorPrice bleibt pixelgenau fixiert. */
  public zoomPriceFactorAnchored(rangeFactor: number, paneId?: string, anchorPrice?: number, scaleId?: string) {
    const pane = paneId
      ? this.panes.find(p => p.id === paneId)
      : this.panes.find(p => p.id === 'main');
    if (pane) {
      this.isAutoScaling = false;
      pane.resolveScale(scaleId).zoomFactorAnchored(rangeFactor, anchorPrice);
      this._needsRender = true;
    }
  }

  /** Pan the price axis vertically (translate, not zoom) */
  public panPrice(deltaY: number, paneId?: string, scaleId?: string) {
    const pane = paneId
      ? this.panes.find(p => p.id === paneId)
      : this.panes.find(p => p.id === 'main');
    if (pane) {
      this.isAutoScaling = false;
      pane.resolveScale(scaleId).pan(deltaY);
      this._needsRender = true;
    }
  }

  /**
   * Scroll to the latest candle (right edge), reserving options.layout.rightBars empty bars.
   * ZV10-P12: optional `rightMarginFraction` (0..0.9) — Anteil der sichtbaren
   * Breite, der rechts frei bleibt (MetaTrader „mit Abstand", z.B. 0.2);
   * es gilt das Maximum aus rightBars und dem Anteil. `flushEdge = true`
   * ignoriert rightBars — letzte Kerze bündig am rechten Rand (MetaTrader
   * „Zum Chart-Ende scrollen").
   */
  public scrollToEnd(rightMarginFraction?: number, flushEdge: boolean = false) {
    const totalCandles = this.dataStore.getAllData().length;
    if (totalCandles === 0) return;
    const visibleCandles = Math.floor(this.timeScale.width / this.timeScale.candleWidth);
    let rightBars = flushEdge ? 0 : (this.options.layout.rightBars ?? 5);
    if (typeof rightMarginFraction === 'number' && Number.isFinite(rightMarginFraction) && rightMarginFraction > 0) {
      rightBars = Math.max(rightBars, Math.floor(visibleCandles * Math.min(0.9, rightMarginFraction)));
    }
    this.timeScale.scrollOffset = -(totalCandles + rightBars - visibleCandles) * this.timeScale.candleWidth;
    this._needsRender = true;
  }

  /**
   * ZV10-P12: Zum Chart-Anfang springen (ältester geladener Bar am linken Rand,
   * MetaTrader „Anfang"). Optional `leftMarginFraction` lässt links Luft.
   * Y-AutoScale wird reaktiviert, damit der Ausschnitt korrekt skaliert.
   */
  public scrollToStart(leftMarginFraction: number = 0) {
    const totalCandles = this.dataStore.getAllData().length;
    if (totalCandles === 0) return;
    const visibleCandles = Math.floor(this.timeScale.width / this.timeScale.candleWidth);
    const leftBars = Math.floor(visibleCandles * Math.max(0, Math.min(0.9, leftMarginFraction)));
    this.timeScale.scrollOffset = leftBars * this.timeScale.candleWidth;
    this.isAutoScaling = true;
    this._needsRender = true;
  }

  /** Re-enable auto-scaling for the Y axis */
  public resetYScale() {
    this.isAutoScaling = true;
    this._needsRender = true;
  }

  public getPaneAt(pixelY: number) {
    for (const pane of this.panes) {
      if (pane.heightWeight <= 0) continue;
      if (pixelY >= pane.topOffset && pixelY <= pane.topOffset + pane.computedHeight) {
        return {
          pane,
          localY: pixelY - pane.topOffset,
          getId: () => pane.id,
          getTopOffset: () => pane.topOffset,
          getPriceScale: () => pane.priceScale,
        };
      }
    }
    return null;
  }

  public getDividerPositions() { return this._dividerPositions; }
  public getVisiblePanes() { return this.panes.filter(p => p.heightWeight > 0); }

  public getCloseButtonAt(x: number, y: number): string | null {
    for (const btn of this._closeButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn.paneId;
    }
    return null;
  }

  public resizePanesByDivider(dividerIdx: number, deltaPixels: number): void {
    const div = this._dividerPositions[dividerIdx];
    if (!div) return;
    const visiblePanes = this.getVisiblePanes();
    const above = visiblePanes[div.aboveIdx];
    const below = visiblePanes[div.belowIdx];
    if (!above || !below) return;
    const cH = (this.canvas.height / this.dpr) - this.options.layout.axisHeight;
    const dW = deltaPixels / cH;
    const minW = 30 / cH;
    if (above.heightWeight + dW < minW || below.heightWeight - dW < minW) return;
    above.heightWeight += dW;
    below.heightWeight -= dW;
    this._needsRender = true;
  }

  public togglePaneVisibility(paneId: string): void {
    const pane = this.panes.find(p => p.id === paneId);
    if (!pane || pane.id === 'main') return;
    if (pane.heightWeight > 0) {
      this._originalWeights.set(paneId, pane.heightWeight);
      pane.heightWeight = 0;
    } else {
      const ow = this._originalWeights.get(paneId) || 0.2;
      pane.heightWeight = ow;
    }
    this.rebalancePaneWeights();
    const visible = pane.heightWeight > 0;
    this.emit('paneToggled', { paneId, visible });
    this._needsRender = true;
  }

  private setupResizing() {
    this.resizeObserver = new ResizeObserver(() => this.updateSize());
    this.resizeObserver.observe(this.container);
    this.updateSize();
  }

  private updateSize() {
    const rect = this.container.getBoundingClientRect();
    // Guard: skip resize when container is detached, hidden, or has no size
    if (rect.width < 1 || rect.height < 1) return;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
    // ResizeObserver feuert oft mehrfach in einer rAF; statt direkt zu rendern
    // markieren wir nur dirty, der Loop sammelt die Frames zusammen.
    this._needsRender = true;
  }

  // ── Main Layer Order helpers ──

  public getMainLayerOrder(): string[] { return [...this.mainLayerOrder]; }

  public setMainLayerOrder(order: string[]): void {
    this.mainLayerOrder = [...order];
    // ZIP-P5-Fix10: Jede explizit gesetzte Reihenfolge ist ab sofort die
    // Referenz für später auftauchende Layer — sowohl der Restore aus der
    // Persistenz als auch eine Umsortierung durch den User.
    this._desiredLayerOrder = [...order];
    this._needsRender = true;
  }

  /**
   * ZIP-P5-Fix10: Setzt NUR die Wunsch-Reihenfolge, ohne die aktuelle zu
   * überschreiben. Für den Restore-Pfad: die gespeicherte Order enthält Layer,
   * die es noch gar nicht gibt — würde man sie direkt setzen, filterte das
   * Self-Healing sie sofort wieder heraus.
   */
  public setDesiredLayerOrder(order: string[]): void {
    this._desiredLayerOrder = [...order];
    this._needsRender = true;
  }

  public addToMainLayerOrder(id: string): void {
    if (!this.mainLayerOrder.includes(id)) { this.mainLayerOrder.push(id); this._needsRender = true; }
  }

  public removeFromMainLayerOrder(id: string): void {
    const idx = this.mainLayerOrder.indexOf(id);
    if (idx !== -1) { this.mainLayerOrder.splice(idx, 1); this._needsRender = true; }
  }

  /**
   * Unified rendering for the main pane.
   * Draws all shapes and reorderable SceneNodes in mainLayerOrder sequence.
   * Fixed nodes (e.g. lastprice) are always drawn last.
   */
  private drawMainPaneUnified(pane: Pane) {
    // Build lookup maps for current main-pane elements
    const shapeMap = new Map<string, import('./DrawingManager').DrawableShape>();
    for (const s of this.drawingManager.shapes) {
      if ((s.paneId ?? 'main') === 'main') shapeMap.set(s.id, s);
    }
    const nodeMap = new Map<string, SceneNode>();
    for (const n of pane.nodes) {
      if (n.role && !ChartManager.FIXED_ROLES.has(n.role)) {
        nodeMap.set(n.role, n);
      }
    }

    // Self-healing: remove stale IDs, auto-append new ones
    this.mainLayerOrder = this.mainLayerOrder.filter(
      id => shapeMap.has(id) || nodeMap.has(id)
    );
    // ZIP-P5-Fix10: Neue Layer an ihrer GEWÜNSCHTEN Position einsetzen, falls
    // eine solche hinterlegt ist (desiredLayerOrder = zuletzt geladener
    // Persistenz-Stand). Ohne das landeten Layer, die beim Laden noch nicht
    // existierten, immer hinten — Indikator-Nodes mounten asynchron NACH den
    // Drawings, weshalb der Kurschart (`series`) nach dem Reload unter die
    // Indikatoren rutschte, obwohl der User ihn nach vorne gezogen hatte
    // (Befund Abnahme 2026-08-13). Drawings/Emoji waren nie betroffen, weil sie
    // bereits beim Restore existieren.
    const insertByDesired = (id: string) => {
      const desired = this._desiredLayerOrder;
      const wantIdx = desired ? desired.indexOf(id) : -1;
      if (wantIdx === -1) { this.mainLayerOrder.push(id); return; }
      // Erste bereits vorhandene ID finden, die laut Wunsch NACH `id` kommt.
      let insertAt = this.mainLayerOrder.length;
      for (let i = 0; i < this.mainLayerOrder.length; i++) {
        const otherIdx = desired!.indexOf(this.mainLayerOrder[i]);
        if (otherIdx !== -1 && otherIdx > wantIdx) { insertAt = i; break; }
      }
      this.mainLayerOrder.splice(insertAt, 0, id);
    };
    for (const [id] of shapeMap) {
      if (!this.mainLayerOrder.includes(id)) insertByDesired(id);
    }
    for (const [role] of nodeMap) {
      if (!this.mainLayerOrder.includes(role)) insertByDesired(role);
    }

    // Unified draw pass (background → foreground)
    for (const id of this.mainLayerOrder) {
      const shape = shapeMap.get(id);
      if (shape) { if (shape.isVisible) shape.draw(this.ctx, this.timeScale, pane.priceScale, this.options); continue; }
      const node = nodeMap.get(id);
      // ZV10-P8: Scale je Node auflösen (Multi-Y) — vorher lief der Unified-Pass
      // an Pane.draw vorbei und zeichnete alle Nodes auf der Default-Scale
      // (Befund Abnahme: Compare-absolut lag auf der Kerzen-Achse).
      if (node) { if (node.isVisible !== false) node.draw(this.ctx, this.timeScale, pane.resolveScale(node.yAxisId), this.options); }
    }

  }

  private startRenderLoop() {
    // R-perf-100k P1: Dirty-Flag — render() läuft nur, wenn der Chart
    // tatsächlich neu gezeichnet werden muss. Idle-Frames sind danach
    // praktisch kostenlos (<1 ms statt 197 ms bei 100k Bars).
    const loop = () => {
      // Bug-A: harte Stopp-Bedingung — eine zerstörte Instanz darf weder
      // rendern noch sich neu einplanen (sonst Geister-rAF-Loop, s. _destroyed).
      if (this._destroyed) return;
      if (this._needsRender || this._forceRender) {
        this.render();
        this._needsRender = false;
        // nach jedem Render pruefen ob sich der sichtbare
        // Range geaendert hat. Wenn ja emit('viewChanged').
        this._maybeEmitViewChanged();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  // ── viewChanged-Emit ─────────────────────────────────────
  /** Liefert die main-Pane oder undefined. Fuer priceRange-Lookup. */
  private _getMainPane(): Pane | undefined {
    return this.panes.find((p) => p.id === 'main');
  }

  /** Liefert {start, end} als ganzzahlige Daten-Indizes der sichtbaren Range. */
  public getVisibleIndexRange(): { start: number; end: number } {
    const totalCandles = this.dataStore.getAllData().length;
    return this.timeScale.getVisibleRange(totalCandles);
  }

  /** Liefert die sichtbare Date-Range als Unix-Millisekunden-Timestamps. */
  public getVisibleDateRange(): { from: number | null; to: number | null } {
    const data = this.dataStore.getAllData();
    if (!data.length) return { from: null, to: null };
    const { start, end } = this.timeScale.getVisibleRange(data.length);
    const fromIdx = Math.max(0, Math.min(data.length - 1, start));
    // end ist exklusiv → wir nehmen end-1 als letzten sichtbaren Index
    const toIdx = Math.max(0, Math.min(data.length - 1, end - 1));
    return {
      from: data[fromIdx]?.timestamp ?? null,
      to: data[toIdx]?.timestamp ?? null,
    };
  }

  /** Liefert die aktuelle Preis-Range der main-Pane. */
  public getMainPriceRange(): { min: number; max: number } | null {
    const main = this._getMainPane();
    if (!main) return null;
    return { min: main.priceScale.minPrice, max: main.priceScale.maxPrice };
  }

  private _maybeEmitViewChanged(): void {
    const main = this._getMainPane();
    const priceMin = main?.priceScale.minPrice ?? 0;
    const priceMax = main?.priceScale.maxPrice ?? 0;
    const dataLen = this.dataStore.getAllData().length;
    const cur = {
      scrollOffset: this.timeScale.scrollOffset,
      candleWidth: this.timeScale.candleWidth,
      width: this.timeScale.width,
      dataLen,
      priceMin,
      priceMax,
    };
    const prev = this._lastEmittedView;
    const changed =
      !prev ||
      prev.scrollOffset !== cur.scrollOffset ||
      prev.candleWidth !== cur.candleWidth ||
      prev.width !== cur.width ||
      prev.dataLen !== cur.dataLen ||
      prev.priceMin !== cur.priceMin ||
      prev.priceMax !== cur.priceMax;
    if (!changed) return;

    this._lastEmittedView = cur;

    // ZV10-P5: unabhängig von viewChanged-Subscribern prüfen (eigenes Event).
    this._maybeEmitNearStart(cur.dataLen);

    // Listener nur informieren, wenn jemand subscribed hat
    if (!this.eventListeners.get('viewChanged')?.length) return;

    const indexRange = this.getVisibleIndexRange();
    const dateRange = this.getVisibleDateRange();
    this.emit('viewChanged', {
      indexRange,
      dateRange,
      priceRange: { min: priceMin, max: priceMax },
      candleWidth: cur.candleWidth,
      width: cur.width,
    });
  }

  /**
   * ZV10-P5: Emittet 'visibleRangeNearStart' (throttled), wenn der sichtbare
   * Bereich nahe dem Datenanfang liegt. Wird nach jedem View-Change aus
   * `_maybeEmitViewChanged` aufgerufen — deckt Pan/Zoom/Resize/Prepend ab.
   * Guards (isLoading/noMoreHistory) liegen beim Subscriber; nach einem
   * erfolgreichen Prepend ändert sich dataLen → nächster Check kommt reaktiv.
   */
  private _maybeEmitNearStart(dataLen: number): void {
    if (dataLen === 0) return;
    if (!this.eventListeners.get('visibleRangeNearStart')?.length) return;
    const { start } = this.timeScale.getVisibleRange(dataLen);
    const visibleBars = Math.ceil(this.timeScale.width / Math.max(1, this.timeScale.candleWidth));
    const threshold = Math.max(ChartManager.NEAR_START_MIN_BARS, visibleBars);
    if (start > threshold) return;
    const now = performance.now();
    if (now - this._lastNearStartEmit < ChartManager.NEAR_START_THROTTLE_MS) return;
    this._lastNearStartEmit = now;
    this.emit('visibleRangeNearStart', {
      start,
      earliestTimestamp: this.dataStore.getEarliestTimestamp(),
    });
  }

  /**
   * Set OHLCV data and recalculate RSI. Scroll to show latest data.
   */
  public setData(data: import('../data/DataStore').CandleData[]) {
    this.dataStore.setData(data);
    this.dataStore.calculateRSI(14);
    // Re-run every pane indicator against the fresh dataset so derived series
    // (MACD, ATR, ADX …) actually exist after a symbol / timeframe switch.
    for (const pane of this.panes) {
      for (const node of pane.nodes) {
        if (node instanceof BaseIndicatorNode) {
          try { node.calculate(); } catch { /* ignore calc errors */ }
        }
      }
    }
    // Overlay-Indikatoren (Pattern-Marker etc.) sind keine BaseIndicatorNodes —
    // ihre DataStore-Vorberechnung hängt am OverlayIndicatorController, der
    // hierauf lauscht (sonst bleiben Marker nach Symbolwechsel leer).
    this.emit('dataReplaced', { count: data.length });
    // Scroll to end so latest candles are visible (P4.8: reserve rightBars)
    const totalCandles = data.length;
    const rightBars = this.options.layout.rightBars ?? 5;
    const visibleCandles = Math.floor(this.timeScale.width / this.timeScale.candleWidth);
    this.timeScale.scrollOffset = -(totalCandles + rightBars - visibleCandles) * this.timeScale.candleWidth;
    // Re-enable Y auto-scaling so new symbol/timeframe fits its own price range
    // (prevents AAPL $280 leftover min/max from hiding DAX at 18.000).
    this.isAutoScaling = true;
    this._needsRender = true;
  }

  /**
   * Prepend older historical data. Adjusts scroll offset so the view stays in place.
   */
  /** Live-Tick: Kerze aktualisieren/anhaengen (WS-Feed) + neu rendern. */
  public upsertCandle(candle: import('../data/DataStore').CandleData): 'appended' | 'updated' | 'ignored' {
    const result = this.dataStore.upsertCandle(candle);
    if (result !== 'ignored') {
      this.markDirty();
      this.emit('candleUpserted', { result, timestamp: candle.timestamp });
    }
    return result;
  }

  public prependData(olderData: import('../data/DataStore').CandleData[]) {
    const addedCount = this.dataStore.prependData(olderData);
    if (addedCount > 0) {
      // ZIP-P5-Fix8: Zeichnungs-Anker um die eingefügten Kerzen mitverschieben.
      // Ihre Anker sind INDEX-basiert; prependData schiebt vorne Kerzen ein und
      // verschiebt damit alle Indizes um addedCount. Ohne diese Korrektur
      // rutschten Emoji & Co. relativ zu den Kerzen (und der nächste Auto-Save
      // schrieb die falsche Position als neue Wahrheit fest — Befund Abnahme:
      // "Position wird nicht gespeichert", obwohl in der DB korrekt).
      // setData() ist über captureDrawingTimestamps/applyDrawingRemap
      // abgesichert; prependData war es nie.
      for (const shape of this.drawingManager.shapes) {
        if (shape.point1) shape.point1 = { ...shape.point1, index: shape.point1.index + addedCount };
        if (shape.point2) shape.point2 = { ...shape.point2, index: shape.point2.index + addedCount };
        const withPoints = shape as unknown as { points?: Array<{ index: number; price: number }> };
        if (Array.isArray(withPoints.points)) {
          withPoints.points = withPoints.points.map(p => ({ ...p, index: p.index + addedCount }));
        }
      }
      // Shift scroll offset left by the number of new candles so the view stays stable
      this.timeScale.scrollOffset -= addedCount * this.timeScale.candleWidth;
      // Recalculate indicators on the full dataset
      this.dataStore.calculateRSI(14);
      this.dataStore.calculateSMA(20);
      this.dataStore.calculateSMA(50);
      this.dataStore.calculateEMA(20);
      this.dataStore.calculateEMA(50);
      this._needsRender = true;
    }
    return addedCount;
  }

  /**
   * Cleanup for React useEffect teardown. Stops rAF, disconnects ResizeObserver.
   */
  public destroy() {
    // Bug-A: zuerst das Flag — stoppt die selbst-rearmende rAF-Loop garantiert,
    // auch wenn cancelAnimationFrame den nächsten (bereits dispatchten) Frame
    // verpasst. Ohne das überlebt eine Geister-Instanz als endlose h=0-Loop.
    this._destroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.inputManager?.destroy();
    this.eventListeners.clear();
    this.container.innerHTML = '';
  }

  public clearPanes() {
    this.panes = [];
    this._needsRender = true;
  }

  public render() {
    // Bug-A: zerstörte Instanz nie zeichnen (stale API-Ref / Geister-Frame).
    if (this._destroyed) return;
    // R-perf-100k P1: Wer render() explizit ruft, leert auch das Dirty-Flag —
    // sonst rendert die rAF-Loop unmittelbar danach ein zweites Mal.
    this._needsRender = false;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    // ZV10-P7b: Zusatz-Scales stapeln als eigene Achsen-Spalten rechts neben
    // dem Content (Default-Spalte bleibt außen); Content-Breite schrumpft mit.
    const extraScaleIds = collectExtraScaleIds(this.panes);
    const axisLayout = computeAxisColumns(extraScaleIds, width, this.options.layout.axisWidth);
    this._axisColumns = axisLayout.columns;
    const chartContentWidth = axisLayout.contentWidth;
    const chartContentHeight = height - this.options.layout.axisHeight;

    // 1. Hintergrund (P4.6: Solid oder Top-to-Bottom-Gradient)
    const bgFrom = this.options.colors.background;
    const bgTo   = this.options.colors.backgroundGradientTo;
    if (bgTo && bgTo !== bgFrom) {
      const grad = this.ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, bgFrom);
      grad.addColorStop(1, bgTo);
      this.ctx.fillStyle = grad;
    } else {
      this.ctx.fillStyle = bgFrom;
    }
    this.ctx.fillRect(0, 0, width, height);

    this.timeScale.width = chartContentWidth;

    // 2. Sichtbarer Bereich berechnen
    const totalDataCount = this.dataStore.getAllData().length;
    const { start, end } = this.timeScale.getVisibleRange(totalDataCount);
    const visibleData = this.dataStore.getVisibleData(start, end);

    // 3. Grid zeichnen (nur bis chartContentHeight)
    // ZV10-P3: Vertikalen bis zum rechten Viewport-Rand (Zukunftsbereich),
    // deckungsgleich mit den extrapolierten X-Achsen-Labels (>= 2 Kerzen).
    const gridEnd = totalDataCount >= 2
      ? Math.max(end, Math.ceil(this.timeScale.xToIndex(chartContentWidth)))
      : end;
    this.gridNode.draw(this.ctx, chartContentWidth, chartContentHeight, this.timeScale, this.options, start, gridEnd);

    // 4. Panes rendern (nur sichtbare)
    this._dividerPositions = [];
    this._closeButtons = [];
    const visiblePanes = this.panes.filter(p => p.heightWeight > 0);
    let currentY = 0;

    visiblePanes.forEach((pane, idx) => {
      const paneTop = currentY;
      const paneHeight = chartContentHeight * pane.heightWeight;

      // Cache layout values on Pane for external access
      pane.topOffset = paneTop;
      pane.computedHeight = paneHeight;

      if (idx > 0) {
        this._dividerPositions.push({ y: paneTop, aboveIdx: idx - 1, belowIdx: idx });
      }

      // ZV10-P7b: Höhe für ALLE Scales der Pane setzen (yToPrice/priceToY).
      for (const scale of pane.priceScales.values()) scale.height = paneHeight;

      this.yAxisNode.draw(this.ctx, paneHeight, pane, width, paneTop, this.options, this._axisColumns);
      
      if (this.isAutoScaling) {
        this.autoScaleEngine.scalePane(pane, visibleData, this.options);
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, paneTop, chartContentWidth, paneHeight);
      this.ctx.clip();
      this.ctx.translate(0, paneTop);

      if (pane.id === 'main') {
        this.watermarkNode.draw(this.ctx, this.timeScale, pane.priceScale, this.options);
        this.drawMainPaneUnified(pane);
      } else {
        // Sub-pane: keep legacy below/above split
        this.drawingManager.drawBelow(this.ctx, this.timeScale, pane.priceScale, this.options, pane.id);
        pane.draw(this.ctx, this.timeScale, this.options);
        this.drawingManager.drawAbove(this.ctx, this.timeScale, pane.priceScale, this.options, pane.id);
      }

      this.ctx.restore();

      // Fixed nodes (e.g. lastprice) drawn OUTSIDE clip so label renders into Y-axis area
      if (pane.id === 'main') {
        const fixedNodes = pane.nodes
          .filter(n => n.role && ChartManager.FIXED_ROLES.has(n.role))
          .sort((a, b) => a.zIndex - b.zIndex);
        for (const n of fixedNodes) {
          if (n.isVisible !== false) {
            this.ctx.save();
            this.ctx.translate(0, paneTop);
            n.draw(this.ctx, this.timeScale, pane.priceScale, this.options);
            this.ctx.restore();
          }
        }
      }

      // Pane border (faint outer rectangle)
      this.ctx.strokeStyle = this.options.colors.separator;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(0, paneTop, chartContentWidth, paneHeight);

      // Bold horizontal divider above sub-panes (MetaTrader-style, 2px)
      if (idx > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = this.options.colors.text;
        this.ctx.globalAlpha = 0.35;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, paneTop);
        this.ctx.lineTo(chartContentWidth, paneTop);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Sub-pane header: label + close button
      if (pane.id !== 'main' && paneHeight > 20) {
        const label = SUB_PANE_HEADER_LABELS[pane.id] ?? pane.id;
        this.ctx.save();
        this.ctx.font = `10px ${this.options.layout.fontFamily}`;
        this.ctx.fillStyle = this.options.colors.text;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillText(label, 6, paneTop + 13);
        const btnSize = 14;
        const btnX = chartContentWidth - btnSize - 6;
        const btnY = paneTop + 3;
        this.ctx.strokeStyle = this.options.colors.text;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = 0.4;
        this.ctx.beginPath();
        this.ctx.moveTo(btnX + 3, btnY + 3);
        this.ctx.lineTo(btnX + 11, btnY + 11);
        this.ctx.moveTo(btnX + 11, btnY + 3);
        this.ctx.lineTo(btnX + 3, btnY + 11);
        this.ctx.stroke();
        this.ctx.restore();
        this._closeButtons.push({ paneId: pane.id, x: btnX, y: btnY, w: btnSize, h: btnSize });
      }

      currentY += paneHeight;
    });

    // 5. StatusLine Overlay (P6.1) — drawn above all panes, before X-axis
    const _slMainPane = this.panes.find(p => p.id === 'main');
    if (_slMainPane && this.statusLineNode.isVisible && this.statusLineNode.settings.visible) {
      let hovIdx: number | null = null;
      if (this.mousePos) {
        const raw = Math.round(this.timeScale.xToIndex(this.mousePos.x));
        const total = this.dataStore.getAllData().length;
        if (raw >= 0 && raw < total) hovIdx = raw;
      }
      this.statusLineNode.hoveredIndex = hovIdx;
      this.statusLineNode.draw(this.ctx, this.timeScale, _slMainPane.priceScale, this.options);
    }

    // 6. X-Achse & Crosshair
    this.xAxisNode.draw(this.ctx, chartContentWidth, height, this.timeScale, this.options);

    if (this.mousePos) {
      // Compute global canvas-Y of the LastPriceLine label for overlap avoidance
      let lastPriceGlobalY: number | undefined;
      const mainPane = this.panes.find(p => p.id === 'main');
      if (mainPane) {
        const allData = this.dataStore.getAllData();
        if (allData.length > 0) {
          const lastClose = allData[allData.length - 1].close;
          lastPriceGlobalY = mainPane.topOffset + mainPane.priceScale.priceToY(lastClose);
        }
      }
      this.crosshairNode.draw(
        this.ctx, this.mousePos, chartContentWidth, height,
        this.timeScale, (y: number) => this.getPaneAt(y), this.options,
        this.dataStore, lastPriceGlobalY, this._axisColumns
      );
    }
  }
}