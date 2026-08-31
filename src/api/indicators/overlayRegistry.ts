// src/zchart/api/indicators/overlayRegistry.ts
// Version: 1.4.0 | Updated: 2026-08-08 | By: Agent
// 1.4.0 (UXB-P7): OverlayBuildContext.lines — per-Linie-Stil (color/lineWidth/
//   lineStyle) fuer Mehr-Linien-Overlays (Outside/Inside Span high/low). Wird
//   von add() durchgereicht und in attached gemerkt, damit recalculateAll den
//   gleichen Kontext sieht. Undefined = unveraendertes Alt-Verhalten.
// 1.3.0 (IAS-P5): Param seriesOnly (Outside/Inside Span "Nur Serien zeichnen").
// 1.2.0: Attach-Tracking + recalculateAll() auf 'dataReplaced' — Pattern-Overlays
//        (CandlePatternMarkerNode ≠ BaseIndicatorNode) rechnen nach setData neu,
//        statt bis zum nächsten add() leer zu bleiben (Screener-Second-Click-Bug).
// 1.1.0: P14 — echtes Silent-Failure (kein main-Pane bei add()) → devWarn().
// P8 (ZChartAPI-Refactor): Overlay-Indicator-Registry — ersetzt den 650-Zeilen-Switch
// in addOverlayIndicator + die per-id-Cleanup-Kaskade in removeOverlayIndicator.
//
// Ein Overlay ist eine Config (OverlayIndicatorDef); der Lebenszyklus lebt einmal im
// OverlayIndicatorController:
//   add:    mainPane-Guard → Duplikat-Check (role) → parseOverlayParams → calculate?
//           → buildNodes (Default: eine LineSeriesNode auf dataKey, zIndex 8)
//           → role `indicator-${id}` setzen → addNode(s) → addToMainLayerOrder
//   remove: alle Nodes mit role entfernen → removeFromMainLayerOrder → cleanupSeriesKeys
//
// WICHTIG (Verhaltens-Kontrakt, identisch zum alten Switch):
// - Duplikat-Check VOR calculate (kein Doppel-Rechnen bei zweitem add).
// - Unbekannte id ohne Def = Default-LineSeriesNode auf dataKey (KEIN Fehler) —
//   so verhielt sich der alte Fallback am Switch-Ende.
// - zIndex setzt die Def (withZ); role setzt der Controller einheitlich.
//
// Migration: Während P8 (Pilot) gated die Fassade per hasOverlayIndicator(id) —
// nur registrierte ids laufen über den Controller, der Rest über den alten Switch.
// Ab P9 fällt der alte Switch komplett weg.
import { LineSeriesNode } from '../../nodes/series/LineSeriesNode';
import type { ChartManager } from '../../core/ChartManager';
import type { DataStore } from '../../data/DataStore';
import type { SceneNode } from '../../nodes/core/SceneNode';
import { devWarn } from '../types';

export type OverlayRawParams = Record<string, number | string> | undefined;

/** UXB-P7: Stil einer benannten Einzel-Linie eines Mehr-Linien-Overlays. */
export interface OverlayLineStyle {
    color?: string;
    lineWidth?: number;
    /** 'solid' | 'dashed' | 'dotted' */
    lineStyle?: string;
}

/** UXB-P7: Linien-Id → Stil (z.B. { high: {...}, low: {...} }). */
export type OverlayLineStyles = Record<string, OverlayLineStyle>;

/** UXB-P7: 'solid'|'dashed'|'dotted' → canvas setLineDash-Array. */
export function overlayLineStyleToDash(lineStyle: string | undefined, fallback: number[]): number[] {
    if (lineStyle === 'solid') return [];
    if (lineStyle === 'dashed') return [6, 4];
    if (lineStyle === 'dotted') return [2, 3];
    return fallback;
}

