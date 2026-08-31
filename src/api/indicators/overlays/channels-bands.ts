// src/zchart/api/indicators/overlays/channels-bands.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P8-Pilot (ZChartAPI-Refactor): Bänder/Trend-Overlays mit eigenen Composite-Nodes —
// bbands (Node-calculate + Regex-Cleanup), ichimoku (ds-calculate, kein Cleanup),
// supertrend (ds-calculate + statische Cleanup-Keys). Verhalten 1:1 aus dem alten Switch.
import { BollingerBandsNode } from '../../../nodes/indicators/volatility/BollingerBandsNode';
import { registerOverlayIndicator } from '../overlayRegistry';
import { withZ } from '../paneRegistry';

registerOverlayIndicator('bbands', {
    // Kein ds-calculate — BollingerBandsNode rechnet selbst (node.calculate()).
    buildNodes: ({ ds, p, color }) => {
        const node = new BollingerBandsNode(ds, p.period, p.stdDev, color);
        node.calculate();
        return [withZ(node, 6)];
    },
    // BB legt periodenabhängige Keys an (bb20_upper, …) → dynamisch aus erster Candle lesen.
    cleanupSeriesKeys: ds => {
        const sample = ds.getAllData()[0] as Record<string, unknown> | undefined;
        return Object.keys(sample ?? {}).filter(key => /^bb\d+_(upper|middle|lower)$/.test(key));
    },
});

