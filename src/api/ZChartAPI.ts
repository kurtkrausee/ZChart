// src/api/ZChartAPI.ts
// Version: 6.67.0 | Updated: 2026-08-16 | By: Agent
// 6.66.0 (ZV10-P7d): Multi-Y-API — addPriceScale/removePriceScale/setNodeYAxis
// 6.65.0: setRangeHighlight — Zeitbereich-Band im Main-Pane (ZS-P2-FB4,
//         D1-Bild-Ausschnitt im W1/M1-Neben-Pane; kein Drawing). Inline wie
//         registerCustomScript (Einzel-Node-Verwaltung, kein Controller nötig).
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  ZChartAPI — öffentliche Fassade. Signaturen eingefroren; intern reine     │
// │  Delegation an Domain-Controller (siehe controllers/ + indicators/).       │
// │                                                                            │
// │  Sektions-Reihenfolge (P16 — als Inhaltsverzeichnis lesbar):               │
// │   1. Lifecycle           constructor / destroy / subscribe                 │
// │   2. Viewport            this.viewport   — Koordinaten/Zoom/Scroll/Range    │
// │   3. Tools & Input        manager.inputManager — setTool/Cursor/Defaults    │
// │   4. Drawings            this.drawings    — Layer/Compare/Serialize/Undo    │
// │   5. Settings            this.settings    — Theme/Skalen/ChartStyle/Margins │
// │   6. Pane-Indicators     this.indicators  — addIndicatorPane(id, …)        │
// │   7. Overlay-Indicators  this.overlayIndicators                            │
// │   8. (Erweiterungen → ZChart Pro)                                                │
// │                                                                            │
// │  NEUE Methoden NICHT inline implementieren — in den passenden Controller   │
// │  (oder neuen Controller) legen und hier nur 1-Zeilen-Delegate ergänzen.    │
// │  Neue Pane-Indikatoren brauchen KEINE Fassaden-Methode: Registry-Eintrag   │
// │  in indicators/panes/* genügt (Aufruf: addIndicatorPane). Siehe README.md. │
// └──────────────────────────────────────────────────────────────────────────┘
//
// 6.64.0: Abschluss-Aufräumen — 144 tote benannte add*Pane/remove*Pane-Delegates
//         entfernt (seit P17 ohne Aufrufer; verifiziert: nur addIndicatorPane/
//         removeIndicatorPane/removeShapesByPane werden extern genutzt). 992→~520 Z.
// 6.63.0: P16 — ServerIndicatorController extrahiert (letzter echter Code-Block);
//         Fassade in betitelte Controller-Sektionen umsortiert (reine Delegation).
// 6.62.0: P15 — setTool-Konsolidierung (S7): ToolId aus InputMode (Template-Literal),
//         ~85-fache if-Kaskade → 1 Delegate an toolIdToInputMode().
// 6.61.0: P14 — Lifecycle (destroy) + devWarn für echte Silent-Failures.
// 6.60.0: P13 — SettingsController extrahiert.
// 6.59.0: P12 — TradingOverlayController extrahiert.
// 6.58.0: P11 — DrawingsController extrahiert.
// 6.57.0: P10b — Serializer-Migration fib/gann/patterns/special.
// 6.56.0: P10a — DrawingSerializer-Kern + lines-shapes-Familie.
// 6.54.0: P8 — Overlay-Registry-Kern.
// 6.53.0: P7 — MovingAverageController + IndicatorExtrasController.
// 6.49.0–6.52.0: P3–P6 — Pane-Indicator-Registry + Batch-Migrationen.
// 6.48.0: P1 — TemplatesController. 6.47.0: registerCustomScript.
import { ChartManager } from '../core/ChartManager';
import { Pane } from '../core/Pane';
import type { TPOCandle } from '../math/TPOEngine';
import type { CrosshairStyle } from '../nodes/core/CrosshairNode';
import { RangeHighlightNode } from '../nodes/core/RangeHighlightNode';
import type { YAxisPosition } from '../math/PriceScale';
import type { PointerInterceptor, InterceptorPhase } from '../input/PointerInterceptor';
import { type ToolId, toolIdToInputMode } from '../input/InputManager';
import type { VisualSettings } from '../core/VisualSettings';
import type { ChartStyle, ZChartSettingsTemplate, IndicatorLineStyleOptions } from './types';
export type { ChartStyle, ZChartSettingsTemplate, IndicatorLineStyleOptions, DrawingExportData } from './types';
import { devWarn } from './types';
import { TemplatesController } from './controllers/TemplatesController';
import { ViewportController } from './controllers/ViewportController';
import { DrawingsController } from './controllers/DrawingsController';
import { SettingsController } from './controllers/SettingsController';
import { PaneIndicatorController, type PaneParams } from './indicators/paneRegistry';
import './indicators/panes';
import { OverlayIndicatorController, type OverlayLineStyles } from './indicators/overlayRegistry';
import './indicators/overlays';
import type { DrawingExportData } from './types';


