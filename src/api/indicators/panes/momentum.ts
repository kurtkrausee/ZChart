// src/api/indicators/panes/momentum.ts
// Version: 2.1.0 | Updated: 2026-08-11 | By: Agent
// 2.1.0 (ZV10-P2): stochastic deklariert fixedRange -5..105 + Ticks 0/20/50/80/100
// P3-Pilot + P4-Batch (ZChartAPI-Refactor): Momentum-Pane-Defs.
// Verhalten 1:1 aus den alten add*Pane-Methoden der Fassade übernommen.
import { StochasticNode } from '../../../nodes/indicators/momentum/StochasticNode';
import { MACDNode } from '../../../nodes/indicators/momentum/MACDNode';
import { registerPaneIndicator, withZ, levelLine, num, str } from '../paneRegistry';

// ── P3 Pilot ────────────────────────────────────────────────────────────────

registerPaneIndicator('stochastic', {
    calculate: (ds, p) =>
        ds.calculateStochastic(num(p, 'kPeriod', 14), num(p, 'smoothK', 3), num(p, 'dPeriod', 3)),
    // ZV10-P2: deklarative Range/Ticks statt paneId-Switch in der AutoScaleEngine
    fixedRange: { min: -5, max: 105 },
    ticks: [0, 20, 50, 80, 100],
    buildNodes: ds => [
        levelLine(80, '#ff444466', 1),
        levelLine(20, '#44ff4466', 1),
        withZ(new StochasticNode(ds), 5),
    ],
});

registerPaneIndicator('macd', {
    buildNodes: (ds, p) => [
        levelLine(0, '#94a3b866'),
        withZ(new MACDNode(ds, num(p, 'fast', 12), num(p, 'slow', 26), num(p, 'signal', 9)), 5),
    ],
});

// ── P4 Batch ─────────────────────────────────────────────────────────────────