/**
 * Gemeinsamer Param-Parser — 1:1 aus dem alten addOverlayIndicator übernommen,
 * inkl. id-abhängiger Defaults (keltner multiplier 2, hammer maxBodyRatio 0.3).
 * Quelle der Wahrheit für alle Overlay-Defaults.
 */
export function parseOverlayParams(id: string, params: OverlayRawParams) {
    return {
        period: Number(params?.period ?? 20),
        source: String(params?.source ?? 'close') as 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4',
        shift: Number(params?.shift ?? 0),
        stdDev: Number(params?.stdDev ?? 2),
        multiplier: Number(params?.multiplier ?? (id === 'keltner_channels' ? 2 : 1.5)),
        percentage: Number(params?.percentage ?? 2.5),
        step: Number(params?.step ?? 0.02),
        maxStep: Number(params?.maxStep ?? params?.max_step ?? 0.2),
        deviations: Number(params?.deviations ?? 2),
        noisePct: Number(params?.noise_pct ?? 0),
        // IAS-P5: Outside/Inside Span — "yes" = Linien nur ueber aktiven Serien
        seriesOnly: String(params?.seriesOnly ?? params?.series_only ?? 'yes'),
        // IAS-P6: Serien-Start auch per Close (Kalibrier-Option; 'no' = alte
        // geometrische Start-Regel, gilt fuer gespeicherte Alt-Charts)
        startByClose: String(params?.startByClose ?? params?.start_by_close ?? 'no'),
        fastPeriod: Number(params?.fastPeriod ?? 2),
        slowPeriod: Number(params?.slowPeriod ?? 30),
        atrPeriod: Number(params?.atrPeriod ?? params?.atr_period ?? 14),
        stopPeriod: Number(params?.stopPeriod ?? 9),
        maType: String(params?.maType ?? 'sma') as 'sma' | 'ema',
        kAtr: Number(params?.kAtr ?? params?.k_atr ?? 1.5),
        minRetracement: Number(params?.minRetracement ?? params?.min_retracement ?? 0.382),
        maxRetracement: Number(params?.maxRetracement ?? params?.max_retracement ?? 0.786),
        side: String(params?.side ?? 'long') as 'long' | 'short',
        showBreakout: String(params?.show_breakout ?? 'yes'),
        showZigZag: String(params?.show_zigzag ?? 'yes'),
        // reversal_bar v2 (User-kalibriert): min_body_pct-Default 0 statt 0.4 —
        // der 0.4-Fallback würde sonst den alten Zu-streng-Filter reaktivieren
        // und z.B. den Kalibrier-Stab 17.10. (Body 31 %) verwerfen.
        minBodyPct: Number(params?.minBodyPct ?? params?.min_body_pct ?? (id === 'reversal_bar' ? 0 : 0.4)),
        maxBodyRatio: Number(params?.maxBodyRatio ?? params?.max_body_ratio ?? (id === 'hammer' ? 0.3 : 0.1)),
        // reversal_bar v2 — kalibrierte Markttechnik-Parameter (konzept.md)
        maxWickPct: Number(params?.maxWickPct ?? params?.max_wick_pct ?? 0.10),
        maxBodyWickRatio: Number(params?.maxBodyWickRatio ?? params?.max_body_wick_ratio ?? 1.0),
        minWickPct: Number(params?.minWickPct ?? params?.min_wick_pct ?? 0),
        requireOppositePrev: String(params?.requireOppositePrev ?? params?.require_opposite_prev ?? 'yes'),
        maxGapPct: Number(params?.maxGapPct ?? params?.max_gap_pct ?? 0),
        // inside_bar/outside_bar v2 (IAS-P1) — Serien-Engine-Optionen
        showNested: String(params?.showNested ?? params?.show_nested ?? 'no'),
        colorByDirection: String(params?.colorByDirection ?? params?.color_by_direction ?? 'no'),
        minBodyRatio: Number(params?.minBodyRatio ?? params?.min_body_ratio ?? 0.5),
        minShadowRatio: Number(params?.minShadowRatio ?? params?.min_shadow_ratio ?? 2),
        korrekturPct: Number(params?.korrekturPct ?? params?.korrektur_pct ?? 30),
        maCrossFastPeriod: Number(params?.fastPeriod ?? params?.fast_period ?? 20),
        maCrossSlowPeriod: Number(params?.slowPeriod ?? params?.slow_period ?? 50),
        maTypeParam: (String(params?.maType ?? params?.ma_type ?? 'sma').toLowerCase() === 'ema' ? 'ema' : 'sma') as 'ema' | 'sma',
        ribbonPeriods: [1, 2, 3, 4, 5, 6].map((slot) => Number(params?.[`period${slot}`] ?? 10 + (slot * 10))),
        ribbonMethod: String(params?.method ?? params?.maType ?? 'sma') as 'sma' | 'ema' | 'smma' | 'lwma' | 'hma',
        pivotLeftBars: Number(params?.leftBars ?? params?.left_bars ?? 5),
        pivotRightBars: Number(params?.rightBars ?? params?.right_bars ?? 5),
        divergenceRsiPeriod: Number(params?.rsiPeriod ?? params?.rsi_period ?? 14),
        autoLookback: Number(params?.lookback ?? 300),
        autoMinBars: Number(params?.minBars ?? params?.min_bars ?? 8),
        pitchforkVariant: String(params?.variant ?? 'original') as 'original' | 'schiff' | 'modified_schiff' | 'inside',
        anchorMode: String(params?.anchorMode ?? params?.anchor_mode ?? 'latest_pivot') as 'latest_pivot' | 'swing_high' | 'swing_low' | 'highest_volume',
    };
}