export class ZChartAPI {
    private manager: ChartManager;
    private templates = new TemplatesController();
    private viewport!: ViewportController;
    private indicators!: PaneIndicatorController;
    private overlayIndicators!: OverlayIndicatorController;
    private drawings!: DrawingsController;
    private settings!: SettingsController;

    constructor(manager: ChartManager) {
        this.manager = manager;
        this.viewport = new ViewportController(manager);
        this.indicators = new PaneIndicatorController(manager);
        this.overlayIndicators = new OverlayIndicatorController(manager);
        this.drawings = new DrawingsController(manager);
        this.settings = new SettingsController(manager);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  1. LIFECYCLE & EVENTS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * P14 — Lifecycle-Teardown der API-eigenen Instanz-Maps.
     *
     * Räumt NUR State auf, der in den Controllern lebt und NICHT von
     * `ChartManager.destroy()` erfasst wird (server-indicators, MA-Instanzen,
     * compare-overlays). Pane-/Overlay-Nodes, Pointer-Interceptors und
     * Event-Listener gehören dem Manager/InputManager und werden dort beim
     * `manager.destroy()` aufgeräumt. Idempotent — auch vor Symbol-/Container-
     * Wechsel aufrufbar. Der Aufrufer ruft danach `manager.destroy()`.
     */
    public destroy(): void {
    }

    /** Ermöglicht der Web-App, auf Ereignisse zu hören. */
    public subscribe(event: string, callback: (data: any) => void) {
        this.manager.on(event, callback);
    }

    /** Unsubscribe vom Event (Pendant zu subscribe). */
    public unsubscribe(event: string, callback: (data: any) => void) {
        this.manager.off(event, callback);
    }

    public listTemplates(): ZChartSettingsTemplate[] { return this.templates.list(); }
    public saveTemplate(name: string, settings: VisualSettings): void { this.templates.save(name, settings); }
    public loadTemplate(name: string): VisualSettings | null { return this.templates.load(name); }
    public deleteTemplate(name: string): void { this.templates.delete(name); }
    public renameTemplate(oldName: string, newName: string): void { this.templates.rename(oldName, newName); }

    // ════════════════════════════════════════════════════════════════════════
    //  2. VIEWPORT — Koordinaten, Zoom, Scroll, Range  (→ ViewportController)
    //  Wrapper-API für externe Overlay-Komponenten (z.B. Bounding-Box-Overlays).
    // ════════════════════════════════════════════════════════════════════════

    public dateToPixel(timestamp: number): number { return this.viewport.dateToPixel(timestamp); }
    public pixelToDate(x: number): number | null { return this.viewport.pixelToDate(x); }
    public priceToPixel(price: number, paneId?: string): number { return this.viewport.priceToPixel(price, paneId); }
    public pixelToPrice(y: number, paneId?: string): number { return this.viewport.pixelToPrice(y, paneId); }
    public yToPrice(localY: number): number | null { return this.viewport.yToPrice(localY); }
    public getVisibleDateRange(): { from: number | null; to: number | null } { return this.viewport.getVisibleDateRange(); }
    public getMainPriceRange(): { min: number; max: number } | null { return this.viewport.getMainPriceRange(); }
    public onViewChange(callback: (data: { indexRange: { start: number; end: number }; dateRange: { from: number | null; to: number | null }; priceRange: { min: number; max: number }; candleWidth: number; width: number }) => void): () => void { return this.viewport.onViewChange(callback); }
    public loadHistoryRange(olderData: import('../data/DataStore').CandleData[]): number { return this.viewport.loadHistoryRange(olderData); }
    public zoomIn(): void { this.viewport.zoomIn(); }
    public zoomOut(): void { this.viewport.zoomOut(); }
    public scrollToEnd(rightMarginFraction?: number, flushEdge: boolean = false): void { this.viewport.scrollToEnd(rightMarginFraction, flushEdge); }
    /** ZV10-P12: zum Chart-Anfang (ältester geladener Bar) springen. */
    public scrollToStart(leftMarginFraction: number = 0): void { this.viewport.scrollToStart(leftMarginFraction); }
    public scrollToTimestamp(ts: number): void { this.viewport.scrollToTimestamp(ts); }
    public resetYScale(): void { this.viewport.resetYScale(); }
    public snapshot(): string { return this.viewport.snapshot(); }
    public goToDate(timestamp: number): void { this.viewport.goToDate(timestamp); }
    public setVisibleRange(fromTs: number, toTs: number, opts?: { margin?: number }): void { this.viewport.setVisibleRange(fromTs, toTs, opts); }
    public setCrosshairIndex(index: number): void { this.viewport.setCrosshairIndex(index); }

    // ── REPLAY / PLAYBACK (9.4) ──
    /** Set replay limit (null = show all candles) */
    public setReplayLimit(count: number | null) {
        this.manager.dataStore.setReplayLimit(count);
        this.manager.markDirty();
    }

    /** Total candle count (ignoring replay limit) */
    public getTotalCandleCount(): number {
        return this.manager.dataStore.getTotalCount();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  3. TOOLS & INPUT  (→ manager.inputManager / SettingsController defaults)
    // ════════════════════════════════════════════════════════════════════════

    /** Steuert das aktive Werkzeug (z.B. von der Toolbar aufgerufen). */
    public setTool(tool: ToolId): void {
        // P15: ToolId → InputMode ist deterministisch (`pan`→`crosshair_and_pan`,
        // sonst `draw_<tool>`). Mapping + Type leben in InputManager (single source
        // of truth); die frühere ~85-fache if-Kaskade entfällt.
        this.manager.inputManager.mode = toolIdToInputMode(tool);
    }

    /** Set the emoji character used by draw_emoji mode */
    public setEmojiChar(emoji: string): void {
        this.manager.inputManager.activeEmojiChar = emoji;
    }


    /** Set magnet snap mode for drawing tools */
    public setMagnetMode(mode: 'off' | 'close' | 'hl' | 'ohlc'): void { this.settings.setMagnetMode(mode); }

    /** Set cursor mode override (arrow, dot, laser, spray, eraser) */
    public setCursorMode(mode: string): void { this.settings.setCursorMode(mode); }

    /** 5.4 Pinch-to-Zoom: enable/disable touch zoom on canvas */
    public setPinchZoom(enabled: boolean): void {
        this.manager.inputManager.pinchZoomEnabled = enabled;
    }

    /** Set default line style for new drawings */
    public setDefaultLineStyle(color: string, width: number): void { this.settings.setDefaultLineStyle(color, width); }
    /** Set default style for next Brush stroke (does not affect line tools) */
    public setBrushDefaults(color: string, width: number): void { this.settings.setBrushDefaults(color, width); }
    /** Set default style for next Highlighter stroke (does not affect line tools) */
    public setHighlighterDefaults(color: string, width: number): void { this.settings.setHighlighterDefaults(color, width); }

    /**
     * Registriert eine Custom-Script-Indikator-Node im Main-Pane und trägt sie
     * in `layerOrder` ein → der Object Tree kann sie per DnD in der Z-Ebene verschieben.
     * Convention: layerOrder-ID = `custom_script-${scriptId}`. Idempotent.
     */
    public registerCustomScript(scriptId: number, node: import('../nodes/core/SceneNode').SceneNode): void {
        const role = `custom_script-${scriptId}`;
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) { devWarn('ZChartAPI', `registerCustomScript(${scriptId}): kein main-Pane`); return; }
        // Vorherige Node mit gleichem role entfernen (idempotent)
        while (mainPane.removeNodeByRole(role)) { /* remove all stale */ }
        node.role = role;
        mainPane.addNode(node);
        this.manager.addToMainLayerOrder(role);
        this.manager.markDirty();
    }

    /**
     * ZS-P2-FB4: Schattiertes Zeitbereich-Band im Main-Pane (z.B. D1-Bild-
     * Ausschnitt im W1/M1-Neben-Pane des Split-Views). Reines Overlay —
     * KEIN Drawing, wird nie serialisiert/gespeichert. `null` entfernt es.
     * Idempotent (eine Node je Chart, role 'range_highlight').
     */
    public setRangeHighlight(range: { firstTs: number; lastTs: number } | null): void {
        const role = 'range_highlight';
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) return;
        if (!range) {
            while (mainPane.removeNodeByRole(role)) { /* remove all */ }
            this.manager.markDirty();
            return;
        }
        const removed = mainPane.removeNodeByRole(role) as RangeHighlightNode | null;
        const node: RangeHighlightNode = removed ?? new RangeHighlightNode(this.manager.dataStore);
        if (!removed) {
            node.role = role;
            node.zIndex = 5; // unter den Candles (series zIndex 10)
        }
        node.setRange(range);
        mainPane.addNode(node);
        this.manager.markDirty();
    }

