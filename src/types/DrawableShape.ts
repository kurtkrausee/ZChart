// zchart/types/DrawableShape.ts
// Version: 2.6.0 | Updated: 2026-04-19 | By: GitHub Copilot
// ============================================================================
//  Gemeinsames Interface für alle zeichenbaren Formen (Tool-Nodes).
//  Jeder Tool-Node (TrendLine, Fibo, HLine, VLine, Emoji) implementiert
//  dieses Interface, damit DrawingManager, InputManager und Context-Menu
//  polymorph arbeiten können – ohne Union-Types oder constructor.name-Checks.
// ============================================================================

import type { TimeScale } from '../math/TimeScale';
import type { PriceScale } from '../math/PriceScale';
import type { ChartConfig } from '../core/ChartOptions';

export interface LogicalPoint {
  index: number;
  price: number;
}

/** TV-style timeframe visibility ranges */
export interface VisibilityTimeframes {
  minutes?: { enabled: boolean; min: number; max: number };
  hours?:   { enabled: boolean; min: number; max: number };
  days?:    boolean;
  weeks?:   boolean;
  months?:  boolean;
}

/**
 * Typ-Tag für schnelle Identifikation ohne constructor.name.
 * Jeder Tool-Node setzt dieses Feld als readonly Literal.
 */
export type DrawableShapeType = 'trendline' | 'fibo' | 'hline' | 'vline' | 'emoji' | 'ray' | 'extended_line' | 'parallel_channel' | 'disjoint_channel' | 'flat_top_bottom' | 'regression_trend' | 'rectangle' | 'rotated_rectangle' | 'arc' | 'text_label' | 'anchored_text' | 'note' | 'pin' | 'price_note' | 'table' | 'polyline' | 'path' | 'curve' | 'double_curve' | 'measure' | 'fibo_extension' | 'arrow' | 'arrow_mark' | 'price_label' | 'callout' | 'comment' | 'signpost' | 'flag' | 'image_note' | 'alert_line' | 'ellipse' | 'triangle' | 'fib_time_zones' | 'brush' | 'fib_channel' | 'fib_fan' | 'fib_arcs' | 'info_line' | 'cross_line' | 'hray' | 'trend_angle' | 'pitchfork' | 'fib_trend_time' | 'fib_circles' | 'fib_spiral' | 'fib_wedge' | 'pitchfan' | 'gann_box' | 'gann_fan' | 'gann_square_fixed' | 'gann_square' | 'xabcd_pattern' | 'cypher_pattern' | 'head_and_shoulders' | 'abcd_pattern' | 'triangle_pattern' | 'three_drives' | 'cyclic_lines' | 'time_cycles' | 'sine_line' | 'long_position' | 'short_position' | 'forecast' | 'bars_pattern' | 'ghost_feed' | 'sector' | 'anchored_vwap' | 'fixed_range_volume_profile' | 'anchored_volume_profile' | 'price_range' | 'date_range' | 'date_price_range' | 'trade_signal' | 'elliott_impulse' | 'elliott_correction' | 'elliott_triangle' | 'elliott_double_combo' | 'elliott_triple_combo';

/**
 * Gemeinsames Interface für alle zeichenbaren Tool-Shapes.
 */
export interface DrawableShape {
  readonly id: string;
  readonly shapeType: DrawableShapeType;
  name: string;
  isVisible: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isLocked: boolean;
  point1: LogicalPoint | null;
  point2: LogicalPoint | null;
  point3?: LogicalPoint | null;
  point4?: LogicalPoint | null;

  /**
   * Pane binding for sub-pane drawings (B2).
   * - 'main' (default) → price pane
   * - 'rsi' | 'stochastic' | 'atr' | <server-indicator-id> → sub-pane
   * Undefined is treated as 'main' for backward-compat.
   */
  paneId?: string;

  /**
   * ZV10-P7d: Scale binding within the pane (Multi-Y-Achse).
   * Undefined = Default-Scale 'right' (alle Bestands-Drawings).
   * V1 zeichnet neue Drawings immer auf der Default-Scale — das Feld wird
   * serialisiert/round-trippt, damit spätere Zusatz-Scale-Drawings ohne
   * Migrationsbruch möglich sind (Design §7).
   */
  yAxisId?: string;

  // Optional text label rendered near the shape
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontBold?: boolean;
  fontItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';

  // Interval visibility: 'all' | 'current_and_above' | 'current_and_below' | 'current_only'
  visibleIntervals?: string;

  // TV-style timeframe visibility ranges (minutes/hours + checkboxes for D/W/M)
  visibilityTimeframes?: VisibilityTimeframes;

  // ── Line tool extensions (TV-style) ──
  extendLeft?: boolean;
  extendRight?: boolean;
  leftEndpoint?: 'normal' | 'arrow';
  rightEndpoint?: 'normal' | 'arrow';
  showMiddlePoint?: boolean;
  showPriceLabels?: boolean;

  // Stats display
  statsMode?: 'hidden' | 'compact';
  statsPosition?: 'left' | 'center' | 'right' | 'auto';
  statsShowPriceRange?: boolean;
  statsShowPercentChange?: boolean;
  statsShowPipsChange?: boolean;
  statsShowBarsRange?: boolean;
  statsShowDateTimeRange?: boolean;
  statsShowDistance?: boolean;
  statsShowAngle?: boolean;

  draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void;

  hitTest(
    pixelX: number,
    pixelY: number,
    timeScale: TimeScale,
    priceScale: PriceScale
  ): boolean;

  hitTestAnchor(
    pixelX: number,
    pixelY: number,
    timeScale: TimeScale,
    priceScale: PriceScale
  ): number | null;
}
