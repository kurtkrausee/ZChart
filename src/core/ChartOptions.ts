// ChartOptions.ts
// Version: 2.7.0 | Updated: 2026-08-19 | By: Agent
// 2.7.0 (AR-Polish 12): grid.verticalLines.minSpacingPx (GridNode-Schrittweite).
// ZV10-P6: timeScale.zoomAnchor ('pointer' | 'right_edge') für den Wheel-Zoom
// ZV10-P4: layout.thousandSeparator + trimTrailingZeros (Achsen-Zahlenformat)
// P1: 13 → 22 colors slots, deepMergeOptions, re-export DeepPartial from VisualSettings
// P4.8: layout.marginTop/Bottom/rightBars
// P7.3: priceLabels block
// P7.4: timeScale block (dayOfWeekOnLabels, dateFormat, timeFormat, saveLeftEdge)
// Bug-Fix: colorBarsByPrevClose + priceDecimals

import { deepMerge, type DeepPartial } from './VisualSettings';
import type { ThousandSeparatorStyle } from '../utils/Formatters';

export type { DeepPartial } from './VisualSettings';

export interface ChartConfig {
  colors: {
    // Background (2 slots)
    background: string;
    backgroundGradientTo: string;
    // Grid (3 slots)
    grid: string;
    gridVert: string;
    gridHorz: string;
    // Text / Axis (3 slots)
    text: string;
    axisLine: string;
    separator: string;
    // Candle body (2 slots)
    candleUp: string;
    candleDown: string;
    candleHollow: boolean;
    bodyVisible: boolean;
    // Candle borders (2 slots)
    candleBorderUp: string;
    candleBorderDown: string;
    borderVisible: boolean;
    // Candle wick (2 slots)
    wickUp: string;
    wickDown: string;
    wickVisible: boolean;
    // Volume (2 slots)
    volumeUp: string;
    volumeDown: string;
    // Crosshair (3 slots)
    crosshair: string;
    crosshairLabelBg: string;
    crosshairLabelText: string;
    // Area (3 slots)
    areaLineColor: string;
    areaGradientStart: string;
    areaGradientEnd: string;
    // Last price label (2 slots)
    lastPriceLabelBg: string;
    lastPriceLabelText: string;
    // Watermark (1 slot)
    watermark: string;
    // Candle coloring mode (Bug-Fix)
    colorBarsByPrevClose: boolean;
  };
  layout: {
    axisWidth: number;
    axisHeight: number;
    fontSize: number;
    fontFamily: string;
    /** Top margin as fraction of pane height (e.g. 0.1 = 10%) */
    marginTop: number;
    /** Bottom margin as fraction of pane height (e.g. 0.1 = 10%) */
    marginBottom: number;
    /** Empty bars to reserve on the right side of the chart */
    rightBars: number;
    /** Fixed decimal places for price labels (null = auto via smartDecimals) */
    priceDecimals: number | null;
    /** ZV10-P4: Tausendertrenner für Preis-Labels (Achse/Crosshair/LastPrice) */
    thousandSeparator: ThousandSeparatorStyle;
    /** ZV10-P4: Überflüssige Null-Dezimalen in Preis-Labels abschneiden */
    trimTrailingZeros: boolean;
  };
  grid: {
    verticalLines: {
      lineWidth: number;
      visible: boolean;
      /** AR-Polish 12: Mindestabstand der vertikalen Linien in px (Default 100). */
      minSpacingPx?: number;
    };
    horizontalLines: {
      lineWidth: number;
      visible: boolean;
    };
  };
  /** P7.3: Price Labels & Lines visibility flags */
  priceLabels: {
    /** Hide all price-scale labels (toggle from Scales tab) */
    labelsVisible: boolean;
    /** Skip rendering of label if it would overlap the previous one */
    noOverlappingLabels: boolean;
    /** Show "+" click-target on the price axis (stub — no action in P7.3) */
    plusButton: boolean;
    /** Countdown-to-bar-close label on the X-axis (stub — renders when true) */
    countdownToBarClose: boolean;
    /** Color of the last-price symbol label overlay on the Y-axis */
    symbolLabelColor: string;
    /** Draw horizontal day-high / day-low dotted lines on the chart */
    highLowLines: boolean;
    /** Draw bid/ask lines (stub — requires live feed, visual stub only) */
    bidAskLines: boolean;
  };
  /** P7.4: Time Scale display options */
    timeScale: {
      /** Show 2-char day abbreviation (Mo, Di, …) before day number on X-axis */
      dayOfWeekOnLabels: boolean;
      /** Date format used for day-change labels and crosshair */
      dateFormat: 'dd.MM.yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
      /** 12h or 24h time format for intraday labels */
      timeFormat: '24h' | '12h';
      /** Preserve the visible left edge when the interval changes */
      saveLeftEdgeOnIntervalChange: boolean;
      /** ZV10-P6: Wheel-Zoom-Fokuspunkt — 'pointer' (TradingView) oder
       *  'right_edge' (letzte Kerze bleibt fix, MetaTrader). Pinch immer 'pointer'. */
      zoomAnchor: 'pointer' | 'right_edge';
    };
    /** P10: Alert display & notification settings */
    alerts: {
      /** Show horizontal alert lines on the chart */
      alertLinesVisible: boolean;
      /** Color of the alert lines and labels */
      alertLinesColor: string;
      /** Only show alert lines that have been triggered */
      onlyActiveAlerts: boolean;
      /** Volume level for alert sounds (0-1) */
      alertVolume: number;
      /** Auto-hide toast notifications after a delay */
      autoHideToasts: boolean;
    };
    /** Duration of one candle bar in milliseconds (for date/time range stats) */
    intervalMs: number;
  /** IANA timezone for x-axis / crosshair labels (z.B. "Europe/Berlin") */
  timezone: string;
}