export type OverlayParsedParams = ReturnType<typeof parseOverlayParams>;

/** Kontext, den calculate/buildNodes einer Def erhalten. */
export interface OverlayBuildContext {
    ds: DataStore;
    manager: ChartManager;
    id: string;
    dataKey: string;
    color: string;
    lineWidth: number;
    lineDash: number[];
    /** Rohe params (für Sonderfälle wie jawPeriod, offset, sigma). */
    params: OverlayRawParams;
    /** Geparste params mit allen Defaults. */
    p: OverlayParsedParams;
    /**
     * UXB-P7: Per-Linie-Stil bei Mehr-Linien-Overlays. Nodes lesen daraus mit
     * ihren bisherigen Hardcodes als Fallback — undefined = altes Aussehen.
     */
    lines?: OverlayLineStyles;
}

export interface OverlayIndicatorDef {
    /** Optionale DataStore-Vorberechnung. */
    calculate?: (ctx: OverlayBuildContext) => void;
    /**
     * Nodes für das Main-Pane (zIndex via withZ setzen, role setzt der Controller).
     * Fehlt buildNodes → Default: eine LineSeriesNode(ds, dataKey, color, lineWidth, lineDash), zIndex 8.
     */
    buildNodes?: (ctx: OverlayBuildContext) => SceneNode[];
    /** Series-Keys, die remove aus dem DataStore räumt (Array oder dynamisch). */
    cleanupSeriesKeys?: string[] | ((ds: DataStore) => string[]);
}

const registry = new Map<string, OverlayIndicatorDef>();

export function registerOverlayIndicator(id: string, def: OverlayIndicatorDef): void {
    if (registry.has(id)) {
        devWarn('OverlayRegistry', `duplicate registration for '${id}' — overwriting`);
    }
    registry.set(id, def);
}

export function getOverlayIndicator(id: string): OverlayIndicatorDef | undefined {
    return registry.get(id);
}

export function hasOverlayIndicator(id: string): boolean {
    return registry.has(id);
}

export function listOverlayIndicatorIds(): string[] {
    return [...registry.keys()];
}

