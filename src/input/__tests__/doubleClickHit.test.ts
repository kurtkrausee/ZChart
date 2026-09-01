// input/__tests__/doubleClickHit.test.ts
// Version: 1.0.0 | Updated: 2026-09-01 | By: Agent
// ZG-C1: Dblclick-Hit-Hook + amendTool + interaction-Options-Merge.
import { describe, it, expect, vi } from 'vitest';
import { registerTool, amendTool, getToolConfig, dispatchDoubleClickHit } from '../tools';
import { mergeOptions, defaultOptions } from '../../core/ChartOptions';
import type { DrawableShape } from '../../types/DrawableShape';
import type { InputManager, LogicalCoordinates } from '../InputManager';

const logical = { index: 5, price: 100, paneId: 'main' } as LogicalCoordinates;
const im = {} as InputManager;

describe('ZG-C1 — Dblclick-Hit-Hook & Options', () => {
    it('dispatchDoubleClickHit ruft den Hook des Tools zum shapeType auf', () => {
        const hook = vi.fn(() => true);
        registerTool({ mode: 'draw_zg_test', steps: 2, nodeClass: class {}, onStep0Custom: () => true });
        amendTool('draw_zg_test', { onDoubleClickHit: hook });
        const shape = { shapeType: 'zg_test', id: 'a1' } as unknown as DrawableShape;
        expect(dispatchDoubleClickHit(shape, logical, im)).toBe(true);
        expect(hook).toHaveBeenCalledWith(shape, logical, im);
    });

    it('ohne Hook oder unbekannter Typ → false', () => {
        expect(dispatchDoubleClickHit({ shapeType: 'unbekannt' } as never, logical, im)).toBe(false);
    });

    it('amendTool auf unbekannten Mode → false, bekannter Mode wird gepatcht', () => {
        expect(amendTool('draw_gibt_es_nicht', {})).toBe(false);
        expect(amendTool('draw_zg_test', { eventType: 'zg2' })).toBe(true);
        expect(getToolConfig('draw_zg_test')?.eventType).toBe('zg2');
    });

    it('interaction-Defaults (deleteKey/escDeselect an) überleben mergeOptions', () => {
        const merged = mergeOptions(defaultOptions, { colors: {} });
        expect(merged.interaction.deleteKey).toBe(true);
        expect(merged.interaction.escDeselect).toBe(true);
        const off = mergeOptions(defaultOptions, { interaction: { deleteKey: false } });
        expect(off.interaction.deleteKey).toBe(false);
        expect(off.interaction.escDeselect).toBe(true);
    });
});
