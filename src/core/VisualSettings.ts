// src/core/VisualSettings.ts
// Version: 1.5.0 | Updated: 2026-08-16 | By: Agent
// ZPI-P6: DataSettings.rememberDrawings (Opt-out Zeichnungs-Persistenz, Default AN)
// ZV10-P6: TimeScaleSettings.zoomAnchor + Root-Block hotkeys (Record action→combo)
// ZV10-P4: SymbolSettings.thousandSeparator + trimTrailingZeros (Zahlenformat)
// P1: TV-Style Chart Settings Foundation — Interfaces, Defaults, Selector, Deep-Merge
// P4.9: deriveChartConfigLayout selector (fontSize from canvas.scales)

import type { ThousandSeparatorStyle } from '../utils/Formatters';

// ==================== Deep-Partial Helper ====================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ==================== Deep-Merge ====================
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function deepMerge<T extends object>(base: T, partial: DeepPartial<T>): T {
  const result = { ...base } as any;
  for (const key of Object.keys(partial as any)) {
    const val = (partial as any)[key];
    if (val === undefined) continue;
    if (isPlainObject(val) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key] as any, val as any);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

// ==================== SymbolSettings (TV-Tab "Symbol") ====================
export interface CandleSettings {
  bodyUp: string;
  bodyDown: string;
  bodyVisible: boolean;
  borderUp: string;
  borderDown: string;
  borderVisible: boolean;
  wickUp: string;
  wickDown: string;
  wickVisible: boolean;
  wickSync: boolean;
  hollow: boolean;
  colorBarsByPrevClose: boolean;
}

export interface VolumeSettings {
  up: string;
  down: string;
  visible: boolean;
  /** ZV10-f: Volumen zusätzlich als Band im Hauptchart (unteres Viertel, eigene versteckte Scale). Optional — alte Saves = false. */
  overlayInMain?: boolean;
}

export interface SymbolSettings {
  candle: CandleSettings;
  volume: VolumeSettings;
  chartStyle: 'candle_solid' | 'ohlc' | 'line' | 'area' | 'heikin_ashi' | 'hollow' | 'baseline';
  precision: 'default' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15';
  timezone: string;
  adjustDataForDividends: boolean;
  /** ZV10-P4: Tausendertrenner für Preis-Labels (Achse/Crosshair/LastPrice) */
  thousandSeparator: ThousandSeparatorStyle;
  /** ZV10-P4: Überflüssige Null-Dezimalen abschneiden ("42.00" → "42") */
  trimTrailingZeros: boolean;
}

// ==================== StatusLineSettings (TV-Tab "Status line") ====================
export interface StatusLineSettings {
  visible: boolean;
  logo: boolean;
  title: boolean;
  titleMode: 'name' | 'symbol' | 'description';
  marketStatus: boolean;
  chartValues: boolean;
  barChange: boolean;
  volume: boolean;
  lastDayChange: boolean;
  backgroundOpacity: number; // 0–1
}

// ==================== ScalesSettings (TV-Tab "Scales and lines") ====================
export interface PriceScaleSettings {
  currencyUnit: string;
  scaleMode: 'normal' | 'logarithmic' | 'percentage' | 'log';
  lockPriceToBarRatio: boolean;
  placement: 'right' | 'left' | 'both' | 'hidden';
}

export interface PriceLabelSettings {
  labelsVisible: boolean;
  noOverlappingLabels: boolean;
  plusButton: boolean;
  countdownToBarClose: boolean;
  symbolLabel: { mode: 'name' | 'symbol' | 'description'; color: string };
  prePostMarket: boolean;
  highLowLines: boolean;
  bidAskLines: boolean;
}

export interface TimeScaleSettings {
  dayOfWeekOnLabels: boolean;
  dateFormat: 'dd.MM.yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd' | 'auto';
  timeFormat: '24h' | '12h';
  saveLeftEdgeOnIntervalChange: boolean;
  /** ZV10-P6: Wheel-Zoom-Fokuspunkt — 'pointer' (TV) oder 'right_edge' (MetaTrader). */
  zoomAnchor: 'pointer' | 'right_edge';
}

export interface ScalesSettings {
  priceScale: PriceScaleSettings;
  priceLabels: PriceLabelSettings;
  timeScale: TimeScaleSettings;
}

// ==================== CanvasSettings (TV-Tab "Canvas") ====================
export interface BackgroundSettings {
  mode: 'solid' | 'gradient';
  /** Solid-mode Hintergrundfarbe */
  solidColor: string;
  /** Gradient-Start ("von") */
  color: string;
  /** Gradient-Ende ("bis") */
  colorTo?: string;
}

export interface GridSettings {
  mode: 'both' | 'vert' | 'horz' | 'none';
  vertColor: string;
  horzColor: string;
}

export interface CrosshairSettings {
  color: string;
  style: 'cross' | 'line' | 'dashed' | 'dotted';
  visible: boolean;
}

export interface WatermarkSettings {
  mode: 'off' | 'replayOnly' | 'always';
  color: string;
  text: string;
}

export interface ScalesAppearanceSettings {
  textColor: string;
  fontSize: 10 | 11 | 12 | 14 | 16 | 18;
  linesColor: string;
}

export interface ButtonVisibility {
  navigation: 'hidden' | 'always' | 'mouseover';
  pane: 'hidden' | 'always' | 'mouseover';
}

export interface MarginsSettings {
  top: number;      // percentage (0–100)
  bottom: number;   // percentage (0–100)
  rightBars: number; // number of bars
}

export interface CanvasSettings {
  background: BackgroundSettings;
  grid: GridSettings;
  crosshair: CrosshairSettings;
  watermark: WatermarkSettings;
  scales: ScalesAppearanceSettings;
  buttons: ButtonVisibility;
  margins: MarginsSettings;
}

// ==================== TradingSettings (TV-Tab "Trading") ====================
export interface TradingSettings {
  buySellButtons: boolean;
  executionSound: boolean;
  showOnlyRejectionNotifications: boolean;
  positionsAndOrders: boolean;
  reversePositionButton: boolean;
  profitLossValue: 'money' | 'percent' | 'both';
  executionMarks: boolean;
  executionLabels: boolean;
  extendedPriceLines: boolean;
  orderAlignment: 'right' | 'left';
  // Trading-Overlay Style-Override (optional)
  tradeSignalStyle?: {
    longEntryColor?: string;
    shortEntryColor?: string;
    slColor?: string;
    tpColor?: string;
    pendingColor?: string;
    entryWidth?: number;
    lineWidth?: number;
    showLivePL?: boolean;
  };
  // Disabled slots (context-dependent)
  oneClickTrading: boolean;
  projectOrder: boolean;
  brackets: boolean;
  ordersInSnapshots: boolean;
}

// ==================== AlertsSettings (TV-Tab "Alerts") ====================
export interface AlertsSettings {
  alertLinesVisible: boolean;
  alertLinesColor: string;
  onlyActiveAlerts: boolean;
  alertVolume: number; // 0–1
  autoHideToasts: boolean;
}

// ==================== EventsSettings (TV-Tab "Events") ====================
export interface EventsSettings {
  ideas: boolean;
  dividends: boolean;
  splits: boolean;
  earnings: boolean;
  earningsBreaks: boolean;
  latestNews: boolean;
  newsNotification: boolean;
}

// ==================== DataSettings (TV-Tab "Daten") ====================
/** Daten-bezogene Settings (Performance-Knobs, kein visueller Aspekt). */
export interface DataSettings {
  /**
   * Maximale Bar-Anzahl pro Initial-Fetch des Hauptcharts. Backend hardcap
   * ist 200_000 (s. `fastapi_routers/timescale_charts.py`). Sinnvolle Werte:
   *  -      500–1.000  schneller Standardchart
   *  -    5.000–10.000 langfristige Übersicht
   *  -   50.000–100.000 Profiling / sehr große Historien
   * Achtung: 100k Bars sind ~12 MB JSON-Payload + ~500 MB Heap-Anstieg.
   */
  maxBars: number;
  /**
   * ZIP-P4: „Indikatoren merken" — aktive Indikatoren (Built-in, Server-Python,
   * Moving Averages, Custom-Skripte) überleben Navigation und Browser-Neustart.
   * Default true. Bei false wird nichts gespeichert UND ein bereits
   * gespeicherter Stand ignoriert bzw. geleert (siehe ZChartTab Save-/Restore-
   * Effects, zchart_settings.indicators).
   */
  rememberIndicators: boolean;
  /**
   * ZPI-P6: „Zeichnungen merken" — Chart-Zeichnungen je Pane persistieren
   * (chart_drawings). Default true. Bei false wird nichts gespeichert, kein
   * gespeicherter Stand geladen und der gespeicherte Stand beim Ausschalten
   * geleert (gleiche Semantik wie rememberIndicators, ZIP-P4).
   */
  rememberDrawings: boolean;
}

// ==================== VisualSettings (Root) ====================
export interface VisualSettings {
  symbol: SymbolSettings;
  statusLine: StatusLineSettings;
  scales: ScalesSettings;
  canvas: CanvasSettings;
  trading: TradingSettings;
  alerts: AlertsSettings;
  events: EventsSettings;
  /** Performance/Daten-bezogen — kein visueller Aspekt (P-data 2026-05-20). */
  data: DataSettings;
  /**
   * ZV10-P6: Hotkey-Overrides `{action → combo}` (z.B. `{trendline: 'alt+t'}`).
   * Leeres Objekt = Host-App-Defaults;
   * die Engine interpretiert die Actions nicht.
   */
  hotkeys: Record<string, string>;
  themeId: string | 'custom';
  __v: number; // Schema version
}

// ==================== Default-Tree ====================
export const defaultVisualSettings: VisualSettings = {
  __v: 2,
  themeId: 'custom',

  symbol: {
    candle: {
      bodyUp: '#089981',
      bodyDown: '#f23645',
      bodyVisible: true,
      borderUp: '#089981',
      borderDown: '#f23645',
      borderVisible: true,
      wickUp: '#089981',
      wickDown: '#f23645',
      wickVisible: true,
      wickSync: true,
      hollow: false,
      colorBarsByPrevClose: false,
    },
    volume: {
      up: 'rgba(8, 153, 129, 0.5)',
      down: 'rgba(242, 54, 69, 0.5)',
      visible: true,
    },
    chartStyle: 'candle_solid',
    precision: 'default',
    timezone: 'profile',
    adjustDataForDividends: false,
    thousandSeparator: 'apostrophe',
    trimTrailingZeros: false,
  },

  statusLine: {
    visible: true,
    logo: true,
    title: true,
    titleMode: 'name',
    marketStatus: true,
    chartValues: true,
    barChange: true,
    volume: true,
    lastDayChange: true,
    backgroundOpacity: 0.3,
  },

  scales: {
    priceScale: {
      currencyUnit: '',
      scaleMode: 'normal',
      lockPriceToBarRatio: false,
      placement: 'right',
    },
    priceLabels: {
      labelsVisible: true,
      noOverlappingLabels: false,
      plusButton: true,
      countdownToBarClose: false,
      symbolLabel: { mode: 'name', color: '#94a3b8' },
      prePostMarket: false,
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
  },

  canvas: {
    background: {
      mode: 'solid',
      solidColor: '#131722',
      color: '#131722',
      colorTo: '#0a0e1a',
    },
    grid: {
      mode: 'both',
      vertColor: '#1e222d',
      horzColor: '#1e222d',
    },
    crosshair: {
      color: '#758696',
      style: 'cross',
      visible: true,
    },
    watermark: {
      mode: 'off',
      color: '#888888',
      text: '',
    },
    scales: {
      textColor: '#94a3b8',
      fontSize: 12,
      linesColor: '#1e222d',
    },
    buttons: {
      navigation: 'always',
      pane: 'always',
    },
    margins: {
      top: 0,
      bottom: 0,
      rightBars: 0,
    },
  },

  trading: {
    buySellButtons: true,
    executionSound: true,
    showOnlyRejectionNotifications: false,
    positionsAndOrders: true,
    reversePositionButton: true,
    profitLossValue: 'money',
    executionMarks: true,
    executionLabels: true,
    extendedPriceLines: true,
    orderAlignment: 'right',
    oneClickTrading: false,
    projectOrder: false,
    brackets: false,
    ordersInSnapshots: false,
  },

  alerts: {
    alertLinesVisible: true,
    alertLinesColor: '#758696',
    onlyActiveAlerts: false,
    alertVolume: 0.5,
    autoHideToasts: true,
  },

  events: {
    ideas: false,
    dividends: false,
    splits: false,
    earnings: false,
    earningsBreaks: false,
    latestNews: false,
    newsNotification: false,
  },

  data: {
    maxBars: 0,           // 0 = Host-App-Default verwenden
    rememberIndicators: true, // ZIP-P4: Default AN (User-Entscheidung 2026-08-04)
    rememberDrawings: true,   // ZPI-P6: Default AN (Entscheidung 7)
  },

  // leer = Host-App-Defaults
  hotkeys: {},
};

// ==================== Selector: deriveChartConfigColors ====================
// Converts VisualSettings → flat ChartConfig.colors (22 slots) for backward compat.
// All Nodes read from options.colors — this selector fills it on every apply.

export interface DerivedColors {
  background: string;
  grid: string;
  text: string;
  axisLine: string;
  candleUp: string;
  candleDown: string;
  wickUp: string;
  wickDown: string;
  candleBorderUp: string;
  candleBorderDown: string;
  candleHollow: boolean;
  volumeUp: string;
  volumeDown: string;
  crosshair: string;
  crosshairLabelBg: string;
  crosshairLabelText: string;
  areaLineColor: string;
  areaGradientStart: string;
  areaGradientEnd: string;
  separator: string;
  lastPriceLabelBg: string;
  lastPriceLabelText: string;
  watermark: string;
  gridVert: string;
  gridHorz: string;
  backgroundGradientTo: string;
}

export function deriveChartConfigColors(vs: VisualSettings): DerivedColors {
  const { candle, volume } = vs.symbol;
  const grid = vs.canvas.grid;
  const scales = vs.canvas.scales;
  const bg = vs.canvas.background;

  // Wick: if sync, wick follows body color
  const wickUp = candle.wickSync ? candle.bodyUp : candle.wickUp;
  const wickDown = candle.wickSync ? candle.bodyDown : candle.wickDown;

  // Candle colors: if colorBarsByPrevClose, direction is determined at render time
  // (we still provide base colors here)
  const candleUp = candle.colorBarsByPrevClose ? candle.bodyUp : candle.bodyUp;
  const candleDown = candle.colorBarsByPrevClose ? candle.bodyDown : candle.bodyDown;

  return {
    // Background
    background: bg.mode === 'solid' ? bg.solidColor : bg.color,
    backgroundGradientTo: bg.mode === 'solid' ? bg.solidColor : (bg.colorTo ?? bg.color),

    // Grid
    grid: grid.mode === 'none' ? bg.color : (grid.mode === 'vert' ? grid.horzColor : grid.vertColor),
    gridVert: grid.vertColor,
    gridHorz: grid.horzColor,

    // Text / Axis
    text: scales.textColor,
    axisLine: scales.linesColor,
    separator: scales.linesColor,

    // Candle body
    candleUp,
    candleDown,
    candleHollow: candle.hollow,

    // Candle borders
    candleBorderUp: candle.borderUp,
    candleBorderDown: candle.borderDown,

    // Candle wick
    wickUp,
    wickDown,

    // Volume
    volumeUp: volume.up,
    volumeDown: volume.down,

    // Crosshair
    crosshair: vs.canvas.crosshair.color,
    crosshairLabelBg: '#334155',
    crosshairLabelText: '#e2e8f0',

    // Area (for Line/Area charts)
    areaLineColor: '#60a5fa',
    areaGradientStart: 'rgba(96, 165, 250, 0.35)',
    areaGradientEnd: 'rgba(96, 165, 250, 0.0)',

    // Last price label
    lastPriceLabelBg: candle.bodyUp,
    lastPriceLabelText: '#ffffff',

    // Watermark
    watermark: vs.canvas.watermark.color,
  };
}

// ==================== Selector: deriveChartConfigLayout ====================
// Maps VisualSettings → ChartConfig.layout overrides.
// Used by applyVisualSettings (P5+) to update fontSize/fontFamily alongside colors.
export interface DerivedLayout {
  fontSize: number;
  /** fontFamily is not stored in VisualSettings (always system font); kept for future extension */
  fontFamily?: string;
  axisWidth?: number;
  axisHeight?: number;
  marginTop: number;    // fraction 0–1
  marginBottom: number; // fraction 0–1
  rightBars: number;
}

export function deriveChartConfigLayout(vs: VisualSettings): DerivedLayout {
  return {
    fontSize:     vs.canvas.scales.fontSize,
    marginTop:    vs.canvas.margins.top    / 100,  // VS stores 0–100, layout uses 0–1
    marginBottom: vs.canvas.margins.bottom / 100,
    rightBars:    vs.canvas.margins.rightBars,
  };
}

// ==================== Type Guard for Migration ====================
export function isVisualSettings(obj: unknown): obj is VisualSettings {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as any;
  return o.__v === 2 && typeof o.themeId === 'string' && typeof o.symbol === 'object';
}