// ---------------------------------------------------------------------------
// Controller — eine Instanz pro Chart (kein modul-globaler State, splitscreen-sicher)
// ---------------------------------------------------------------------------

/** Attach-Argumente eines Overlays — für Re-Calc nach Daten-Replace. */
interface AttachedOverlay {
    dataKey: string;
    color: string;
    lineWidth: number;
    params?: Record<string, number | string>;
    lineDash: number[];
    lines?: OverlayLineStyles;
}

export class OverlayIndicatorController {
    /** Aktive Overlays (id → Attach-Argumente). */
    private attached = new Map<string, AttachedOverlay>();

    constructor(private manager: ChartManager) {
        // ChartManager.setData ersetzt die Candle-Objekte — damit sind alle vom
        // calculate() geschriebenen Series-Keys (z.B. reversal_bar_signal) weg.
        // BaseIndicatorNodes rechnen sich in setData selbst neu; Overlay-Defs
        // (Pattern-Marker etc.) brauchen diesen Hook, sonst bleiben sie nach
        // einem Symbol-/Timeframe-Wechsel leer bis zum nächsten add().
        manager.on('dataReplaced', () => this.recalculateAll());
    }

    /** DataStore-Vorberechnung aller aktiven Overlays gegen den frischen Datensatz. */
    public recalculateAll(): void {
        const ds = this.manager.dataStore;
        for (const [id, a] of this.attached) {
            const def = registry.get(id);
            if (!def?.calculate) continue;
            const ctx: OverlayBuildContext = {
                ds,
                manager: this.manager,
                id,
                dataKey: a.dataKey,
                color: a.color,
                lineWidth: a.lineWidth,
                lineDash: a.lineDash,
                params: a.params,
                p: parseOverlayParams(id, a.params),
                lines: a.lines,
            };
            try { def.calculate(ctx); } catch { /* ignore calc errors */ }
        }
    }

    public add(
        id: string,
        dataKey: string,
        color: string,
        lineWidth: number = 1.5,
        params?: Record<string, number | string>,
        lineDash: number[] = [],
        lines?: OverlayLineStyles,
    ): void {
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) { devWarn('OverlayRegistry', `add(${id}): kein main-Pane`); return; }
        if (mainPane.nodes.some(n => n.role === `indicator-${id}`)) return;

        const ds = this.manager.dataStore;
        const ctx: OverlayBuildContext = {
            ds,
            manager: this.manager,
            id,
            dataKey,
            color,
            lineWidth,
            lineDash,
            params,
            p: parseOverlayParams(id, params),
            lines,
        };
        const def = registry.get(id);
        def?.calculate?.(ctx);

        let nodes: SceneNode[];
        if (def?.buildNodes) {
            nodes = def.buildNodes(ctx);
        } else {
            // Alter Switch-Fallback: einfache Linien-Overlays (sma20, twap, wma, …)
            const node = new LineSeriesNode(ds, dataKey, color, lineWidth, lineDash);
            node.zIndex = 8;
            nodes = [node];
        }
        for (const node of nodes) {
            node.role = `indicator-${id}`;
            mainPane.addNode(node);
        }
        this.manager.addToMainLayerOrder(`indicator-${id}`);
        this.attached.set(id, { dataKey, color, lineWidth, params, lineDash, lines });
    }

    public remove(id: string): void {
        this.attached.delete(id);
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) return;
        while (mainPane.removeNodeByRole(`indicator-${id}`)) {
            // Composite-Overlays (Ribbons/Pivots) haben mehrere Nodes mit gleicher role.
        }
        this.manager.removeFromMainLayerOrder(`indicator-${id}`);

        const cleanup = registry.get(id)?.cleanupSeriesKeys;
        if (!cleanup) return;
        const keys = typeof cleanup === 'function' ? cleanup(this.manager.dataStore) : cleanup;
        for (const key of keys) {
            this.manager.dataStore.removeSeriesKey(key);
        }
    }
}
