// nodes/tools/fib/FibTypes.ts
// Version: 2.1.0 | Updated: 2026-04-15 | By: GitHub Copilot
// ============================================================================
//  Shared types & defaults for all Fibonacci drawing tools.
//  Designed for Phase 3 Atom-Katalog: every property becomes a UI-editable atom.
//  Matches TradingView's Fibonacci Settings structure.
// ============================================================================

// ── Primitive types ──────────────────────────────────────────────────────────

export type LineStyle = 'solid' | 'dashed' | 'dotted';

// ── Level configuration (per-level styling like TV) ──────────────────────────

export interface FibLevel {
  value: number;           // Fibonacci ratio (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, ...)
  color: string;           // Line + label color
  lineWidth: number;       // px
  lineStyle: LineStyle;    // solid / dashed / dotted
  visible: boolean;        // Toggle individual levels on/off
}

// ── Sub-configs ──────────────────────────────────────────────────────────────

export interface FibTrendLineConfig {
  show: boolean;           // Show the diagonal base/trend line
  color: string;
  width: number;
  style: LineStyle;
}

export interface FibFillConfig {
  show: boolean;           // Show background fills between levels
  opacity: number;         // 0.0–1.0 (TV default ~0.06–0.1)
}

export interface FibLabelConfig {
  show: boolean;           // Show level value labels
  showPrice: boolean;      // "Prices" checkbox — include price in label
  format: 'values' | 'percents';  // "Levels" dropdown — display as values or percents
  hAlign: 'left' | 'center' | 'right';  // "Labels" horizontal position
  vAlign: 'top' | 'middle' | 'bottom';  // "Labels" vertical position
  showText: boolean;       // "Text" checkbox — show custom text on levels
  textHAlign: 'left' | 'center' | 'right';  // "Text" horizontal align
  textVAlign: 'top' | 'middle' | 'bottom';  // "Text" vertical align
  fontSize: number;        // px
  // Legacy compat (kept for old saved drawings)
  showPercent?: boolean;
  position?: 'left' | 'right';
}

// ── Master config (per-node instance) ────────────────────────────────────────

export interface FibStyleConfig {
  levels: FibLevel[];
  priceLevels?: FibLevel[];    // Speed Resistance Fan: price-axis levels
  timeLevels?: FibLevel[];     // Speed Resistance Fan: time-axis levels
  trendLine: FibTrendLineConfig;
  fills: FibFillConfig;
  labels: FibLabelConfig;
  extend: 'none' | 'left' | 'right' | 'both';  // TV-style single dropdown
  reverse: boolean;        // Flip 0%↔100% direction
  useOneColor: boolean;    // Override all level colors with oneColor
  oneColor: string;        // Single color when useOneColor is true
  logScale: boolean;       // Calculate Fib levels on log scale
  levelsLineWidth?: number;   // Global level line width (TV "Levels line")
  levelsLineStyle?: LineStyle; // Global level line style
  showGrid?: boolean;          // Speed Fan: show grid lines inside rectangle
  leftLabels?: boolean;        // Speed Fan: price labels on left edge
  rightLabels?: boolean;       // Speed Fan: price labels on right edge
  topLabels?: boolean;         // Speed Fan: time labels on top edge
  bottomLabels?: boolean;      // Speed Fan: time labels on bottom edge
  fullCircles?: boolean;       // Fib Arcs: draw full circles instead of half arcs
  // Legacy compat (kept for old saved drawings)
  extendLeft?: boolean;
  extendRight?: boolean;
}

// ── Canvas helper ────────────────────────────────────────────────────────────

/** Apply a LineStyle to a canvas context. Call ctx.setLineDash([]) to reset after stroke. */
export function applyLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle): void {
  switch (style) {
    case 'dashed': ctx.setLineDash([6, 4]); break;
    case 'dotted': ctx.setLineDash([2, 2]); break;
    default:       ctx.setLineDash([]); break;
  }
}

/** Format a Fib level label based on config. */
export function formatFibLabel(level: FibLevel, price: number, cfg: FibLabelConfig): string {
  const parts: string[] = [];
  // Level value/percent
  const format = cfg.format ?? (cfg.showPercent ? 'percents' : 'values');
  if (cfg.show) {
    parts.push(format === 'percents' ? `${(level.value * 100).toFixed(1)}%` : `${level.value}`);
  }
  if (cfg.showPrice) parts.push(`(${price.toFixed(2)})`);
  return parts.join(' ');
}

// ── Default level presets ────────────────────────────────────────────────────

