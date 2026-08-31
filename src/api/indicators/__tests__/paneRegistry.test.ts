// src/zchart/api/indicators/__tests__/paneRegistry.test.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P3 (ZChartAPI-Refactor): Registry-Vollständigkeit + Controller-Verhalten.
import { describe, it, expect, vi } from 'vitest';
import {
    getPaneIndicator,
    listPaneIndicatorIds,
    PaneIndicatorController,
    withZ,
    levelLine,
    num,
} from '../paneRegistry';
import '../panes';
import type { ChartManager } from '../../../core/ChartManager';
import type { Pane } from '../../../core/Pane';

// Pilot-Indikatoren aus P3 — bei jedem Batch (P4–P6) erweitern.
const EXPECTED_IDS = ['stochastic', 'macd', 'atr'];

function mockManager(existingPanes: Array<{ id: string; heightWeight: number }> = []) {
    const added: Pane[] = [];
    const manager = {
        getPanes: () => existingPanes,
        removePane: vi.fn(),
        addPane: vi.fn((p: Pane) => added.push(p)),
        togglePaneVisibility: vi.fn(),
        dataStore: {
            calculateStochastic: vi.fn(),
            calculateCCI: vi.fn(),
            calculateATR: vi.fn(),
            calculateADX: vi.fn(),
        },
    };
    return { manager: manager as unknown as ChartManager, raw: manager, added };
}

describe('paneRegistry — Vollständigkeit', () => {
    it('registriert alle Pilot-Indikatoren', () => {
        for (const id of EXPECTED_IDS) {
            expect(getPaneIndicator(id), `def '${id}' fehlt`).toBeDefined();
        }
    });

    it('hat keine Dubletten in den IDs', () => {
        const ids = listPaneIndicatorIds();
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('jede Def liefert buildNodes mit gesetztem Haupt-zIndex 5', () => {
        const ds = mockManager().raw.dataStore as never;
        for (const id of EXPECTED_IDS) {
            const def = getPaneIndicator(id)!;
            const nodes = def.buildNodes(ds, {}, {});
            expect(nodes.length, `'${id}' ohne Nodes`).toBeGreaterThan(0);
            // Letzte Node ist per Konvention die Indikator-Node (zIndex 5)
            expect(nodes[nodes.length - 1].zIndex, `'${id}' Haupt-Node ohne zIndex 5`).toBe(5);
        }
    });
});

describe('PaneIndicatorController — Verhaltens-Kontrakt', () => {
    it('add: calculate → Pane(weight 0.2) → Nodes → addPane', () => {
        const { manager, raw, added } = mockManager();
        new PaneIndicatorController(manager).add('atr', { period: 21 }, { color: '#fff' });
        expect(raw.dataStore.calculateATR).toHaveBeenCalledWith(21);
        expect(raw.addPane).toHaveBeenCalledTimes(1);
        expect(added[0].id).toBe('atr');
        expect(added[0].heightWeight).toBe(0.2);
        expect(raw.removePane).not.toHaveBeenCalled();
    });

    it('add: existierende Pane (auch unsichtbar) wird vorher entfernt', () => {
        const { manager, raw } = mockManager([{ id: 'atr', heightWeight: 0 }]);
        new PaneIndicatorController(manager).add('atr');
        expect(raw.removePane).toHaveBeenCalledWith('atr');
        expect(raw.addPane).toHaveBeenCalledTimes(1);
    });

    it('add: unbekannte ID → no-op (kein throw, kein addPane)', () => {
        const { manager, raw } = mockManager();
        expect(() => new PaneIndicatorController(manager).add('does_not_exist')).not.toThrow();
        expect(raw.addPane).not.toHaveBeenCalled();
    });

    it('remove: togglet nur sichtbare Panes', () => {
        const { manager, raw } = mockManager([{ id: 'cci', heightWeight: 0.2 }]);
        const ctrl = new PaneIndicatorController(manager);
        ctrl.remove('cci');
        expect(raw.togglePaneVisibility).toHaveBeenCalledWith('cci');
        ctrl.remove('atr'); // nicht vorhanden
        expect(raw.togglePaneVisibility).toHaveBeenCalledTimes(1);
    });

    it('remove: unsichtbare Pane (heightWeight 0) wird nicht erneut getoggelt', () => {
        const { manager, raw } = mockManager([{ id: 'cci', heightWeight: 0 }]);
        new PaneIndicatorController(manager).remove('cci');
        expect(raw.togglePaneVisibility).not.toHaveBeenCalled();
    });
});

describe('Def-Helpers', () => {
    it('withZ setzt zIndex, levelLine default 0, num fällt typsicher zurück', () => {
        expect(levelLine(80, '#fff').zIndex).toBe(0);
        expect(levelLine(80, '#fff', 1).zIndex).toBe(1);
        expect(withZ(levelLine(0, '#fff'), 7).zIndex).toBe(7);
        expect(num({ period: 21 }, 'period', 14)).toBe(21);
        expect(num({}, 'period', 14)).toBe(14);
        expect(num({ period: 'x' }, 'period', 14)).toBe(14);
    });
});
