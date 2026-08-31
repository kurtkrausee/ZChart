// src/zchart/api/indicators/__tests__/overlayRegistry.test.ts
// Version: 1.1.0 | Updated: 2026-08-02 | By: Agent
// 1.1.0: Re-Calc-Kontrakt (dataReplaced-Subscription, recalculateAll mit/ohne attach).
// P8 (ZChartAPI-Refactor): Overlay-Registry — Vollständigkeit, Verhaltens-Kontrakt, Param-Defaults.
import { describe, it, expect, vi } from 'vitest';
import {
    getOverlayIndicator,
    hasOverlayIndicator,
    listOverlayIndicatorIds,
    parseOverlayParams,
    OverlayIndicatorController,
} from '../overlayRegistry';
import '../overlays';
import type { ChartManager } from '../../../core/ChartManager';
import type { SceneNode } from '../../../nodes/core/SceneNode';

// Pilot-Overlays aus P8 — bei P9-Migration erweitern.
const EXPECTED_IDS = ['sma20', 'sma50', 'ema20', 'ema50', 'bbands'];

function mockManager(existingRoles: string[] = []) {
    const mainNodes: SceneNode[] = existingRoles.map(role => ({ role } as SceneNode));
    const mainPane = {
        id: 'main',
        nodes: mainNodes,
        addNode: vi.fn((n: SceneNode) => mainNodes.push(n)),
        removeNodeByRole: vi.fn(() => false),
    };
    const manager = {
        getPanes: () => [mainPane],
        on: vi.fn(),
        addToMainLayerOrder: vi.fn(),
        removeFromMainLayerOrder: vi.fn(),
        dataStore: {
            calculateSMA: vi.fn(),
            calculateEMA: vi.fn(),
            calculateIchimoku: vi.fn(),
            calculateSupertrend: vi.fn(),
            removeSeriesKey: vi.fn(),
            getAllData: vi.fn(() => [{ bb20_upper: 1, bb20_middle: 1, bb20_lower: 1, close: 1 }]),
        },
    };
    return { manager: manager as unknown as ChartManager, raw: manager, mainPane };
}

describe('overlayRegistry — Vollständigkeit', () => {
    it('registriert alle Pilot-Overlays', () => {
        for (const id of EXPECTED_IDS) {
            expect(hasOverlayIndicator(id), `def '${id}' fehlt`).toBe(true);
            expect(getOverlayIndicator(id)).toBeDefined();
        }
    });

    it('hat keine Dubletten in den IDs', () => {
        const ids = listOverlayIndicatorIds();
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('parseOverlayParams — id-abhängige Defaults (Alt-Verhalten)', () => {
    it('multiplier: keltner_channels 2, sonst 1.5; hammer maxBodyRatio 0.3, sonst 0.1', () => {
        expect(parseOverlayParams('keltner_channels', undefined).multiplier).toBe(2);
        expect(parseOverlayParams('supertrend', undefined).multiplier).toBe(1.5);
        expect(parseOverlayParams('hammer', undefined).maxBodyRatio).toBe(0.3);
        expect(parseOverlayParams('doji', undefined).maxBodyRatio).toBe(0.1);
        expect(parseOverlayParams('x', { multiplier: 3 }).multiplier).toBe(3);
    });

    it('snake_case-Fallbacks (atr_period, k_atr) greifen', () => {
        expect(parseOverlayParams('x', { atr_period: 21 }).atrPeriod).toBe(21);
        expect(parseOverlayParams('x', { atrPeriod: 10, atr_period: 21 }).atrPeriod).toBe(10);
        expect(parseOverlayParams('x', { k_atr: 2.5 }).kAtr).toBe(2.5);
    });
});

describe('OverlayIndicatorController — Verhaltens-Kontrakt', () => {

    it('add: Duplikat-Check verhindert Doppel-Rechnen (role existiert bereits)', () => {
        const { manager, raw, mainPane } = mockManager(['indicator-sma20']);
        new OverlayIndicatorController(manager).add('sma20', 'sma20', '#fff');
        expect(raw.dataStore.calculateSMA).not.toHaveBeenCalled();
        expect(mainPane.addNode).not.toHaveBeenCalled();
    });

    it('add: unbekannte id → Default-LineSeriesNode auf dataKey, zIndex 8 (Alt-Fallback)', () => {
        const { manager, mainPane } = mockManager();
        new OverlayIndicatorController(manager).add('unknown_overlay', 'my_key', '#fff');
        expect(mainPane.addNode).toHaveBeenCalledTimes(1);
        const node = (mainPane.addNode as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(node.role).toBe('indicator-unknown_overlay');
        expect(node.zIndex).toBe(8);
    });

    it('add: sma20 nutzt calculate + Default-Node', () => {
        const { manager, raw, mainPane } = mockManager();
        new OverlayIndicatorController(manager).add('sma20', 'sma20', '#3b82f6');
        expect(raw.dataStore.calculateSMA).toHaveBeenCalledWith(20, 'sma20');
        const node = (mainPane.addNode as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(node.zIndex).toBe(8);
    });


    it('remove: dynamische cleanupSeriesKeys per Regex (bbands)', () => {
        const { manager, raw } = mockManager();
        new OverlayIndicatorController(manager).remove('bbands');
        expect(raw.dataStore.removeSeriesKey).toHaveBeenCalledWith('bb20_upper');
        expect(raw.dataStore.removeSeriesKey).toHaveBeenCalledWith('bb20_middle');
        expect(raw.dataStore.removeSeriesKey).toHaveBeenCalledWith('bb20_lower');
        expect(raw.dataStore.removeSeriesKey).not.toHaveBeenCalledWith('close');
    });

    it('remove: id ohne cleanupSeriesKeys räumt nur Nodes/LayerOrder (ichimoku)', () => {
        const { manager, raw } = mockManager();
        new OverlayIndicatorController(manager).remove('ichimoku');
        expect(raw.removeFromMainLayerOrder).toHaveBeenCalledWith('indicator-ichimoku');
        expect(raw.dataStore.removeSeriesKey).not.toHaveBeenCalled();
    });
});

describe('OverlayIndicatorController — Re-Calc nach Daten-Replace (1.2.0)', () => {
    it('Konstruktor abonniert dataReplaced am Manager', () => {
        const { manager, raw } = mockManager();
        new OverlayIndicatorController(manager);
        expect(raw.on).toHaveBeenCalledWith('dataReplaced', expect.any(Function));
    });

    it('recalculateAll: rechnet attachte Overlays mit Original-Params neu', () => {
        const { manager, raw } = mockManager();
        const ctrl = new OverlayIndicatorController(manager);
        ctrl.add('sma20', 'sma20', '#22c55e', 2);
        (raw.dataStore.calculateSMA as ReturnType<typeof vi.fn>).mockClear();
        ctrl.recalculateAll();
        expect(raw.dataStore.calculateSMA).toHaveBeenCalledWith(20, 'sma20');
    });

    it('recalculateAll: nach remove wird nicht mehr gerechnet', () => {
        const { manager, raw } = mockManager();
        const ctrl = new OverlayIndicatorController(manager);
        ctrl.add('sma20', 'sma20', '#22c55e');
        ctrl.remove('sma20');
        (raw.dataStore.calculateSMA as ReturnType<typeof vi.fn>).mockClear();
        ctrl.recalculateAll();
        expect(raw.dataStore.calculateSMA).not.toHaveBeenCalled();
    });
});