    /** Entfernt eine Custom-Script-Node aus dem Main-Pane und aus `layerOrder`.
     *  SU-P5b: räumt auch eine ggf. vorhandene Sub-Pane des Skripts mit ab. */
    public unregisterCustomScript(scriptId: number): void {
        const role = `custom_script-${scriptId}`;
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (mainPane) {
            while (mainPane.removeNodeByRole(role)) { /* remove all */ }
            this.manager.removeFromMainLayerOrder(role);
        }
        this.manager.removePane(`custom_script_pane-${scriptId}`);
        this.manager.markDirty();
    }

    /**
     * SU-P5b: Registriert eine Custom-Script-Node in einer EIGENEN Sub-Pane
     * unter dem Preis-Chart (für `plot(..., { panel: 'separate' })`, z.B.
     * RSI-artige 0–100-Serien). Idempotent — vorhandene Pane wird ersetzt.
     * Die Y-Skalierung übernimmt AutoScaleEngine.scaleGeneric über
     * `getAutoScaleRange()` der Node.
     */
    public registerCustomScriptSubPane(scriptId: number, node: import('../nodes/core/SceneNode').SceneNode): void {
        const paneId = `custom_script_pane-${scriptId}`;
        this.manager.removePane(paneId);
        const pane = new Pane(paneId, 0.2);
        node.role = `custom_script-${scriptId}`;
        pane.addNode(node);
        this.manager.addPane(pane);
        this.manager.markDirty();
    }

