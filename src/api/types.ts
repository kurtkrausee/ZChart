// src/zchart/api/types.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P0: Shared types + devWarn helper extracted from ZChartAPI.ts (formerly inline).
import type { VisualSettings } from '../core/VisualSettings';

// ---------------------------------------------------------------------------
// Chart presentation types
// ---------------------------------------------------------------------------

export type ChartStyle =
    | 'candle_solid'
    | 'ohlc'
    | 'line'
    | 'area'
    | 'heikin_ashi'
    | 'hollow'
    | 'baseline';

export interface ZChartSettingsTemplate {
    name: string;
    settings: VisualSettings;
}

// ---------------------------------------------------------------------------
// Indicator style options — used by all add*Pane / addOverlay* methods
// ---------------------------------------------------------------------------

export type IndicatorLineStyleOptions = {
    color?: string;
    lineWidth?: number;
    lineDash?: number[];
};

// ---------------------------------------------------------------------------
// Drawing serialization — replaces `any[]` in importDrawings / exportDrawings.
// P10a: an das REALE Server-JSON angeglichen (anchors/style, nicht timestamps/prices).
// ---------------------------------------------------------------------------

/** Ein Ankerpunkt im Server-JSON (Zeit als Unix-ms, nicht als Chart-Index). */
export interface DrawingAnchor {
    timestamp: number;
    price: number;
}

/** Generischer Style-Block — Felder je nach Tool optional belegt. */
export interface DrawingExportStyle {
    color?: string;
    lineWidth?: number;
    fillColor?: string;
    fontSize?: number;
}

/**
 * Eine Zeichnung im Server-/DB-Format (chart-state JSON).
 * Tool-spezifische Extras (fibStyle, gannStyle, channelWidth, emoji, …)
 * laufen über die Index-Signatur — sie werden in den jeweiligen
 * serialization/families/*-Modulen gelesen/geschrieben.
 */
export interface DrawingExportData {
    id: string;
    /** Tool-Discriminator (DrawableShapeType bzw. Legacy-Alias wie 'segment'/'fibRetracement') */
    type: string;
    anchors: DrawingAnchor[];
    style?: DrawingExportStyle;
    locked?: boolean;
    visible?: boolean;
    zIndex?: number;
    /** ZV10-P7d: Scale-Binding (Multi-Y). Fehlend = Default-Scale 'right'. */
    yAxisId?: string;
    [extra: string]: unknown;
}

// ---------------------------------------------------------------------------
// Dev-time warning helper
// ---------------------------------------------------------------------------

/**
 * Emits a console.warn in development builds only.
 * Use instead of silent `return` when a precondition fails.
 *
 * @param scope  Short label, e.g. 'ZChartAPI' or 'PaneRegistry'
 * @param msg    Human-readable description of what went wrong
 */
export function devWarn(scope: string, msg: string): void {
    if ((globalThis as any).process?.env?.NODE_ENV !== 'production') {
        console.warn(`[${scope}] ${msg}`);
    }
}
