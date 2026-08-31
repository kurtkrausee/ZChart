// src/zchart/api/indicators/overlays/moving-averages.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P8-Pilot (ZChartAPI-Refactor): einfache MA-Overlays — nur calculate,
// Node ist der Controller-Default (LineSeriesNode auf dataKey, zIndex 8).
import { registerOverlayIndicator } from '../overlayRegistry';

registerOverlayIndicator('sma20', { calculate: ({ ds }) => ds.calculateSMA(20, 'sma20') });
registerOverlayIndicator('sma50', { calculate: ({ ds }) => ds.calculateSMA(50, 'sma50') });
registerOverlayIndicator('ema20', { calculate: ({ ds }) => ds.calculateEMA(20, 'ema20') });
registerOverlayIndicator('ema50', { calculate: ({ ds }) => ds.calculateEMA(50, 'ema50') });