export const defaultOptions: ChartConfig = {
  colors: {
    // Background
    background: '#131722',
    backgroundGradientTo: '#131722',
    // Grid
    grid: '#1e222d',
    gridVert: '#1e222d',
    gridHorz: '#1e222d',
    // Text / Axis
    text: '#94a3b8',
    axisLine: '#1e222d',
    separator: '#334155',
    // Candle body
    candleUp: '#089981',
    candleDown: '#f23645',
    candleHollow: false,
    bodyVisible: true,
    // Candle borders
    candleBorderUp: '#089981',
    candleBorderDown: '#f23645',
    borderVisible: true,
    // Candle wick
    wickUp: '#089981',
    wickDown: '#f23645',
    wickVisible: true,
    // Volume
    volumeUp: 'rgba(8, 153, 129, 0.5)',
    volumeDown: 'rgba(242, 54, 69, 0.5)',
    // Crosshair
    crosshair: '#758696',
    crosshairLabelBg: '#334155',
    crosshairLabelText: '#e2e8f0',
    // Area
    areaLineColor: '#60a5fa',
    areaGradientStart: 'rgba(96, 165, 250, 0.35)',
    areaGradientEnd: 'rgba(96, 165, 250, 0.0)',
    // Last price label
    lastPriceLabelBg: '#089981',
    lastPriceLabelText: '#ffffff',
    // Watermark
    watermark: 'rgba(0,0,0,0)',
    colorBarsByPrevClose: false,
  },
  layout: {
    axisWidth: 60,
    axisHeight: 30,
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
    marginTop: 0.1,
    marginBottom: 0.1,
    rightBars: 5,
    priceDecimals: null,
    thousandSeparator: 'apostrophe',
    trimTrailingZeros: false,
  },
  grid: {
    verticalLines: { lineWidth: 1, visible: true, minSpacingPx: 100 },
    horizontalLines: { lineWidth: 1, visible: true },
  },
  priceLabels: {
    labelsVisible: true,
    noOverlappingLabels: false,
    plusButton: true,
    countdownToBarClose: false,
    symbolLabelColor: '#94a3b8',
    highLowLines: true,
    bidAskLines: false,
  },
    timeScale: {
    dayOfWeekOnLabels: false,
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    saveLeftEdgeOnIntervalChange: false,
    zoomAnchor: 'pointer',
  },
  alerts: {
    alertLinesVisible: true,
    alertLinesColor: '#ff9800',
    onlyActiveAlerts: false,
    alertVolume: 1,
    autoHideToasts: true,
  },
  intervalMs: 86400000, // 1D default
  timezone: 'UTC',
};

// Fusioniert die Standardwerte sicher mit den Nutzer-Optionen
// P1: Deep-Merge für verschachtelte Objekte (Theme-Presets)
export function mergeOptions(
  base: ChartConfig,
  userOverrides?: DeepPartial<ChartConfig>
): ChartConfig {
  if (!userOverrides) return base;

  return {
    colors: deepMerge(base.colors, userOverrides.colors ?? {}),
    layout: deepMerge(base.layout, userOverrides.layout ?? {}),
    grid: {
      verticalLines: deepMerge(base.grid.verticalLines, userOverrides.grid?.verticalLines ?? {}),
      horizontalLines: deepMerge(base.grid.horizontalLines, userOverrides.grid?.horizontalLines ?? {}),
    },
        priceLabels: deepMerge(base.priceLabels, userOverrides.priceLabels ?? {}),
    timeScale: deepMerge(base.timeScale, userOverrides.timeScale ?? {}),
    alerts: deepMerge(base.alerts, userOverrides.alerts ?? {}),
    intervalMs: userOverrides.intervalMs ?? base.intervalMs,
    timezone: userOverrides.timezone ?? base.timezone,
  };
}