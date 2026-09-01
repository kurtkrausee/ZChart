// src/api/indicators/panes/volatility.ts
// Version: 2.0.0 | Updated: 2026-06-10 | By: Agent
// P3-Pilot + P6-Batch (ZChartAPI-Refactor): Volatility-Pane-Defs.
import { ATRNode } from '../../../nodes/indicators/volatility/ATRNode';
import { registerPaneIndicator, withZ, levelLine, num, str } from '../paneRegistry';

// ── P3 Pilot ────────────────────────────────────────────────────────────────

registerPaneIndicator('atr', {
    calculate: (ds, p) => ds.calculateATR(num(p, 'period', 14)),
    buildNodes: (ds, p, style) => [
        withZ(
            new ATRNode(
                ds,
                num(p, 'period', 14),
                style.color ?? '#e91e63',
                style.lineWidth ?? 2,
                style.lineDash ?? [],
            ),
            5,
        ),
    ],
});

// ── P6 Batch ─────────────────────────────────────────────────────────────────

