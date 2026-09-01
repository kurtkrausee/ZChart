// data/upsertCandle.test.ts
// Version: 1.0.0 | Updated: 2026-09-01 | By: Agent
// ZG-C1: Live-Tick-Pfad — update/append/ignore-Semantik.
import { describe, it, expect } from 'vitest';
import { DataStore, type CandleData } from '../index';

function c(ts: number, close = 100): CandleData {
    return { timestamp: ts, open: close - 1, high: close + 1, low: close - 2, close, volume: 10 };
}

describe('DataStore.upsertCandle (ZG-C1)', () => {
    it('leerer Store: erste Kerze wird angehängt', () => {
        const ds = new DataStore();
        expect(ds.upsertCandle(c(1000))).toBe('appended');
        expect(ds.getTotalCount()).toBe(1);
    });

    it('gleicher Timestamp wie letzte Kerze → update in place', () => {
        const ds = new DataStore();
        ds.setData([c(1000, 100), c(2000, 101)]);
        expect(ds.upsertCandle(c(2000, 105))).toBe('updated');
        expect(ds.getTotalCount()).toBe(2);
        expect(ds.getAllData()[1].close).toBe(105);
    });

    it('neuerer Timestamp → append', () => {
        const ds = new DataStore();
        ds.setData([c(1000), c(2000)]);
        expect(ds.upsertCandle(c(3000, 110))).toBe('appended');
        expect(ds.getTotalCount()).toBe(3);
        expect(ds.getAllData()[2].close).toBe(110);
    });

    it('älterer bekannter Timestamp → update; unbekannter älterer → ignored', () => {
        const ds = new DataStore();
        ds.setData([c(1000, 100), c(2000, 101), c(3000, 102)]);
        expect(ds.upsertCandle(c(1000, 99))).toBe('updated');
        expect(ds.getAllData()[0].close).toBe(99);
        expect(ds.upsertCandle(c(1500))).toBe('ignored');
        expect(ds.getTotalCount()).toBe(3);
    });
});