export const DEFAULT_RETRACEMENT_LEVELS: FibLevel[] = [
  // Checked by default (TV standard)
  { value: 0,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'dashed', visible: true },
  { value: 0.618, color: '#009688', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.786, color: '#00bcd4', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 1.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 2.618, color: '#f44336', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 3.618, color: '#9c27b0', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 4.236, color: '#e91e63', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  // Unchecked by default (extended TV levels)
  { value: 1.272, color: '#ff9800', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 1.414, color: '#ef9a9a', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2.272, color: '#ffb74d', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2,     color: '#80cbc4', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2.414, color: '#a5d6a7', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3,     color: '#80deea', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3.272, color: '#90a4ae', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3.414, color: '#64b5f6', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4,     color: '#ef9a9a', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.272, color: '#ce93d8', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.414, color: '#f48fb1', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.618, color: '#ffb74d', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.764, color: '#80cbc4', lineWidth: 1,   lineStyle: 'dashed', visible: false },
];

export const DEFAULT_EXTENSION_LEVELS: FibLevel[] = [
  // Checked by default (TV standard)
  { value: 0,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'dashed', visible: true },
  { value: 0.618, color: '#009688', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.786, color: '#00bcd4', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 1.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 2.618, color: '#f44336', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 3.618, color: '#9c27b0', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 4.236, color: '#e91e63', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  // Unchecked by default (extended TV levels)
  { value: 1.272, color: '#ff9800', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 1.414, color: '#ef9a9a', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2.272, color: '#ffb74d', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2,     color: '#80cbc4', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2.414, color: '#a5d6a7', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3,     color: '#80deea', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3.272, color: '#90a4ae', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3.414, color: '#64b5f6', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4,     color: '#ef9a9a', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.272, color: '#ce93d8', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.414, color: '#f48fb1', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.618, color: '#ffb74d', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.764, color: '#80cbc4', lineWidth: 1,   lineStyle: 'dashed', visible: false },
];

export const DEFAULT_CHANNEL_LEVELS: FibLevel[] = [
  // Checked by default (TV standard — same as Retracement)
  { value: 0,     color: '#787b86', lineWidth: 1.5, lineStyle: 'solid',  visible: true },
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'dashed', visible: true },
  { value: 0.618, color: '#009688', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 0.786, color: '#00bcd4', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1.5, lineStyle: 'solid',  visible: true },
  { value: 1.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 2.618, color: '#f44336', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 3.618, color: '#9c27b0', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  { value: 4.236, color: '#e91e63', lineWidth: 1,   lineStyle: 'dashed', visible: true },
  // Unchecked by default (extended TV levels)
  { value: 1.272, color: '#ff9800', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 1.414, color: '#ef9a9a', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2.272, color: '#ffb74d', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2,     color: '#80cbc4', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 2.414, color: '#a5d6a7', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3,     color: '#80deea', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3.272, color: '#90a4ae', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 3.414, color: '#64b5f6', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4,     color: '#ef9a9a', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.272, color: '#ce93d8', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.414, color: '#f48fb1', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.618, color: '#ffb74d', lineWidth: 1,   lineStyle: 'dashed', visible: false },
  { value: 4.764, color: '#80cbc4', lineWidth: 1,   lineStyle: 'dashed', visible: false },
];

export const DEFAULT_FAN_LEVELS: FibLevel[] = [
  { value: 0,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'solid',  visible: true },
  { value: 0.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 0.786, color: '#9c27b0', lineWidth: 1,   lineStyle: 'solid',  visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid',  visible: true },
];

/** Speed Resistance Fan: Price-axis levels (TV default: 0..1 with 0.25/0.75) */
export const DEFAULT_SPEED_FAN_PRICE_LEVELS: FibLevel[] = [
  { value: 0,     color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.25,  color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#00bcd4', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#009688', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.75,  color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1,     color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
];

/** Speed Resistance Fan: Time-axis levels (TV default: 0..1 with 0.25/0.75) */
export const DEFAULT_SPEED_FAN_TIME_LEVELS: FibLevel[] = [
  { value: 0,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.25,  color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#00bcd4', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#009688', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.75,  color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid', visible: true },
];

export const DEFAULT_ARC_LEVELS: FibLevel[] = [
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.786, color: '#00bcd4', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1.618, color: '#2962ff', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 2.618, color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 3.618, color: '#2962ff', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 4.236, color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 4.618, color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: true },
];

export const DEFAULT_TREND_TIME_LEVELS: FibLevel[] = [
  { value: 0,     color: '#787b86', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#f23645', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1, lineStyle: 'solid', visible: false },
  { value: 0.618, color: '#089981', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 1,     color: '#00897b', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 1.382, color: '#00bcd4', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 1.618, color: '#787b86', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 2,     color: '#2196f3', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 2.382, color: '#f23645', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 2.618, color: '#9c27b0', lineWidth: 1, lineStyle: 'solid', visible: true },
  { value: 3,     color: '#3f51b5', lineWidth: 1, lineStyle: 'solid', visible: true },
];

export const DEFAULT_CIRCLE_LEVELS: FibLevel[] = [
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#089981', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.786, color: '#00bcd4', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 2.618, color: '#f23645', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 3.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 4.236, color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 4.618, color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
];

export const DEFAULT_SPIRAL_LEVELS: FibLevel[] = [
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#2196f3', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1,     color: '#4caf50', lineWidth: 1.5, lineStyle: 'solid', visible: true },
  { value: 1.618, color: '#9c27b0', lineWidth: 1,   lineStyle: 'solid', visible: true },
];

export const DEFAULT_WEDGE_LEVELS: FibLevel[] = [
  { value: 0.236, color: '#f44336', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.382, color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.5,   color: '#4caf50', lineWidth: 1.5, lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#089981', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 0.786, color: '#00bcd4', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1,     color: '#787b86', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1.618, color: '#2962ff', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 2.618, color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 3.618, color: '#673ab7', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 4.236, color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 4.618, color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: false },
];

export const DEFAULT_PITCHFAN_LEVELS: FibLevel[] = [
  { value: 0.25,  color: '#ff9800', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 0.382, color: '#4caf50', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 0.5,   color: '#00bcd4', lineWidth: 1.5, lineStyle: 'solid', visible: true },
  { value: 0.618, color: '#089981', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 0.75,  color: '#00bcd4', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 1,     color: '#2962ff', lineWidth: 1,   lineStyle: 'solid', visible: true },
  { value: 1.5,   color: '#673ab7', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 1.75,  color: '#e91e63', lineWidth: 1,   lineStyle: 'solid', visible: false },
  { value: 2,     color: '#ff5722', lineWidth: 1,   lineStyle: 'solid', visible: false },
];

// ── Default style configs ────────────────────────────────────────────────────

const DEFAULT_TREND_LINE: FibTrendLineConfig = {
  show: true, color: 'rgba(120,123,134,0.5)', width: 1, style: 'dashed',
};

const DEFAULT_FILLS: FibFillConfig = { show: true, opacity: 0.08 };

const DEFAULT_LABELS: FibLabelConfig = {
  show: true, showPrice: true, format: 'values',
  hAlign: 'left', vAlign: 'middle',
  showText: true, textHAlign: 'center', textVAlign: 'middle',
  fontSize: 12,
};

export function createDefaultFibStyle(levels: FibLevel[]): FibStyleConfig {
  return {
    levels: levels.map(l => ({ ...l })),
    trendLine: { ...DEFAULT_TREND_LINE },
    fills: { ...DEFAULT_FILLS },
    labels: { ...DEFAULT_LABELS },
    extend: 'none',
    reverse: false,
    useOneColor: false,
    oneColor: '#2962FF',
    logScale: false,
    levelsLineWidth: 1,
    levelsLineStyle: 'solid',
  };
}

/** Speed Resistance Fan: custom default style with priceLevels + timeLevels */
export function createDefaultSpeedFanStyle(): FibStyleConfig {
  return {
    levels: [],
    priceLevels: DEFAULT_SPEED_FAN_PRICE_LEVELS.map(l => ({ ...l })),
    timeLevels: DEFAULT_SPEED_FAN_TIME_LEVELS.map(l => ({ ...l })),
    trendLine: { show: false, color: 'rgba(120,123,134,0.5)', width: 1, style: 'dashed' },
    fills: { show: true, opacity: 0.08 },
    labels: {
      show: true, showPrice: false, format: 'values',
      hAlign: 'left', vAlign: 'middle',
      showText: false, textHAlign: 'center', textVAlign: 'middle',
      fontSize: 11,
    },
    extend: 'none',
    reverse: false,
    useOneColor: false,
    oneColor: '#2962FF',
    logScale: false,
    showGrid: true,
    leftLabels: true,
    rightLabels: true,
    topLabels: true,
    bottomLabels: true,
  };
}

/** Trend-Based Fib Time: TV-style defaults (labels right+bottom, no extend/reverse) */
export function createDefaultTrendTimeStyle(): FibStyleConfig {
  return {
    levels: DEFAULT_TREND_TIME_LEVELS.map(l => ({ ...l })),
    trendLine: { show: true, color: '#787b86', width: 1, style: 'dashed' },
    fills: { show: true, opacity: 0.08 },
    labels: {
      show: true, showPrice: false, format: 'values',
      hAlign: 'right', vAlign: 'bottom',
      showText: false, textHAlign: 'center', textVAlign: 'middle',
      fontSize: 10,
    },
    extend: 'none',
    reverse: false,
    useOneColor: false,
    oneColor: '#2962FF',
    logScale: false,
  };
}

// ── Fib Time Zone defaults (Fibonacci sequence integers) ─────────────────────

export const DEFAULT_TIME_ZONE_LEVELS: FibLevel[] = [
  { value: 0,  color: '#787b86', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 1,  color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 2,  color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 3,  color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 5,  color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 8,  color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 13, color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 21, color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 34, color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 55, color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
  { value: 89, color: '#2196f3', lineWidth: 1, lineStyle: 'solid',  visible: true },
];