    /** SU-P5b: Entfernt die Sub-Pane eines Custom-Scripts (falls vorhanden). */
    public unregisterCustomScriptSubPane(scriptId: number): void {
        if (this.manager.removePane(`custom_script_pane-${scriptId}`)) {
            this.manager.markDirty();
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  4. DRAWINGS — Layer, Compare, Serialize, Undo  (→ DrawingsController)
    // ════════════════════════════════════════════════════════════════════════

    /** @deprecated Use getMainLayerOrder/setMainLayerOrder instead. Kept for sub-pane compat. */
    public setChartLayerIndex(index: number): void {
        this.manager.drawingManager.chartLayerIndex = index;
    }

    /** @deprecated Use getMainLayerOrder/setMainLayerOrder instead. */
    public getChartLayerIndex(): number {
        return this.manager.drawingManager.chartLayerIndex;
    }

    // ── Unified Layer Order (main pane) ──
    public getMainLayerOrder(): string[] { return this.drawings.getMainLayerOrder(); }
    public setMainLayerOrder(order: string[]): void { this.drawings.setMainLayerOrder(order); }
    public deleteDrawing(id: string): void { this.drawings.deleteDrawing(id); }
    public setVisible(id: string, visible: boolean): void { this.drawings.setVisible(id, visible); }

    /** Layer ein-/ausblenden: Zeichnungs-ID ODER Node-Role ('series', 'indicator-<id>', ...). */
    public setLayerVisible(idOrRole: string, visible: boolean): boolean {
        for (const pane of this.manager.getPanes()) {
            for (const n of pane.nodes) {
                if ((n as any).role === idOrRole) { n.isVisible = visible; this.manager.markDirty(); return true; }
            }
        }
        const shape = this.manager.drawingManager.shapes.find(sh => sh.id === idOrRole);
        if (shape) { this.drawings.setVisible(idOrRole, visible); return true; }
        return false;
    }

    /** Live-Tick (WS-Feed): letzte Kerze aktualisieren oder neue anhaengen. */
    public upsertCandle(candle: import('../data/DataStore').CandleData): 'appended' | 'updated' | 'ignored' {
        return this.manager.upsertCandle(candle);
    }
    public moveLayer(id: string, toIndex: number): void { this.drawings.moveLayer(id, toIndex); }
    public moveToFront(id: string): void { this.drawings.moveToFront(id); }
    public moveToBack(id: string): void { this.drawings.moveToBack(id); }
    public moveForward(id: string): void { this.drawings.moveForward(id); }
    public moveBackward(id: string): void { this.drawings.moveBackward(id); }
    public importDrawings(serverDrawings: DrawingExportData[]): void { this.drawings.importDrawings(serverDrawings); }
    public exportDrawings(): DrawingExportData[] { return this.drawings.exportDrawings(); }

    /**
     * Re-map all drawing anchor points from old data indices to new data indices.
     * Call this BEFORE setData() — captures timestamps from old data, then call
     * applyDrawingRemap() AFTER setData() with the new data.
     */
    public captureDrawingTimestamps() { return this.drawings.captureDrawingTimestamps(); }
    public applyDrawingRemap(timestampMap: Parameters<DrawingsController['applyDrawingRemap']>[0]): void { this.drawings.applyDrawingRemap(timestampMap); }

    /** Get current drawing shapes for object tree */
    public getShapes() { return this.drawings.getShapes(); }
    public clearAllDrawings(includeLocked: boolean = true): void { this.drawings.clearAllDrawings(includeLocked); }
    public removeShapesByPane(paneId: string): void { this.drawings.removeShapesByPane(paneId); }
    public setAllVisible(visible: boolean): void { this.drawings.setAllVisible(visible); }
    public setKeepDrawing(keep: boolean): void { this.drawings.setKeepDrawing(keep); }
    public setLockAll(locked: boolean): void { this.drawings.setLockAll(locked); }
    public duplicateDrawing(id: string): void { this.drawings.duplicateDrawing(id); }
    public eraseShapeAt(x: number, y: number): boolean { return this.drawings.eraseShapeAt(x, y); }
    public undo(): boolean { return this.drawings.undo(); }
    public redo(): boolean { return this.drawings.redo(); }
    public getDrawingProperties(id: string): any | null { return this.drawings.getDrawingProperties(id); }
    public getShapeById(id: string): any | null { return this.drawings.getShapeById(id); }
    public setDrawingProperties(id: string, props: Record<string, any>): void { this.drawings.setDrawingProperties(id, props); }

    // ── COMPARE OVERLAY (9.6) ──

    // ── MULTI-Y-ACHSE (ZV10-P7d) ──
    /** Zusatz-Preisskala einer Pane anlegen/holen (idempotent). Optionen: hidden = keine Achsen-Spalte, fixedRange/ticks wie P2. */
    public addPriceScale(paneId: string, scaleId: string, opts?: { hidden?: boolean; fixedRange?: { min: number; max: number }; ticks?: number[] }): void {
        const pane = this.manager.getPanes().find(p => p.id === paneId);
        if (!pane) { devWarn('ZChartAPI', `addPriceScale: Pane "${paneId}" nicht gefunden`); return; }
        const scale = pane.ensurePriceScale(scaleId);
        if (opts?.hidden !== undefined) scale.hideAxis = opts.hidden;
        if (opts?.fixedRange) scale.fixedRange = { ...opts.fixedRange };
        if (opts?.ticks) { const ticks = [...opts.ticks]; scale.tickProvider = () => ticks; }
        this.manager.markDirty();
    }

    /** Zusatz-Preisskala entfernen (Default 'right' nicht entfernbar; gebundene Nodes fallen auf Default zurück). */
    public removePriceScale(paneId: string, scaleId: string): void {
        const pane = this.manager.getPanes().find(p => p.id === paneId);
        if (pane?.removePriceScale(scaleId)) this.manager.markDirty();
    }

    /** Node (per role) an eine Scale der Pane binden; scaleId undefined = Default-Scale. */
    public setNodeYAxis(paneId: string, nodeRole: string, scaleId?: string): void {
        const pane = this.manager.getPanes().find(p => p.id === paneId);
        if (!pane) { devWarn('ZChartAPI', `setNodeYAxis: Pane "${paneId}" nicht gefunden`); return; }
        const node = pane.nodes.find(n => n.role === nodeRole);
        if (!node) { devWarn('ZChartAPI', `setNodeYAxis: Node-Role "${nodeRole}" in Pane "${paneId}" nicht gefunden`); return; }
        node.yAxisId = scaleId;
        this.manager.markDirty();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  5. SETTINGS — Theme, Skalen, ChartStyle, Margins  (→ SettingsController)
    // ════════════════════════════════════════════════════════════════════════

    public setTheme(theme: 'light' | 'dark'): void { this.settings.setTheme(theme); }

    /**
     * Set background watermark (e.g. "MRK · XETRA"). Pass "" to hide.
     * Optional second line (e.g. interval "1d").
     */
    public setWatermark(
        text: string,
        subText: string = '',
        opts?: {
            size?: number;
            opacity?: number; // 0-1
            position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            color?: string;
        },
    ): void { this.settings.setWatermark(text, subText, opts); }

    /**
     * P6.1 — Update StatusLine symbol name / description.
     * Called by ZChartTab whenever the active symbol changes.
     */
    public setStatusLineSymbol(name: string, description?: string): void {
        if (!this.manager.statusLineNode) return;
        this.manager.statusLineNode.symbolName        = name;
        this.manager.statusLineNode.symbolDescription = description ?? name;
    }

    /** P6.1 — Apply partial StatusLineSettings to the StatusLineNode. */
    public applyStatusLineSettings(partial: Partial<import('../core/VisualSettings').StatusLineSettings>): void {
        if (!this.manager.statusLineNode) return;
        Object.assign(this.manager.statusLineNode.settings, partial);
        this.manager.render();
    }

    /** P7.3 — Apply PriceLabelSettings flags to the engine. */
    public applyPriceLabelsSettings(pl: import('../core/VisualSettings').PriceLabelSettings): void { this.settings.applyPriceLabelsSettings(pl); }

    /** P7.4 — Apply TimeScaleSettings (dateFormat, timeFormat, dayOfWeekOnLabels, saveLeftEdge). */
    public applyTimeScaleSettings(ts: import('../core/VisualSettings').TimeScaleSettings): void { this.settings.applyTimeScaleSettings(ts); }

    /** Toggle grid visibility (7.2) */
    public setGridVisible(visible: boolean): void { this.settings.setGridVisible(visible); }

    /** P8.1-P8.3: Apply canvas visual settings (background, grid, crosshair, scales). */
    public applyCanvasSettings(canvas: import('../core/VisualSettings').CanvasSettings): void { this.settings.applyCanvasSettings(canvas); }

    /** P5: Apply symbol visual settings (candle/wick/border/volume colors + hollow mode). */
    public applySymbolSettings(symbol: import('../core/VisualSettings').SymbolSettings): void {
        this.settings.applySymbolSettings(symbol);
        // ZV10-f: Volumen-Band im Hauptchart folgt symbol.volume.overlayInMain
    }

    /** Set the IANA timezone for x-axis and crosshair labels */
    public setTimezone(tz: string): void { this.settings.setTimezone(tz); }

    /** Set crosshair style: 'cross', 'line', or 'hidden' (7.3) */
    public setCrosshairStyle(style: CrosshairStyle): void { this.settings.setCrosshairStyle(style); }

    /** Set candle colors for bullish/bearish (7.4) */
    public setCandleColors(upColor: string, downColor: string): void { this.settings.setCandleColors(upColor, downColor); }

    /** P8.5: Set layout margins (top/bottom as 0–100 integer %, rightBars as bar count). */
    public setMargins(top: number, bottom: number, rightBars: number): void { this.settings.setMargins(top, bottom, rightBars); }

    /** Toggle logarithmic price scale (2.4) */
    public setLogScale(enabled: boolean): void { this.settings.setLogScale(enabled); }
    /** Get current log scale state */
    public isLogScale(): boolean { return this.settings.isLogScale(); }

    /** Set crosshair snap to OHLC mode (2.10) */
    public setCrosshairSnap(enabled: boolean): void { this.settings.setCrosshairSnap(enabled); }

    /** 1.5 Heikin-Ashi — toggle on main pane series node */
    public setHeikinAshi(enabled: boolean): void { this.settings.setHeikinAshi(enabled); }
    /** 1.5 Switch style including heikin_ashi */
    public setChartStyle(style: ChartStyle): void { this.settings.setChartStyle(style); }
    /** 2.5 Percentage mode on main pane */
    public setPercentMode(enabled: boolean): void { this.settings.setPercentMode(enabled); }
    /** 2.6 Y-Axis position: left / right / both */
    public setAxisPosition(pos: YAxisPosition): void { this.settings.setAxisPosition(pos); }
    /** P7.2: Lock/unlock price-to-bar ratio on the main pane */
    public setLockPriceBarRatio(enabled: boolean): void { this.settings.setLockPriceBarRatio(enabled); }
    /** P7.2: Apply all PriceScaleSettings from the Scales-Tab in one shot. */
    public applyScalesSettings(ps: import('../core/VisualSettings').PriceScaleSettings): void { this.settings.applyScalesSettings(ps); }

    // ════════════════════════════════════════════════════════════════════════
    //  6. PANE-INDICATORS  (→ PaneIndicatorController / paneRegistry)
    //  NUR die generische API. Die ~144 benannten add*Pane/remove*Pane-Delegates
    //  wurden 2026-06-10 entfernt (kein Aufrufer mehr seit P17 — ZChartTab nutzt
    //  addIndicatorPane(id, params, style); IDs siehe indicators/panes/*).
    // ════════════════════════════════════════════════════════════════════════

    public addIndicatorPane(id: string, params: PaneParams = {}, style: IndicatorLineStyleOptions = {}): void {
        this.indicators.add(id, params, style);
    }
    public removeIndicatorPane(id: string): void {
        this.indicators.remove(id);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  7. OVERLAY-INDICATORS  (→ OverlayIndicatorController)
    // ════════════════════════════════════════════════════════════════════════

    /** Add an overlay indicator to the main pane. */
    public addOverlayIndicator(
        id: string,
        dataKey: string,
        color: string,
        lineWidth: number = 1.5,
        params?: Record<string, number | string>,
        lineDash: number[] = [],
        /** UXB-P7: Stil je Einzel-Linie bei Mehr-Linien-Overlays (z.B. high/low). */
        lines?: OverlayLineStyles,
    ): void {
        this.overlayIndicators.add(id, dataKey, color, lineWidth, params, lineDash, lines);
    }

    /** Remove an overlay indicator from the main pane */
    public removeOverlayIndicator(id: string): void {
        this.overlayIndicators.remove(id);
    }

}
