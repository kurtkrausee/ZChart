// src/zchart/api/serialization/DrawingSerializer.ts
// Version: 1.1.0 | Updated: 2026-08-13 | By: Agent
// 1.1.0 (ZV10-P7d): yAxisId im Base-Export (nur wenn gesetzt) + zentraler Import
// P10a (ZChartAPI-Refactor): Drawing-Serializer-Registry — ersetzt schrittweise die
// zwei getrennten if-Wälder in importDrawings (~550 Z.) und exportDrawings (~400 Z.).
//
// Architektur:
// - Pro Tool EIN Registry-Eintrag mit import- und export-Branch NEBENEINANDER
//   (families/*.ts) → Symmetrie ist im Code sichtbar, nicht nur Disziplin
//   (Präzedenz: Emoji-Persistenz-Bug, weil der zweite Branch vergessen wurde).
// - Der generische Teil (anchors aus point1/point2, style.color/lineWidth,
//   visible/zIndex) lebt einmal in buildBaseExport().
// - Round-Trip-Tests (__tests__) sichern import(export(node)) pro Tool ab.
//
// Migration: Während P10a gated die Fassade per hasDrawingSerializer(type) —
// registrierte Tools laufen über die Registry, der Rest über die alten Ketten.
// P10b migriert fib/gann/patterns/special und löscht die Alt-Ketten.
//
// ── DOKUMENTIERTE AUSNAHMEN (gewollte Asymmetrien, NICHT "fixen") ────────────
// 1. `alert_line`: Import verwirft IMMER (Eintrag unten, import → null) und der
//    Export filtert den Typ aus (Filter in exportDrawings). Alarme sind eine
//    Projektion der DB (`user_chart_alerts` → setAlertLines) — persistierte
//    alert_line-Einträge wären ID-lose Geisterlinien neben den DB-gebundenen.
// 2. `measure` und `trade_signal`: nur Export-Filter (temporäre bzw. Live-Nodes,
//    entstehen nie aus chart-state) — siehe EXPORT_EXCLUDED_TYPES.
// 3. `brush`/`highlighter` haben keinen import-Branch (Freehand, sehr viele
//    Punkte — Persistenz läuft nicht über chart-state). `path`/`polyline` sind
//    seit families/annotations.ts (2026-06-10) persistent (Multi-Point + Marker).
import type { ChartManager } from '../../core/ChartManager';
import type { DataStore } from '../../data/DataStore';
import type { DrawableShape } from '../../types/DrawableShape';
import type { DrawingExportData } from '../types';

/** Typen, die exportDrawings IMMER ausfiltert (siehe Ausnahmen-Doku oben). */
export const EXPORT_EXCLUDED_TYPES: ReadonlySet<string> = new Set(['measure', 'trade_signal', 'alert_line']);

/** Kontext für import/export — bindet TimeScale + Daten-Array einmal pro Aufruf. */
export interface SerializerContext {
    dataStore: DataStore;
    /** Unix-ms → Chart-Index (für Import) */
    timeToIndex: (timestamp: number) => number;
    /** Chart-Index → Unix-ms (für Export; kann null/0 liefern — Aufrufer nutzt `|| Date.now()`) */
    indexToTime: (index: number) => number | null;
}

export interface DrawingSerializerEntry {
    /**
     * Baut die Node aus dem Server-JSON. `null` = Eintrag bewusst verwerfen
     * (z.B. alert_line). Sichtbarkeit (`ext.visible`) setzt der Aufrufer.
     */
    import: (ext: DrawingExportData, ctx: SerializerContext) => DrawableShape | null;
    /**
     * Ergänzt das generische base (aus buildBaseExport) um tool-spezifische
     * Felder; darf base.anchors ersetzen (Multi-Point-Tools). Fehlt export,
     * reicht das generische base (reine 1-/2-Punkt-Linien).
     */
    export?: (shape: DrawableShape, base: DrawingExportData, ctx: SerializerContext) => void;
}

const registry = new Map<string, DrawingSerializerEntry>();

/** Registriert einen Eintrag unter einem oder mehreren type-Keys (Legacy-Aliase wie 'segment'). */
export function registerDrawingSerializer(types: string | string[], entry: DrawingSerializerEntry): void {
    for (const t of Array.isArray(types) ? types : [types]) {
        registry.set(t, entry);
    }
}

export function getDrawingSerializer(type: string): DrawingSerializerEntry | undefined {
    return registry.get(type);
}

export function hasDrawingSerializer(type: string): boolean {
    return registry.has(type);
}

export function listDrawingSerializerTypes(): string[] {
    return [...registry.keys()];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createSerializerContext(manager: ChartManager): SerializerContext {
    const dataArray = manager.dataStore.getAllData();
    return {
        dataStore: manager.dataStore,
        timeToIndex: (timestamp) => manager.timeScale.timeToIndex(timestamp, dataArray),
        indexToTime: (index) => manager.timeScale.indexToTime(index, dataArray),
    };
}

/**
 * Generischer Export-Teil — 1:1 aus dem alten exportDrawings übernommen:
 * anchors[0..1] aus point1/point2 (point2 fehlt → t2=t1, price 0),
 * style.color aus lineColor ?? textColor ?? '#2962ff', zIndex = Array-Position.
 */
export function buildBaseExport(shape: DrawableShape, ctx: SerializerContext, arrayIndex: number): DrawingExportData {
    const t1 = shape.point1 ? (ctx.indexToTime(shape.point1.index) || Date.now()) : Date.now();
    const t2 = shape.point2 ? (ctx.indexToTime(shape.point2.index) || Date.now()) : t1;
    const s = shape as DrawableShape & { lineColor?: string; lineWidth?: number };
    return {
        id: shape.id,
        type: shape.shapeType,
        anchors: [
            { timestamp: t1, price: shape.point1?.price ?? 0 },
            { timestamp: t2, price: shape.point2?.price ?? 0 },
        ],
        style: {
            color: s.lineColor ?? s.textColor ?? '#2962ff',
            lineWidth: s.lineWidth ?? 2,
        },
        locked: false,
        visible: shape.isVisible,
        zIndex: arrayIndex,
        // ZV10-P7d: Scale-Binding nur schreiben, wenn gesetzt (Bestand bleibt schlank)
        ...(shape.yAxisId ? { yAxisId: shape.yAxisId } : {}),
    };
}

/** Export über die Registry: generisches base + tool-spezifische Extras. */
export function exportShape(shape: DrawableShape, ctx: SerializerContext, arrayIndex: number): DrawingExportData {
    const base = buildBaseExport(shape, ctx, arrayIndex);
    registry.get(shape.shapeType)?.export?.(shape, base, ctx);
    return base;
}

/** Import über die Registry; `null` = bewusst verworfen. */
export function importShape(ext: DrawingExportData, ctx: SerializerContext): DrawableShape | null {
    const entry = registry.get(ext.type);
    if (!entry) return null;
    const node = entry.import(ext, ctx);
    // ZV10-P7d: Scale-Binding zentral übernehmen (fehlend = Default-Scale 'right')
    if (node && typeof ext.yAxisId === 'string' && ext.yAxisId) node.yAxisId = ext.yAxisId;
    return node;
}

// ---------------------------------------------------------------------------
// Ausnahme-Eintrag: alert_line (siehe Doku-Block oben)
// ---------------------------------------------------------------------------

registerDrawingSerializer('alert_line', {
    // Import verwirft: DB (user_chart_alerts) ist die Wahrheit, Linien kommen via setAlertLines.
    import: () => null,
    // Kein export-Branch nötig — der Typ steht in EXPORT_EXCLUDED_TYPES.
});
